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
    cycleDay?: number;
}

export interface StateVector {
    estrogenInfluence: number;
    progesteroneInfluence: number;
    energyStability: number;
    emotionalVolatility: number;
    inflammationLikelihood: number;
    gastrointestinalDistress: number;
}

export interface VectorCalculationResult {
    vector: StateVector;
}

function clamp(value: number): number {
    return Math.max(0, Math.min(1, value));
}

export function computeStateVector(input: ScenarioInput): VectorCalculationResult {
    // 1. Normalize All Inputs
    const E_n = input.energy / 10;
    const S_n = input.sleep / 10;
    const Str_n = input.stress / 10;
    const Sev_n = (input.symptom_severity || 0) / 3;

    // 2. Hormone Influence Modeling
    const d = input.cycleDay || 14; // Default to mid-cycle if missing
    let E_estrogen = 0;
    let P_prog = 0;

    // Estrogen Piecewise
    if (d >= 1 && d <= 4) E_estrogen = 0.2;
    else if (d >= 5 && d <= 13) E_estrogen = 0.3 + 0.05 * (d - 5);
    else if (d >= 14 && d <= 16) E_estrogen = 0.9;
    else if (d >= 17 && d <= 24) E_estrogen = 0.7;
    else if (d >= 25 && d <= 28) E_estrogen = 0.4;
    else E_estrogen = 0.5; // fallback

    // Progesterone Piecewise
    if (d >= 1 && d <= 13) P_prog = 0.2;
    else if (d >= 14 && d <= 16) P_prog = 0.3;
    else if (d >= 17 && d <= 24) P_prog = 0.5 + 0.05 * (d - 17);
    else if (d >= 25 && d <= 28) P_prog = 0.6;
    else P_prog = 0.2; // fallback

    // 3. Energy Stability Vector
    const EnergyStability = 0.5 * E_n + 0.3 * S_n + 0.2 * (1 - Str_n);

    // 4. Emotional Volatility Vector
    let Mood_n = 0.4;
    switch (input.mood) {
        case 'Calm': Mood_n = 0.2; break; // Approximated calm
        case 'Neutral': Mood_n = 0.2; break;
        case 'Irritable': Mood_n = 0.6; break;
        case 'Severe mood swings': Mood_n = 1.0; break;
    }
    // Check specific symptoms for mood overrides if checked
    if (input.symptoms?.mood_swings) Mood_n = Math.max(Mood_n, 0.8);
    if (input.symptoms?.anxiety) Mood_n = Math.max(Mood_n, 0.7);
    if (input.symptoms?.low_motivation) Mood_n = Math.max(Mood_n, 0.5);

    const EmotionalVolatility = 0.5 * Str_n + 0.3 * Sev_n + 0.2 * Mood_n;

    // 5. Inflammation Likelihood Vector
    let inflamCountVal = 0;
    if (input.symptoms) {
        inflamCountVal += (input.symptoms.cramps || 0) ? 1 : 0;
        inflamCountVal += (input.symptoms.back_pain || 0) ? 1 : 0;
        inflamCountVal += (input.symptoms.joint_pain || 0) ? 1 : 0;
        inflamCountVal += (input.symptoms.headache || 0) ? 1 : 0;
        inflamCountVal += (input.symptoms.breast_tenderness || 0) ? 1 : 0;
    }
    const InflamCount = inflamCountVal / 5;
    const InflammationLikelihood = 0.5 * Sev_n + 0.3 * InflamCount + 0.2 * Str_n;

    // 6. Gastrointestinal Distress
    let giCountVal = 0;
    if (input.symptoms) {
        giCountVal += (input.symptoms.nausea || 0) ? 1 : 0;
        giCountVal += (input.symptoms.vomiting || 0) ? 1 : 0;
        giCountVal += (input.symptoms.diarrhea || 0) ? 1 : 0;
        giCountVal += (input.symptoms.constipation || 0) ? 1 : 0;
    }
    const GIcount = giCountVal / 4;
    const GastroDistress = 0.6 * GIcount + 0.4 * Sev_n;

    return {
        vector: {
            estrogenInfluence: clamp(E_estrogen),
            progesteroneInfluence: clamp(P_prog),
            energyStability: clamp(EnergyStability),
            emotionalVolatility: clamp(EmotionalVolatility),
            inflammationLikelihood: clamp(InflammationLikelihood),
            gastrointestinalDistress: clamp(GastroDistress)
        }
    };
}
