import { useRef, useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { Group, Box3, Vector3, SkinnedMesh, Mesh } from 'three';
import { useBodyTracking } from '../../hooks/useBodyTracking';
import { useBodyModelRigging } from '../../hooks/useBodyModelRigging';
import { useTextureSwap } from '../../hooks/useTextureSwap';
import { BodyOverlay } from '../WebcamView/BodyOverlay';
import { useAppStore } from '../../stores/appStore';
import { DebugPanel } from '../UI/DebugPanel';
import type { BodyModelType } from '../../stores/appStore';

const ASPECT = 16 / 9;

/**
 * Model paths for body models with jacket
 * Using the full body model with jacket exported from Blender
 */
const MODEL_PATHS: Record<BodyModelType, string> = {
  male: '/models/body_with_jacket.glb',
  female: '/models/body_with_jacket.glb',
};

// Fallback model
const FALLBACK_MODEL = '/models/body_with_jacket.glb';

/**
 * Inner component that lives inside the R3F Canvas so it can call useThree.
 */
function BodyModelOverlay({
  model,
  landmarks,
}: {
  model: Group | null;
  landmarks: any;
}) {
  // Use the new body model rigging hook (mirrored = true for selfie view)
  useBodyModelRigging(model, landmarks, true);

  // Apply texture swaps to the jacket part of the model
  useTextureSwap(model);

  if (!model) return null;
  return <primitive object={model} />;
}

/**
 * Orthographic camera that keeps frustum synced with viewport aspect ratio.
 */
function OrthoCamera() {
  const { camera, viewport } = useThree();

  useEffect(() => {
    const cam = camera as any;
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

export function TryOnCanvas() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bodyModel, setBodyModelState] = useState<Group | null>(null);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const { bodyModel: selectedBodyType, setBodyModel: setSelectedBodyType } = useAppStore();
  const landmarks = useBodyTracking(videoRef);

  // Load the body model with jacket
  useEffect(() => {
    const modelPath = MODEL_PATHS[selectedBodyType];

    console.log(`[TryOnCanvas] Loading body model: ${modelPath}`);
    setLoadProgress(0);
    setLoadError(null);

    // Determine loader based on file extension
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

      // Log model structure and hide extra meshes
      let skeletonFound = false;
      scene.traverse((child) => {
        if (child instanceof SkinnedMesh) {
          console.log('[TryOnCanvas] SkinnedMesh:', child.name,
            'bones:', child.skeleton?.bones.length);
          child.frustumCulled = false;
          skeletonFound = true;

          // Hide the extra women's jacket mesh
          if (child.name.toLowerCase().includes('woman') ||
              child.name.toLowerCase().includes('ue5_jacket')) {
            child.visible = false;
            console.log('[TryOnCanvas] Hiding extra mesh:', child.name);
          }
        }
        if (child instanceof Mesh && !(child instanceof SkinnedMesh)) {
          console.log('[TryOnCanvas] Mesh:', child.name);
          // Also hide any non-skinned extra meshes
          if (child.name.toLowerCase().includes('woman')) {
            child.visible = false;
          }
        }
      });

      if (!skeletonFound) {
        console.warn('[TryOnCanvas] Warning: No skeleton found in model');
      }

      // Normalize the model size
      const box = new Box3().setFromObject(scene);
      const size = new Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);

      if (maxDim > 0) {
        // Scale to fit in normalized space
        const normalizeScale = 1 / maxDim;
        scene.scale.setScalar(normalizeScale);

        // Center the model
        const center = new Vector3();
        box.getCenter(center);
        scene.position.set(
          -center.x * normalizeScale,
          -center.y * normalizeScale,
          -center.z * normalizeScale
        );
      }

      // Initial rotation - rigging hook will control the actual rotation
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

    const handleError = (error: any, failedPath: string) => {
      console.error('[TryOnCanvas] Error loading model:', error);

      // Try fallback model
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

    // Cleanup
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
    <div className="relative w-full h-full bg-gradient-to-b from-gray-800 to-gray-900">
      {/* Hidden video for pose detection - not displayed */}
      <video
        ref={videoRef}
        className="absolute top-0 left-0 w-1 h-1 opacity-0 pointer-events-none"
        playsInline
        autoPlay
        muted
      />

      {/* 3D body model overlay */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
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
          style={{ pointerEvents: 'none' }}
        >
          <OrthoCamera />
          <ambientLight intensity={0.9} />
          <directionalLight position={[2, 3, 4]} intensity={0.7} />
          <directionalLight position={[-2, 1, -2]} intensity={0.3} />

          <BodyModelOverlay model={bodyModel} landmarks={landmarks} />
        </Canvas>
      </div>

      {/* Hidden skeleton canvas for debugging (toggle with button) */}
      <canvas
        ref={canvasRef}
        className={`absolute top-0 left-0 w-full h-full pointer-events-none ${showSkeleton ? 'opacity-50' : 'opacity-0'}`}
        style={{ transform: 'scaleX(-1)' }}
        width={640}
        height={480}
      />
      {showSkeleton && (
        <BodyOverlay canvasRef={canvasRef} landmarks={landmarks} />
      )}

      {/* HUD Controls */}
      <div className="absolute top-4 left-4 space-y-2 z-10">
        {/* Status indicator */}
        <div className="bg-black/70 backdrop-blur px-4 py-2 rounded-lg">
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
                : `Loading Model ${loadProgress.toFixed(0)}%`}
            </span>
          </div>
        </div>

        {/* Body type selector */}
        <div className="bg-black/70 backdrop-blur px-4 py-2 rounded-lg">
          <span className="text-white text-xs font-medium block mb-2">Body Type:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedBodyType('male')}
              className={`px-3 py-1 rounded text-xs font-medium transition ${
                selectedBodyType === 'male'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/20 text-white/80 hover:bg-white/30'
              }`}
            >
              Male
            </button>
            <button
              onClick={() => setSelectedBodyType('female')}
              className={`px-3 py-1 rounded text-xs font-medium transition ${
                selectedBodyType === 'female'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/20 text-white/80 hover:bg-white/30'
              }`}
            >
              Female
            </button>
          </div>
        </div>

        {/* Skeleton toggle */}
        <button
          onClick={() => setShowSkeleton(!showSkeleton)}
          className="bg-black/70 backdrop-blur px-4 py-2 rounded-lg text-white text-sm hover:bg-black/80 transition"
        >
          {showSkeleton ? 'Hide' : 'Show'} Skeleton
        </button>

        {/* Debug Panel toggle */}
        <button
          onClick={() => setShowDebugPanel(!showDebugPanel)}
          className="bg-purple-600/70 backdrop-blur px-4 py-2 rounded-lg text-white text-sm hover:bg-purple-600 transition"
        >
          🎛️ {showDebugPanel ? 'Hide' : 'Show'} Sliders
        </button>
      </div>

      {/* Error message */}
      {loadError && (
        <div className="absolute top-20 left-4 right-4 z-10">
          <div className="bg-red-600/90 backdrop-blur px-4 py-3 rounded-lg">
            <p className="text-white text-sm">{loadError}</p>
            <p className="text-white/80 text-xs mt-1">
              Make sure body model files exist at: {MODEL_PATHS[selectedBodyType]}
            </p>
          </div>
        </div>
      )}

      {/* Instructions */}
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

      {/* Debug Panel - shown/hidden via toggle */}
      {showDebugPanel && <DebugPanel />}
    </div>
  );
}
