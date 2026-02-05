import { create } from 'zustand';

interface AppState {
  selectedTexture: string;
  setTexture: (texture: string) => void;
  tryOnMode: boolean;
  setTryOnMode: (enabled: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedTexture: 'original',
  setTexture: (texture) => set({ selectedTexture: texture }),
  tryOnMode: false,
  setTryOnMode: (enabled) => set({ tryOnMode: enabled }),
}));
