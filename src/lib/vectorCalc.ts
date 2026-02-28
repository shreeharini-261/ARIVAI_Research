export interface ScenarioInput {
    phase: 'Menstrual' | 'Follicular' | 'Ovulatory' | 'Luteal';
    mood: 'Calm' | 'Neutral' | 'Irritable' | 'Severe mood swings';
    energy: number; // 1-10
    sleep: number; // 1-10
    stress: number; // 1-10
    symptoms: {
        // Inflammatory / Pain
        cramps: number;
        back_pain: number;
        headache: number;
        joint_pain: number;
        breast_tenderness: number;

        // Gastrointestinal
        nausea: number;
        vomiting: number;
        bloating: number;
        diarrhea: number;
        constipation: number;

        // Fatigue / Cognitive
        fatigue: number;
        dizziness: number;
        brain_fog: number;

        // Emotional
        mood_swings: number;
        anxiety: number;
        irritability: number;
        low_motivation: number;
        [key: string]: number; // keep open for any missing generic symptoms
    };
    symptom_severity?: number; // 0-3
    memory_text?: string;
}

export interface StateVector {
    estrogenInfluence: number;
    progesteroneInfluence: number;
    energyStability: number;
    emotionalVolatility: number;
    inflammationLikelihood: number;
}

export interface VectorCalculationResult {
    vector: StateVector;
}

function clamp(value: number): number {
    return Math.max(0, Math.min(1, value));
}

export function computeStateVector(input: ScenarioInput): VectorCalculationResult {
    const E = input.energy / 10;
    const S = input.sleep / 10;
    const St = input.stress / 10;

    let inflammation = 0;
    if (input.symptoms) {
        inflammation =
            (input.symptoms.cramps || 0) * 0.3 +
            (input.symptoms.back_pain || 0) * 0.2 +
            (input.symptoms.headache || 0) * 0.2 +
            (input.symptoms.bloating || 0) * 0.1 +
            (input.symptoms.joint_pain || 0) * 0.1 +
            (input.symptoms.breast_tenderness || 0) * 0.1;
    }

    let moodScore = 0.4;
    switch (input.mood) {
        case 'Calm': moodScore = 0.2; break;
        case 'Neutral': moodScore = 0.4; break;
        case 'Irritable': moodScore = 0.7; break;
        case 'Severe mood swings': moodScore = 0.9; break;
    }

    let energyStability = 0.6 * E + 0.4 * S - 0.3 * St;
    let emotionalVolatility = moodScore + (1 - S) * 0.3;

    // Hormones
    let estrogen = 0;
    let progesterone = 0;

    switch (input.phase) {
        case 'Menstrual':
            estrogen = 0.2;
            progesterone = 0.2;
            break;
        case 'Follicular':
            estrogen = 0.6;
            progesterone = 0.3;
            break;
        case 'Ovulatory':
            estrogen = 0.9;
            progesterone = 0.2;
            break;
        case 'Luteal':
            estrogen = 0.5;
            progesterone = 0.8;
            break;
    }

    return {
        vector: {
            estrogenInfluence: clamp(estrogen),
            progesteroneInfluence: clamp(progesterone),
            energyStability: clamp(energyStability),
            emotionalVolatility: clamp(emotionalVolatility),
            inflammationLikelihood: clamp(inflammation),
        }
    };
}
