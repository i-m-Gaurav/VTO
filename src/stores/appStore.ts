import { create } from 'zustand';

export type BodyModelType = 'male' | 'female';

interface AppState {
  selectedTexture: string;
  setTexture: (texture: string) => void;
  tryOnMode: boolean;
  setTryOnMode: (enabled: boolean) => void;
  bodyModel: BodyModelType;
  setBodyModel: (model: BodyModelType) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedTexture: 'original',
  setTexture: (texture) => set({ selectedTexture: texture }),
  tryOnMode: false,
  setTryOnMode: (enabled) => set({ tryOnMode: enabled }),
  bodyModel: 'male',
  setBodyModel: (model) => set({ bodyModel: model }),
}));
