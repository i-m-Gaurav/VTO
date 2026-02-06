import { useRef, useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { Group, Box3, Vector3, SkinnedMesh, Mesh, OrthographicCamera } from 'three';
import { useBodyTracking } from '../../hooks/useBodyTracking';
import { useBodyModelRigging } from '../../hooks/useBodyModelRigging';
import { useTextureSwap, createTextureFromFile } from '../../hooks/useTextureSwap';
import { BodyOverlay } from '../WebcamView/BodyOverlay';
import { useAppStore } from '../../stores/appStore';
import { DebugPanel } from '../UI/DebugPanel';
import type { BodyModelType, FabricTexture } from '../../stores/appStore';

const ASPECT = 16 / 9;

/**
 * Model paths for body models with jacket
 */
const MODEL_PATHS: Record<BodyModelType, string> = {
  male: '/models/body_with_jacket.glb',
  female: '/models/body_with_jacket.glb',
};

const FALLBACK_MODEL = '/models/body_with_jacket.glb';

/**
 * Inner component that lives inside the R3F Canvas
 */
function BodyModelOverlay({
  model,
  landmarks,
}: {
  model: Group | null;
  landmarks: ReturnType<typeof useBodyTracking>;
}) {
  useBodyModelRigging(model, landmarks, true);
  useTextureSwap(model);

  if (!model) return null;
  return <primitive object={model} />;
}

/**
 * Orthographic camera
 */
function OrthoCamera() {
  const { camera, viewport } = useThree();

  useEffect(() => {
    const cam = camera as OrthographicCamera;
    if (cam.isOrthographicCamera) {
      const aspect = viewport.aspect || ASPECT;
      cam.left = -aspect;
      cam.right = aspect;
      cam.top = 1;
      cam.bottom = -1;
      cam.near = -10;
      cam.far = 10;
      cam.updateProjectionMatrix();
    }
  }, [camera, viewport]);

  return null;
}

/**
 * Fabric selector card component
 */
function FabricCard({
  fabric,
  isSelected,
  onClick,
  onRemove,
}: {
  fabric: FabricTexture;
  isSelected: boolean;
  onClick: () => void;
  onRemove?: () => void;
}) {
  const hasTexture = fabric.type === 'texture' && (fabric.textureUrl || fabric.thumbnailUrl);
  
  return (
    <button
      onClick={onClick}
      className={`
        relative w-20 h-28 rounded-xl transition-all duration-200 
        overflow-hidden flex-shrink-0
        ${isSelected 
          ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-900 scale-105' 
          : 'hover:scale-105 hover:ring-1 hover:ring-white/30'
        }
      `}
      style={{ 
        backgroundColor: fabric.color || '#333',
      }}
    >
      {/* Texture image preview */}
      {hasTexture && (
        <img 
          src={fabric.thumbnailUrl || fabric.textureUrl} 
          alt={fabric.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      
      {/* User uploaded badge */}
      {fabric.isUserUploaded && (
        <div className="absolute top-1 left-1">
          <span className="text-[8px] bg-purple-500 text-white px-1 py-0.5 rounded">
            Custom
          </span>
        </div>
      )}
      
      {/* Remove button for user uploads */}
      {fabric.isUserUploaded && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center
            opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
        >
          <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      
      {/* Fabric name */}
      <div className="absolute inset-0 flex items-end justify-center pb-2">
        <span className="text-white text-[10px] font-medium px-1 py-0.5 bg-black/60 rounded max-w-full truncate">
          {fabric.name}
        </span>
      </div>
      
      {/* Selected checkmark */}
      {isSelected && (
        <div className="absolute top-1 right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </button>
  );
}

/**
 * Add new fabric button with upload functionality
 */
function UploadFabricButton({ onUpload }: { onUpload: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  
  const handleClick = () => {
    inputRef.current?.click();
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
      // Reset input
      e.target.value = '';
    }
  };
  
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
      <button
        onClick={handleClick}
        className="w-20 h-28 rounded-xl border-2 border-dashed border-white/30 
          flex flex-col items-center justify-center flex-shrink-0 gap-1
          hover:border-white/50 hover:bg-white/5 transition-all duration-200"
      >
        <svg className="w-6 h-6 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="text-white/50 text-[9px]">Upload</span>
      </button>
    </>
  );
}

export function TryOnCanvas() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bodyModel, setBodyModelState] = useState<Group | null>(null);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [uploadingTexture, setUploadingTexture] = useState(false);

  const { 
    bodyModel: selectedBodyType, 
    setBodyModel: setSelectedBodyType,
    fabrics,
    selectedFabricId,
    setSelectedFabric,
    addUserFabric,
    removeUserFabric,
  } = useAppStore();
  
  const landmarks = useBodyTracking(videoRef);

  // Handle texture upload
  const handleUploadTexture = async (file: File) => {
    setUploadingTexture(true);
    
    try {
      const { url } = await createTextureFromFile(file);
      
      // Create new fabric entry
      const newFabric: FabricTexture = {
        id: `user-${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, '').slice(0, 12), // Remove extension, limit length
        type: 'texture',
        textureUrl: url,
        thumbnailUrl: url,
        isUserUploaded: true,
      };
      
      addUserFabric(newFabric);
      setSelectedFabric(newFabric.id);
      
      console.log('[TryOnCanvas] Uploaded texture:', newFabric.name);
    } catch (error) {
      console.error('[TryOnCanvas] Failed to upload texture:', error);
      alert('Failed to load texture image. Please try a different image.');
    } finally {
      setUploadingTexture(false);
    }
  };

  // Load the body model with jacket
  useEffect(() => {
    const modelPath = MODEL_PATHS[selectedBodyType];

    console.log(`[TryOnCanvas] Loading body model: ${modelPath}`);
    setLoadProgress(0);
    setLoadError(null);

    const isGLB = modelPath.endsWith('.glb') || modelPath.endsWith('.gltf');
    const isFBX = modelPath.endsWith('.fbx');

    const loadModel = () => {
      if (isGLB) {
        const loader = new GLTFLoader();
        loader.load(
          modelPath,
          (gltf) => handleModelLoaded(gltf.scene),
          handleProgress,
          (error) => handleError(error, modelPath)
        );
      } else if (isFBX) {
        const loader = new FBXLoader();
        loader.load(
          modelPath,
          (fbx) => handleModelLoaded(fbx),
          handleProgress,
          (error) => handleError(error, modelPath)
        );
      }
    };

    const handleModelLoaded = (scene: Group) => {
      console.log('[TryOnCanvas] Model loaded successfully!');

      let skeletonFound = false;
      scene.traverse((child) => {
        if (child instanceof SkinnedMesh) {
          console.log('[TryOnCanvas] SkinnedMesh:', child.name,
            'bones:', child.skeleton?.bones.length);
          child.frustumCulled = false;
          skeletonFound = true;

          if (child.name.toLowerCase().includes('woman') ||
              child.name.toLowerCase().includes('ue5_jacket')) {
            child.visible = false;
            console.log('[TryOnCanvas] Hiding extra mesh:', child.name);
          }
        }
        if (child instanceof Mesh && !(child instanceof SkinnedMesh)) {
          console.log('[TryOnCanvas] Mesh:', child.name);
          if (child.name.toLowerCase().includes('woman')) {
            child.visible = false;
          }
        }
      });

      if (!skeletonFound) {
        console.warn('[TryOnCanvas] Warning: No skeleton found in model');
      }

      const box = new Box3().setFromObject(scene);
      const size = new Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);

      if (maxDim > 0) {
        const normalizeScale = 1 / maxDim;
        scene.scale.setScalar(normalizeScale);

        const center = new Vector3();
        box.getCenter(center);
        scene.position.set(
          -center.x * normalizeScale,
          -center.y * normalizeScale,
          -center.z * normalizeScale
        );
      }

      scene.rotation.y = 0;
      setBodyModelState(scene);
    };

    const handleProgress = (progress: ProgressEvent) => {
      if (progress.total > 0) {
        const pct = (progress.loaded / progress.total * 100);
        setLoadProgress(pct);
        console.log('[TryOnCanvas] Loading:', pct.toFixed(1) + '%');
      }
    };

    const handleError = (error: unknown, failedPath: string) => {
      console.error('[TryOnCanvas] Error loading model:', error);

      if (failedPath !== FALLBACK_MODEL) {
        console.log('[TryOnCanvas] Trying fallback model...');
        const loader = new GLTFLoader();
        loader.load(
          FALLBACK_MODEL,
          (gltf) => handleModelLoaded(gltf.scene),
          handleProgress,
          (err) => {
            setLoadError(`Failed to load model: ${err}`);
          }
        );
      } else {
        setLoadError(`Failed to load model: ${error}`);
      }
    };

    loadModel();

    return () => {
      if (bodyModel) {
        console.log('[TryOnCanvas] Disposing model resources...');
        bodyModel.traverse((child) => {
          if (child instanceof Mesh) {
            child.geometry?.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach((mat) => mat.dispose());
              } else {
                child.material.dispose();
              }
            }
          }
        });
      }
    };
  }, [selectedBodyType]);

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 p-4 md:p-6">
      {/* Hidden video for pose detection */}
      <video
        ref={videoRef}
        className="absolute top-0 left-0 w-1 h-1 opacity-0 pointer-events-none"
        playsInline
        autoPlay
        muted
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col gap-4 md:gap-6 max-w-6xl mx-auto w-full">
        
        {/* Top controls bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Status indicator */}
            <div className="bg-black/50 backdrop-blur px-4 py-2 rounded-lg">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    landmarks?.poseLandmarks ? 'bg-green-500' : 'bg-yellow-500'
                  } animate-pulse`}
                />
                <span className="text-white text-sm font-medium">
                  {landmarks?.poseLandmarks
                    ? 'Tracking Active'
                    : bodyModel
                    ? 'Initializing...'
                    : loadError
                    ? 'Load Error'
                    : `Loading ${loadProgress.toFixed(0)}%`}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Body type selector */}
            <div className="bg-black/50 backdrop-blur px-3 py-1.5 rounded-lg flex gap-1">
              <button
                onClick={() => setSelectedBodyType('male')}
                className={`px-3 py-1 rounded text-xs font-medium transition ${
                  selectedBodyType === 'male'
                    ? 'bg-blue-600 text-white'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                Male
              </button>
              <button
                onClick={() => setSelectedBodyType('female')}
                className={`px-3 py-1 rounded text-xs font-medium transition ${
                  selectedBodyType === 'female'
                    ? 'bg-blue-600 text-white'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                Female
              </button>
            </div>

            {/* Toggle buttons */}
            <button
              onClick={() => setShowSkeleton(!showSkeleton)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                showSkeleton ? 'bg-blue-600 text-white' : 'bg-black/50 text-white/70 hover:text-white'
              }`}
            >
              Skeleton
            </button>
            <button
              onClick={() => setShowDebugPanel(!showDebugPanel)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                showDebugPanel ? 'bg-purple-600 text-white' : 'bg-black/50 text-white/70 hover:text-white'
              }`}
            >
              🎛️ Debug
            </button>
          </div>
        </div>

        {/* Main viewport box with border */}
        <div className="flex-1 relative">
          <div className="absolute inset-0 rounded-2xl border-2 border-white/20 bg-black/30 backdrop-blur-sm overflow-hidden">
            {/* 3D Canvas */}
            <Canvas
              orthographic
              camera={{
                position: [0, 0, 5],
                zoom: 1,
                near: -100,
                far: 100,
              }}
              dpr={1}
              gl={{ alpha: true, powerPreference: 'high-performance', antialias: false }}
              className="w-full h-full"
            >
              <OrthoCamera />
              <ambientLight intensity={0.9} />
              <directionalLight position={[2, 3, 4]} intensity={0.7} />
              <directionalLight position={[-2, 1, -2]} intensity={0.3} />
              <BodyModelOverlay model={bodyModel} landmarks={landmarks} />
            </Canvas>

            {/* Skeleton overlay */}
            {showSkeleton && (
              <>
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none opacity-50"
                  style={{ transform: 'scaleX(-1)' }}
                  width={640}
                  height={480}
                />
                <BodyOverlay canvasRef={canvasRef} landmarks={landmarks} />
              </>
            )}

            {/* Error message */}
            {loadError && (
              <div className="absolute inset-4 flex items-start justify-center">
                <div className="bg-red-600/90 backdrop-blur px-4 py-3 rounded-lg max-w-md">
                  <p className="text-white text-sm">{loadError}</p>
                  <p className="text-white/80 text-xs mt-1">
                    Model path: {MODEL_PATHS[selectedBodyType]}
                  </p>
                </div>
              </div>
            )}

            {/* Instructions overlay */}
            {!landmarks?.poseLandmarks && !loadError && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-black/70 backdrop-blur px-8 py-4 rounded-lg text-center">
                  <p className="text-white text-lg font-semibold mb-2">
                    Position yourself in front of the camera
                  </p>
                  <p className="text-white/80 text-sm">
                    Make sure your full body is visible for best results
                  </p>
                </div>
              </div>
            )}

            {/* Corner decorations for the box */}
            <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-white/40 rounded-tl-lg" />
            <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-white/40 rounded-tr-lg" />
            <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-white/40 rounded-bl-lg" />
            <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-white/40 rounded-br-lg" />
          </div>
        </div>

        {/* Fabric selector section */}
        <div className="bg-black/30 backdrop-blur-sm rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold text-sm">Select Fabric</h3>
            <div className="flex items-center gap-2">
              {uploadingTexture && (
                <span className="text-purple-400 text-xs animate-pulse">Uploading...</span>
              )}
              <span className="text-white/50 text-xs">{fabrics.length} options</span>
            </div>
          </div>
          
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {fabrics.map((fabric) => (
              <FabricCard
                key={fabric.id}
                fabric={fabric}
                isSelected={selectedFabricId === fabric.id}
                onClick={() => setSelectedFabric(fabric.id)}
                onRemove={fabric.isUserUploaded ? () => removeUserFabric(fabric.id) : undefined}
              />
            ))}
            <UploadFabricButton onUpload={handleUploadTexture} />
          </div>
          
          {/* Selected fabric info */}
          {fabrics.find(f => f.id === selectedFabricId) && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <p className="text-white/60 text-xs">
                Selected: <span className="text-white font-medium">
                  {fabrics.find(f => f.id === selectedFabricId)?.name}
                </span>
                {fabrics.find(f => f.id === selectedFabricId)?.type === 'texture' && (
                  <span className="ml-2 text-purple-400">(Texture)</span>
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Debug Panel - shown/hidden via toggle */}
      {showDebugPanel && <DebugPanel />}
    </div>
  );
}
