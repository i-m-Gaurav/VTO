import { create } from 'zustand';

export interface DebugValues {
    // Arm rotation offsets (in degrees for UI, converted to radians in hook)
    leftUpperArmX: number;
    leftUpperArmY: number;
    leftUpperArmZ: number;
    leftLowerArmX: number;
    leftLowerArmY: number;
    leftLowerArmZ: number;
    rightUpperArmX: number;
    rightUpperArmY: number;
    rightUpperArmZ: number;
    rightLowerArmX: number;
    rightLowerArmY: number;
    rightLowerArmZ: number;

    // Body controls
    bodyRotationY: number;

    // Reference angles (in degrees)
    armsDownAngle: number; // Reference angle for "arms down" position

    // Multipliers
    smoothingFactor: number;
    rotationMultiplier: number;
    forearmMultiplier: number;

    // Toggles
    enableTracking: boolean;
    useManualRotations: boolean; // When true, use slider values instead of tracking
}

interface DebugStore extends DebugValues {
    setValue: <K extends keyof DebugValues>(key: K, value: DebugValues[K]) => void;
    resetAll: () => void;
}

const defaultValues: DebugValues = {
    // Arm rotation offsets
    leftUpperArmX: 0,
    leftUpperArmY: 0,
    leftUpperArmZ: 0,
    leftLowerArmX: 0,
    leftLowerArmY: 0,
    leftLowerArmZ: 0,
    rightUpperArmX: 0,
    rightUpperArmY: 0,
    rightUpperArmZ: 0,
    rightLowerArmX: 0,
    rightLowerArmY: 0,
    rightLowerArmZ: 0,

    // Body controls
    bodyRotationY: 0,

    // Reference angles
    armsDownAngle: -82, // About -PI/2.2 in degrees

    // Multipliers
    smoothingFactor: 0.35,
    rotationMultiplier: 1.0,
    forearmMultiplier: 0.6,

    // Toggles
    enableTracking: true,
    useManualRotations: false,
};

export const useDebugStore = create<DebugStore>((set) => ({
    ...defaultValues,

    setValue: (key, value) => set((state) => ({ ...state, [key]: value })),

    resetAll: () => set(defaultValues),
}));
