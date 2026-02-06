import { create } from 'zustand';

export type BodyModelType = 'male' | 'female';

// Fabric/Texture type
export interface FabricTexture {
  id: string;
  name: string;
  type: 'color' | 'texture';
  color?: string;        // For solid colors
  textureUrl?: string;   // For texture images
  thumbnailUrl?: string; // Preview thumbnail
  isUserUploaded?: boolean;
}

// Predefined fabric textures
export const PREDEFINED_FABRICS: FabricTexture[] = [
  { id: 'navy-blue', name: 'Navy Blue', type: 'color', color: '#1e3a5f' },
  { id: 'charcoal', name: 'Charcoal', type: 'color', color: '#36454f' },
  { id: 'burgundy', name: 'Burgundy', type: 'color', color: '#722f37' },
  { id: 'forest-green', name: 'Forest Green', type: 'color', color: '#228b22' },
  { id: 'black', name: 'Black', type: 'color', color: '#1a1a1a' },
  // Texture-based fabrics (you can add actual texture URLs)
  {
    id: 'denim',
    name: 'Denim',
    type: 'texture',
    textureUrl: '/textures/denim.jpg',
    thumbnailUrl: '/textures/denim-thumb.jpg',
    color: '#4a6fa5'  // Fallback color
  },
  {
    id: 'tweed',
    name: 'Tweed',
    type: 'texture',
    textureUrl: '/textures/tweed.jpg',
    thumbnailUrl: '/textures/tweed-thumb.jpg',
    color: '#8b7355'  // Fallback color
  },
];

interface AppState {
  // Texture/Fabric selection
  selectedFabricId: string;
  fabrics: FabricTexture[];
  setSelectedFabric: (id: string) => void;
  addUserFabric: (fabric: FabricTexture) => void;
  removeUserFabric: (id: string) => void;

  // Legacy - for compatibility
  selectedTexture: string;
  setTexture: (texture: string) => void;

  // Try-on mode
  tryOnMode: boolean;
  setTryOnMode: (enabled: boolean) => void;

  // Body model
  bodyModel: BodyModelType;
  setBodyModel: (model: BodyModelType) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Fabric system
  selectedFabricId: 'navy-blue',
  fabrics: [...PREDEFINED_FABRICS],
  setSelectedFabric: (id) => set({ selectedFabricId: id }),
  addUserFabric: (fabric) => set((state) => ({
    fabrics: [...state.fabrics, { ...fabric, isUserUploaded: true }]
  })),
  removeUserFabric: (id) => set((state) => ({
    fabrics: state.fabrics.filter(f => f.id !== id || !f.isUserUploaded)
  })),

  // Legacy
  selectedTexture: 'original',
  setTexture: (texture) => set({ selectedTexture: texture }),

  // Other state
  tryOnMode: false,
  setTryOnMode: (enabled) => set({ tryOnMode: enabled }),
  bodyModel: 'male',
  setBodyModel: (model) => set({ bodyModel: model }),
}));
