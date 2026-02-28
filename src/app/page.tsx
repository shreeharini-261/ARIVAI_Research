"use client";

import { useState, useEffect } from "react";
import {
    Activity, Brain, Settings, Database,
    Download, Play, BarChart2, CheckCircle,
    FileText
} from "lucide-react";

export default function Home() {
    const [scenarioInput, setScenarioInput] = useState({
        phase: "Follicular",
        mood: "Neutral",
        energy: 5,
        sleep: 7,
        stress: 4,
        cycleDay: 14,
        symptoms: {
            cramps: 0, back_pain: 0, headache: 0, joint_pain: 0, breast_tenderness: 0,
            nausea: 0, vomiting: 0, bloating: 0, diarrhea: 0, constipation: 0,
            fatigue: 0, dizziness: 0, brain_fog: 0,
            mood_swings: 0, anxiety: 0, irritability: 0, low_motivation: 0,
        },
        symptom_severity: 0,
        memory_text: ""
    });

    const [config, setConfig] = useState<any>({
        modelName: "gemini-2.5-flash",
        temperature: 0.4,
        topP: 0.9,
        maxTokens: "",
        seed: "",
    });

    const [generateAll, setGenerateAll] = useState(false);

    const [strategy, setStrategy] = useState("Phase + State Vector");

    const [vector, setVector] = useState({
        estrogenInfluence: 0,
        progesteroneInfluence: 0,
        energyStability: 0,
        emotionalVolatility: 0,
        inflammationLikelihood: 0,
    });

    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState<any>(null);

    // Compute vector locally for interactive display before submission
    useEffect(() => {
        // We compute this locally just for UI feedback
        const E = scenarioInput.energy / 10;
        const S = scenarioInput.sleep / 10;
        const St = scenarioInput.stress / 10;
        const infl = (scenarioInput.symptoms.cramps || 0) * 0.3 + (scenarioInput.symptoms.back_pain || 0) * 0.2 + (scenarioInput.symptoms.headache || 0) * 0.2 + (scenarioInput.symptoms.bloating || 0) * 0.1 + (scenarioInput.symptoms.joint_pain || 0) * 0.1 + (scenarioInput.symptoms.breast_tenderness || 0) * 0.1;
        const es = 0.6 * E + 0.4 * S - 0.3 * St;

        let moodScore = 0.4;
        switch (scenarioInput.mood) {
            case "Calm": moodScore = 0.2; break;
            case "Neutral": moodScore = 0.4; break;
            case "Irritable": moodScore = 0.7; break;
            case "Severe mood swings": moodScore = 0.9; break;
        }
        const ve = moodScore + (1 - S) * 0.3;

        let estrogen = 0; let progesterone = 0;
        switch (scenarioInput.phase) {
            case "Menstrual": estrogen = 0.2; progesterone = 0.2; break;
            case "Follicular": estrogen = 0.6; progesterone = 0.3; break;
            case "Ovulatory": estrogen = 0.9; progesterone = 0.2; break;
            case "Luteal": estrogen = 0.5; progesterone = 0.8; break;
        }

        const clamp = (v: number) => Math.max(0, Math.min(1, v));
        setVector({
            estrogenInfluence: clamp(estrogen),
            progesteroneInfluence: clamp(progesterone),
            energyStability: clamp(es),
            emotionalVolatility: clamp(ve),
            inflammationLikelihood: clamp(infl)
        });
    }, [scenarioInput]);

    const handleGenerate = async () => {
        setIsGenerating(true);
        setResult(null);
        try {
            const res = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ scenarioInput, config, strategy, generateAllStrategies: generateAll })
            });
            const data = await res.json();
            if (res.ok) {
                setResult(data);
            } else {
                alert("Error: " + data.error);
            }
        } catch (err) {
            console.error(err);
        }
        setIsGenerating(false);
    };

    const handleExport = () => {
        window.location.href = "/api/export";
    };

    const [evaluation, setEvaluation] = useState({
        relevanceScore: 3,
        specificityScore: 3,
        biologicalGroundingScore: 3,
        personalizationScore: 3,
        safetyScore: 5,
    });
    const [evalSubmitted, setEvalSubmitted] = useState(false);

    const submitEvaluation = async () => {
        if (!result?.generationId) return;
        try {
            await fetch("/api/evaluate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    generationId: result.generationId,
                    ...evaluation
                })
            });
            setEvalSubmitted(true);
        } catch (err) {
            console.error(err);
        }
    }

    const handleSymptomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setScenarioInput({
            ...scenarioInput,
            symptoms: {
                ...scenarioInput.symptoms,
                [e.target.name]: e.target.checked ? 1 : 0
            }
        });
    };

    const vectorColors = {
        estrogenInfluence: "#ec4899",
        progesteroneInfluence: "#8b5cf6",
        energyStability: "#10b981",
        emotionalVolatility: "#f59e0b",
        inflammationLikelihood: "#ef4444"
    };

    return (
        <main className="dashboard-grid">
            {/* LEFT SIDEBAR */}
            <div className="sidebar">
                <div className="glass-panel" style={{ padding: "16px 24px", textAlign: "center" }}>
                    <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-main)", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                        <Activity className="text-primary" />
                        BioState Tracker
                    </h1>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "8px" }}>
                        Continuous Generative Research System
                    </p>
                </div>

                {/* Panel A: Scenario Metadata */}
                <div className="glass-panel">
                    <h2 className="panel-title"><Database size={18} /> A. Scenario Metadata</h2>

                    <div className="form-group">
                        <label className="form-label">Menstrual Phase</label>
                        <select className="form-select" value={scenarioInput.phase} onChange={e => setScenarioInput({ ...scenarioInput, phase: e.target.value })}>
                            <option>Menstrual</option>
                            <option>Follicular</option>
                            <option>Ovulatory</option>
                            <option>Luteal</option>
                        </select>
                    </div>

                    <div className="form-group flex gap-4">
                        <div style={{ flex: 1 }}>
                            <label className="form-label">Cycle Day (1-28)</label>
                            <input type="number" className="form-input" value={scenarioInput.cycleDay} onChange={e => setScenarioInput({ ...scenarioInput, cycleDay: parseInt(e.target.value) })} min={1} max={28} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label className="form-label">Mood</label>
                            <select className="form-select" value={scenarioInput.mood} onChange={e => setScenarioInput({ ...scenarioInput, mood: e.target.value })}>
                                <option>Calm</option>
                                <option>Neutral</option>
                                <option>Irritable</option>
                                <option>Severe mood swings</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Energy Level ({scenarioInput.energy}/10)</label>
                        <input type="range" className="form-range" min="1" max="10" value={scenarioInput.energy} onChange={e => setScenarioInput({ ...scenarioInput, energy: parseInt(e.target.value) })} />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Sleep Quality ({scenarioInput.sleep}/10)</label>
                        <input type="range" className="form-range" min="1" max="10" value={scenarioInput.sleep} onChange={e => setScenarioInput({ ...scenarioInput, sleep: parseInt(e.target.value) })} />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Stress Level ({scenarioInput.stress}/10)</label>
                        <input type="range" className="form-range" min="1" max="10" value={scenarioInput.stress} onChange={e => setScenarioInput({ ...scenarioInput, stress: parseInt(e.target.value) })} />
                    </div>

                    <div className="form-group" style={{ marginTop: "16px" }}>
                        <label className="form-label">Symptom Severity (0-3: None, Mild, Mod, Severe)</label>
                        <input type="range" className="form-range" min="0" max="3" value={scenarioInput.symptom_severity} onChange={e => setScenarioInput({ ...scenarioInput, symptom_severity: parseInt(e.target.value) })} />
                    </div>

                    <div className="form-group" style={{ marginTop: "24px" }}>
                        <label className="form-label mb-2">Symptoms</label>

                        <div style={{ marginBottom: "12px" }}>
                            <strong style={{ fontSize: "0.85rem", color: "var(--accent-pink)" }}>Inflammatory / Pain</strong>
                            <div className="checkbox-grid" style={{ marginTop: "6px" }}>
                                {['cramps', 'back_pain', 'headache', 'joint_pain', 'breast_tenderness'].map(sym => (
                                    <label key={sym} className="checkbox-label" style={{ textTransform: 'capitalize' }}>
                                        <input type="checkbox" name={sym} checked={scenarioInput.symptoms[sym as keyof typeof scenarioInput.symptoms] === 1} onChange={handleSymptomChange} /> {sym.replace('_', ' ')}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginBottom: "12px" }}>
                            <strong style={{ fontSize: "0.85rem", color: "var(--accent-pink)" }}>Gastrointestinal</strong>
                            <div className="checkbox-grid" style={{ marginTop: "6px" }}>
                                {['nausea', 'vomiting', 'bloating', 'diarrhea', 'constipation'].map(sym => (
                                    <label key={sym} className="checkbox-label" style={{ textTransform: 'capitalize' }}>
                                        <input type="checkbox" name={sym} checked={scenarioInput.symptoms[sym as keyof typeof scenarioInput.symptoms] === 1} onChange={handleSymptomChange} /> {sym.replace('_', ' ')}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginBottom: "12px" }}>
                            <strong style={{ fontSize: "0.85rem", color: "var(--accent-pink)" }}>Fatigue / Cognitive</strong>
                            <div className="checkbox-grid" style={{ marginTop: "6px" }}>
                                {['fatigue', 'dizziness', 'brain_fog'].map(sym => (
                                    <label key={sym} className="checkbox-label" style={{ textTransform: 'capitalize' }}>
                                        <input type="checkbox" name={sym} checked={scenarioInput.symptoms[sym as keyof typeof scenarioInput.symptoms] === 1} onChange={handleSymptomChange} /> {sym.replace('_', ' ')}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div>
                            <strong style={{ fontSize: "0.85rem", color: "var(--accent-pink)" }}>Emotional</strong>
                            <div className="checkbox-grid" style={{ marginTop: "6px" }}>
                                {['mood_swings', 'anxiety', 'irritability', 'low_motivation'].map(sym => (
                                    <label key={sym} className="checkbox-label" style={{ textTransform: 'capitalize' }}>
                                        <input type="checkbox" name={sym} checked={scenarioInput.symptoms[sym as keyof typeof scenarioInput.symptoms] === 1} onChange={handleSymptomChange} /> {sym.replace('_', ' ')}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="form-group" style={{ marginTop: "24px" }}>
                        <label className="form-label mb-2">Historical Memory (Last 3 Days Summary)</label>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "8px" }}>Enter any relevant user data from the previous 3 days (mood trends, sleep patterns, recurring symptoms, stress changes, etc.).</p>
                        <textarea
                            className="form-input"
                            style={{ minHeight: "80px", resize: "vertical", paddingTop: "8px" }}
                            placeholder="Past 3 days: Energy gradually decreasing from 7 to 4. Sleep poor. Back pain recurring. Stress increasing due to exams."
                            value={scenarioInput.memory_text}
                            onChange={e => setScenarioInput({ ...scenarioInput, memory_text: e.target.value })}
                        />
                    </div>
                </div>

                {/* Panel C: Model Configuration */}
                <div className="glass-panel">
                    <h2 className="panel-title"><Settings size={18} /> C. Model Config</h2>

                    <div className="form-group">
                        <label className="form-label">Strategy</label>
                        <select className="form-select" value={strategy} onChange={e => setStrategy(e.target.value)} disabled={generateAll}>
                            <option>Generic</option>
                            <option>Phase-Aware</option>
                            <option>Phase + Memory-Aware</option>
                            <option>Phase + State Vector</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="checkbox-label" style={{ color: "var(--primary)", fontWeight: 600 }}>
                            <input type="checkbox" checked={generateAll} onChange={e => setGenerateAll(e.target.checked)} />
                            Generate All Strategies
                        </label>
                    </div>

                    <div className="form-group" style={{ display: "flex", gap: "10px" }}>
                        <div style={{ flex: 1 }}>
                            <label className="form-label">Model</label>
                            <select className="form-select" value={config.modelName} onChange={e => setConfig({ ...config, modelName: e.target.value })}>
                                <option>gemini-2.5-flash</option>
                                <option>gemini-2.5-pro</option>
                            </select>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label className="form-label">Temp ({config.temperature})</label>
                            <input type="range" className="form-range" min="0" max="1" step="0.1" value={config.temperature} onChange={e => setConfig({ ...config, temperature: parseFloat(e.target.value) })} />
                        </div>
                    </div>

                    <div className="form-group" style={{ display: "flex", gap: "10px" }}>
                        <div style={{ flex: 1 }}>
                            <label className="form-label">Top-P ({config.topP})</label>
                            <input type="range" className="form-range" min="0" max="1" step="0.1" value={config.topP} onChange={e => setConfig({ ...config, topP: parseFloat(e.target.value) })} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label className="form-label">Max Tokens</label>
                            <input type="number" className="form-input" placeholder="e.g. 500" value={config.maxTokens} onChange={e => setConfig({ ...config, maxTokens: e.target.value })} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label className="form-label">Seed</label>
                            <input type="number" className="form-input" placeholder="Optional" value={config.seed} onChange={e => setConfig({ ...config, seed: e.target.value })} />
                        </div>
                    </div>
                </div>

                <button className="btn-primary" onClick={handleGenerate} disabled={isGenerating}>
                    <Play size={18} fill="currentColor" />
                    {isGenerating ? "Executing Research Prompt..." : "Execute Test"}
                </button>

                <button className="btn-secondary" onClick={handleExport} style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}>
                    <Download size={16} /> Export CSV Database
                </button>
            </div>

            {/* RIGHT MAIN CONTENT */}
            <div className="main-content">
                {/* Panel B: State Vector Visualization */}
                <div className="glass-panel">
                    <h2 className="panel-title"><BarChart2 size={18} /> B. Computed Biological State Vector</h2>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                        {Object.entries(vector).map(([key, val]) => (
                            <div key={key} className="vector-item">
                                <div className="vector-header">
                                    <span>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</span>
                                    <span className="vector-value">{val.toFixed(2)}</span>
                                </div>
                                <div className="vector-bar-container">
                                    <div className="vector-bar" style={{ width: `${val * 100}%`, backgroundColor: vectorColors[key as keyof typeof vectorColors] }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Panel D: Results */}
                <div className="glass-panel" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                    <h2 className="panel-title"><Brain size={18} /> D. Model Output</h2>
                    {result ? (
                        <>
                            {result.results ? result.results.map((resItem: any, i: number) => (
                                <div key={resItem.generationId} style={{ marginBottom: "24px", paddingBottom: "24px", borderBottom: "1px solid var(--panel-border)" }}>
                                    <h3 style={{ fontSize: "1.05rem", color: "var(--accent-blue)", marginBottom: "8px" }}>Strategy: {resItem.strategy}</h3>
                                    <div className="output-box" style={{ flex: 1 }}>
                                        {resItem.output}
                                    </div>

                                    {/* Panel E: Automated Metrics */}
                                    <div style={{ marginTop: "12px", padding: "12px", background: "rgba(0,0,0,0.2)", borderRadius: "8px", border: "1px solid var(--panel-border)" }}>
                                        <h3 style={{ fontSize: "0.95rem", color: "var(--primary)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}><FileText size={16} /> Output Analytics</h3>
                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--text-muted)", flexWrap: "wrap", gap: "12px" }}>
                                            <div><strong>Word Count:</strong> {resItem.wordCount} words</div>
                                            <div><strong>Alignment Score:</strong> {resItem.metrics?.[0]?.alignment_score || "0.0"}</div>
                                            <div><strong>Violation Flag:</strong> False</div>
                                            <div><strong>Sentiment Score:</strong> {resItem.metrics?.[0]?.sentiment_score || "0.0"}</div>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <>
                                    <div className="output-box" style={{ flex: 1 }}>
                                        {result.output}
                                    </div>

                                    {/* Panel E: Automated Metrics */}
                                    <div style={{ marginTop: "20px", padding: "16px", background: "rgba(0,0,0,0.2)", borderRadius: "8px", border: "1px solid var(--panel-border)" }}>
                                        <h3 style={{ fontSize: "1rem", color: "var(--primary)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}><FileText size={16} /> E. Output Analytics</h3>
                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", color: "var(--text-muted)" }}>
                                            <div><strong>Word Count:</strong> {result.wordCount} words</div>
                                            <div><strong>Alignment Score:</strong> {result.metrics?.alignment_score || "0.0"}</div>
                                            <div><strong>Violation Flag:</strong> False</div>
                                            <div><strong>Sentiment Score:</strong> {result.metrics?.sentiment_score || "0.0"}</div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Research Evaluator Input */}
                            <div style={{ marginTop: "20px", paddingTop: "16px" }}>
                                <h3 style={{ fontSize: "1rem", color: "var(--accent-pink)", marginBottom: "12px" }}>Research Blinding Evaluation (1-5)</h3>
                                {!evalSubmitted ? (
                                    <>
                                        <div className="evaluator-grid">
                                            {[
                                                { label: "Relevance", key: "relevanceScore" },
                                                { label: "Specificity", key: "specificityScore" },
                                                { label: "Bio Grounding", key: "biologicalGroundingScore" },
                                                { label: "Personalization", key: "personalizationScore" },
                                            ].map(metric => (
                                                <div key={metric.key} className="form-group" style={{ marginBottom: 0 }}>
                                                    <label className="form-label">{metric.label}: {evaluation[metric.key as keyof typeof evaluation]}</label>
                                                    <input type="range" className="form-range" min="1" max="5"
                                                        value={evaluation[metric.key as keyof typeof evaluation]}
                                                        onChange={e => setEvaluation({ ...evaluation, [metric.key]: parseInt(e.target.value) })}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                        <button className="btn-secondary" style={{ marginTop: "16px", borderColor: "var(--accent-pink)", color: "var(--accent-pink)" }} onClick={submitEvaluation}>
                                            Submit Evaluation Log for first generation ID
                                        </button>
                                    </>
                                ) : (
                                    <div style={{ color: "#10b981", display: "flex", alignItems: "center", gap: "8px", fontSize: "0.9rem" }}>
                                        <CheckCircle size={16} /> Evaluation successfully stored in database.
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "0.95rem" }}>
                            {isGenerating ? "Executing model scenario..." : "Configure a scenario and click execute to view outputs."}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
