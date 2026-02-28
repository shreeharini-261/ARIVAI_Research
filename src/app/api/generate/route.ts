import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeStateVector, ScenarioInput } from "@/lib/vectorCalc";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { scenarioInput, config, strategy, generateAllStrategies } = body;

        // 1. Compute state vector
        const vector = computeStateVector(scenarioInput);

        // Prepare Database Database Transaction
        const scenario = await prisma.scenario.create({
            data: {
                phase: scenarioInput.phase,
                mood: scenarioInput.mood,
                energy: scenarioInput.energy,
                sleep: scenarioInput.sleep,
                stress: scenarioInput.stress,
                symptoms_json: scenarioInput.symptoms,
                cycle_day: scenarioInput.cycleDay || null,
                cycle_length: scenarioInput.cycleLength || 28,
                previous_sleep_avg: scenarioInput.previousSleepAvg || null,
                previous_stress_avg: scenarioInput.previousStressAvg || null,
                state_vector: {
                    create: {
                        estrogen_influence: vector.estrogenInfluence,
                        progesterone_influence: vector.progesteroneInfluence,
                        energy_stability: vector.energyStability,
                        emotional_volatility: vector.emotionalVolatility,
                        inflammation_likelihood: vector.inflammationLikelihood,
                        formula_version: "v1"
                    }
                },
            }
        });

        const strategiesToRun = generateAllStrategies
            ? ["Generic", "Phase-Aware", "Phase + Memory-Aware", "Phase + State Vector"]
            : [strategy];

        const apiKey = process.env.GEMINI_API_KEY;
        const modelName = config.modelName || "gemini-2.5-flash";
        const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`;

        const symptomsList = Object.entries(scenarioInput.symptoms)
            .filter(([_, val]) => (val as number) > 0)
            .map(([key, val]) => `${key}(${val})`)
            .join(", ");

        const results: any[] = [];
        let baselineId: string | null = null;

        for (const currentStrategy of strategiesToRun) {
            let prompt = "";
            if (currentStrategy === "Generic") {
                prompt = `System: You are a general wellness assistant.
User: User reports:
Mood: ${scenarioInput.mood}
Energy: ${scenarioInput.energy}/10
Sleep: ${scenarioInput.sleep}/10
Symptoms: ${symptomsList}
Provide helpful advice.`;
            } else if (currentStrategy === "Phase-Aware") {
                prompt = `System: You are a menstrual health–aware AI assistant. Ground recommendations in hormonal physiology.
User: Menstrual Phase: ${scenarioInput.phase}
Mood: ${scenarioInput.mood}
Energy: ${scenarioInput.energy}/10
Sleep: ${scenarioInput.sleep}/10
Symptoms: ${symptomsList}
Explain biological context briefly and give structured recommendations.`;
            } else if (currentStrategy === "Phase + Memory-Aware") {
                prompt = `System: You are a menstrual health AI that considers historical patterns and hormonal cycles.
User: Menstrual Phase: ${scenarioInput.phase}
Current State:
Mood: ${scenarioInput.mood}
Energy: ${scenarioInput.energy}/10
Sleep: ${scenarioInput.sleep}/10
Symptoms: ${symptomsList}
Historical Pattern: Context indicates recurrent symptoms in this phase previously.
Provide biologically grounded and context-adaptive recommendations.`;
            } else if (currentStrategy === "Phase + State Vector") {
                prompt = `System: You are an advanced menstrual health AI system. Use the provided biological state profile quantitatively. Recommendations must align with the physiological indicators.
User: Menstrual Phase: ${scenarioInput.phase}
Biological State Profile:
Estrogen Influence: ${vector.estrogenInfluence.toFixed(3)}
Progesterone Influence: ${vector.progesteroneInfluence.toFixed(3)}
Energy Stability: ${vector.energyStability.toFixed(3)}
Emotional Volatility: ${vector.emotionalVolatility.toFixed(3)}
Inflammation Likelihood: ${vector.inflammationLikelihood.toFixed(3)}

Provide:
1. Brief physiological interpretation (2–3 sentences).
2. Adaptive recommendations explicitly aligned with the state indicators.
3. Avoid generic advice.`;
            }

            // Call Gemini via REST API
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: config.temperature ?? 0.4,
                        topP: config.topP ?? 0.9,
                        maxOutputTokens: config.maxTokens ? parseInt(config.maxTokens) : undefined,
                        presencePenalty: undefined, // Add if needed
                    }
                })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(`Gemini API Error for strategy ${currentStrategy}: ${errorData.error?.message || res.statusText}`);
            }

            const data = await res.json();
            const outputText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            const wordCount = outputText.split(/\s+/).length;

            // Generate mock metrics for the output analysis (or you'd calculate these for real)
            const sentimentScore = parseFloat((Math.random() * (1 - -1) + -1).toFixed(2));
            const alignmentScore = parseFloat((Math.random() * (1 - 0.5) + 0.5).toFixed(2));
            const semanticDistance: number = baselineId ? parseFloat((Math.random() * (0.8 - 0.1) + 0.1).toFixed(2)) : 0;

            const generation: any = await prisma.generation.create({
                data: {
                    scenario_id: scenario.id,
                    strategy_type: currentStrategy,
                    model_name: modelName,
                    temperature: config.temperature ?? 0.4,
                    top_p: config.topP ?? 0.9,
                    max_tokens: config.maxTokens ? parseInt(config.maxTokens) : null,
                    seed: config.seed ? parseInt(config.seed) : null,
                    prompt_text: prompt,
                    output_text: outputText,
                    word_count: wordCount,
                    metrics: {
                        create: {
                            semantic_distance: currentStrategy === "Generic" ? null : semanticDistance,
                            alignment_score: alignmentScore,
                            violation_flag: false,
                            sentiment_score: sentimentScore,
                            baseline_generation_id: currentStrategy === "Generic" ? null : baselineId
                        }
                    }
                },
                include: { metrics: true }
            });

            if (currentStrategy === "Generic") {
                baselineId = generation.id;
            }

            results.push({
                generationId: generation.id,
                strategy: currentStrategy,
                prompt,
                output: outputText,
                wordCount,
                metrics: generation.metrics
            });
        }

        return NextResponse.json({
            scenarioId: scenario.id,
            vector,
            results, // Array of results instead of single
            // For backward compatibility on the frontend if not "generate all":
            ...(results.length === 1 ? {
                generationId: results[0].generationId,
                prompt: results[0].prompt,
                output: results[0].output,
                wordCount: results[0].wordCount,
                metrics: results[0].metrics
            } : {})
        });
    } catch (error: any) {
        console.error("Generate error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
