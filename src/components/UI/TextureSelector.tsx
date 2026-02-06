/**
 * Legacy TextureSelector component
 * This file is kept for backwards compatibility.
 * The new fabric selection is integrated directly into TryOnCanvas.
 */

import { useAppStore } from '../../stores/appStore';

// Legacy texture configs - kept for backwards compatibility
export const textureConfigs = [
  { id: 'original', name: 'Dark Blue', color: '#1e3a8a' },
  { id: 'fabric-denim', name: 'Denim', color: '#3b82f6' },
  { id: 'fabric-leather', name: 'Black Leather', color: '#1f2937' },
  { id: 'fabric-red', name: 'Red', color: '#dc2626' },
];

/**
 * @deprecated Use the fabric selector in TryOnCanvas instead
 */
export function TextureSelector() {
  const { fabrics, selectedFabricId, setSelectedFabric } = useAppStore();

  return (
    <div className="absolute top-4 left-4 bg-white/95 backdrop-blur p-4 rounded-lg shadow-xl z-10">
      <h3 className="text-sm font-bold mb-3 text-gray-800">Select Fabric</h3>
      <div className="grid grid-cols-2 gap-3">
        {fabrics.map((fabric) => (
          <button
            key={fabric.id}
            onClick={() => setSelectedFabric(fabric.id)}
            className={`
              relative overflow-hidden rounded-lg transition-all duration-200
              ${selectedFabricId === fabric.id
                ? 'ring-2 ring-blue-500 ring-offset-2 scale-105'
                : 'hover:scale-105 ring-1 ring-gray-200'
              }
            `}
            title={fabric.name}
          >
            {fabric.type === 'texture' && fabric.textureUrl ? (
              <img 
                src={fabric.thumbnailUrl || fabric.textureUrl} 
                alt={fabric.name}
                className="w-20 h-20 object-cover"
              />
            ) : (
              <div
                className="w-20 h-20"
                style={{ backgroundColor: fabric.color || '#333' }}
              />
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs py-1 px-2">
              {fabric.name}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
