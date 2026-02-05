import { useAppStore } from '../../stores/appStore';

// Texture options - can be updated with real texture paths later
const textures = [
  {
    id: 'original',
    name: 'Dark Blue',
    color: '#1e3a8a',
    description: 'Original dark blue jacket'
  },
  {
    id: 'fabric-denim',
    name: 'Denim',
    color: '#3b82f6',
    description: 'Light denim fabric'
  },
  {
    id: 'fabric-leather',
    name: 'Black Leather',
    color: '#1f2937',
    description: 'Black leather finish'
  },
  {
    id: 'fabric-red',
    name: 'Red',
    color: '#dc2626',
    description: 'Bright red fabric'
  },
];

export function TextureSelector() {
  const { selectedTexture, setTexture } = useAppStore();

  return (
    <div className="absolute top-4 left-4 bg-white/95 backdrop-blur p-4 rounded-lg shadow-xl z-10">
      <h3 className="text-sm font-bold mb-3 text-gray-800">Select Fabric</h3>
      <div className="grid grid-cols-2 gap-3">
        {textures.map((tex) => (
          <button
            key={tex.id}
            onClick={() => setTexture(tex.id)}
            className={`
              relative overflow-hidden rounded-lg transition-all duration-200
              ${selectedTexture === tex.id
                ? 'ring-2 ring-blue-500 ring-offset-2 scale-105'
                : 'hover:scale-105 ring-1 ring-gray-200'
              }
            `}
            title={tex.description}
          >
            <div
              className="w-20 h-20"
              style={{ backgroundColor: tex.color }}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs py-1 px-2">
              {tex.name}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export const textureConfigs = textures;
