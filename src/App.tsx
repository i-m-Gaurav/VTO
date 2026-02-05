import { Scene } from './components/Scene3D/Scene';
import { TextureSelector } from './components/UI/TextureSelector';
import { TryOnCanvas } from './components/TryOnView/TryOnCanvas';
import { useAppStore } from './stores/appStore';

export default function App() {
  const { tryOnMode, setTryOnMode } = useAppStore();

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {!tryOnMode ? (
        <>
          <Scene />
          <TextureSelector />

          {/* Info Panel */}
          <div className="absolute top-4 right-4 bg-white/95 backdrop-blur p-4 rounded-lg shadow-xl max-w-xs z-10">
            <h2 className="text-xl font-bold mb-2 text-gray-800">Virtual Try-On</h2>
            <p className="text-sm text-gray-600 mb-4">
              Select a fabric to change the jacket's appearance. Use your mouse to rotate and zoom the model.
            </p>
            <button
              onClick={() => setTryOnMode(true)}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              Try On Jacket
            </button>
          </div>
        </>
      ) : (
        <>
          <TryOnCanvas />

          {/* Exit button */}
          <div className="absolute bottom-4 right-4 z-20">
            <button
              onClick={() => setTryOnMode(false)}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold shadow-xl"
            >
              Exit Try-On
            </button>
          </div>

          {/* Texture selector in try-on mode */}
          <div className="absolute bottom-4 left-4 z-20">
            <TextureSelector />
          </div>
        </>
      )}
    </div>
  );
}
