export interface ScenarioInput {
    phase: 'Menstrual' | 'Follicular' | 'Ovulatory' | 'Luteal';
    mood: 'Calm' | 'Neutral' | 'Irritable' | 'Severe mood swings';
    energy: number; // 1-10
    sleep: number; // 1-10
    stress: number; // 1-10
    symptoms: {
        cramps: number; // 0-1
        backPain: number; // 0-1
        headache: number; // 0-1
        bloating: number; // 0-1
        others: number; // 0-1
    };
}

export interface StateVector {
    estrogenInfluence: number;
    progesteroneInfluence: number;
    energyStability: number;
    emotionalVolatility: number;
    inflammationLikelihood: number;
}

function clamp(value: number): number {
    return Math.max(0, Math.min(1, value));
}

export function computeStateVector(input: ScenarioInput): StateVector {
    const E = input.energy / 10;
    const S = input.sleep / 10;
    const St = input.stress / 10;

    // Inflammation
    const inflammation =
        input.symptoms.cramps * 0.3 +
        input.symptoms.backPain * 0.2 +
        input.symptoms.headache * 0.2 +
        input.symptoms.bloating * 0.1 +
        input.symptoms.others * 0.1;

    // Energy Stability
    let energyStability = 0.6 * E + 0.4 * S - 0.3 * St;

    // Emotional Volatility
    let moodScore = 0.4;
    switch (input.mood) {
        case 'Calm': moodScore = 0.2; break;
        case 'Neutral': moodScore = 0.4; break;
        case 'Irritable': moodScore = 0.7; break;
        case 'Severe mood swings': moodScore = 0.9; break;
    }
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
        estrogenInfluence: clamp(estrogen),
        progesteroneInfluence: clamp(progesterone),
        energyStability: clamp(energyStability),
        emotionalVolatility: clamp(emotionalVolatility),
        inflammationLikelihood: clamp(inflammation),
    };
}
