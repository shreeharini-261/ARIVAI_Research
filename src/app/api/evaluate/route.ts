import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            generationId,
            evaluatorId,
            relevanceScore,
            specificityScore,
            biologicalGroundingScore,
            personalizationScore,
            safetyScore
        } = body;

        const evaluation = await prisma.evaluation.create({
            data: {
                generation_id: generationId,
                evaluator_id: evaluatorId || "anonymous",
                relevance_score: relevanceScore,
                specificity_score: specificityScore,
                biological_grounding_score: biologicalGroundingScore,
                personalization_score: personalizationScore,
                safety_score: safetyScore,
            }
        });

        return NextResponse.json({ success: true, evaluation });
    } catch (error: any) {
        console.error("Evaluate error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const evaluations = await prisma.evaluation.findMany({
            include: {
                generation: true
            },
            orderBy: { timestamp: "desc" }
        });
        return NextResponse.json({ evaluations });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
