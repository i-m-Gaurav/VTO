import { useRef, useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Group, Box3, Vector3, SkinnedMesh, Mesh } from 'three';
import { useBodyTracking } from '../../hooks/useBodyTracking';
import { useJacketRigging } from '../../hooks/useJacketRigging';
import { useTextureSwap } from '../../hooks/useTextureSwap';
import { BodyOverlay } from '../WebcamView/BodyOverlay';

const ASPECT = 16 / 9;

/**
 * Inner component that lives inside the R3F Canvas so it can call useThree.
 */
function JacketOverlay({
  model,
  landmarks,
}: {
  model: Group | null;
  landmarks: any;
}) {
  const { viewport } = useThree();
  const aspect = viewport.aspect || ASPECT;

  useJacketRigging(model, landmarks, aspect);
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
  const [jacketModel, setJacketModel] = useState<Group | null>(null);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);

  const landmarks = useBodyTracking(videoRef);

  // Load the extracted rigged jacket GLB
  useEffect(() => {
    console.log('[TryOnCanvas] Loading rigged jacket model...');
    const loader = new GLTFLoader();
    loader.load(
      '/models/jacket_rigged.glb',
      (gltf) => {
        console.log('[TryOnCanvas] Jacket GLB loaded!', gltf);
        const scene = gltf.scene;

        // Log what we got
        scene.traverse((child) => {
          if (child instanceof SkinnedMesh) {
            console.log('[TryOnCanvas] SkinnedMesh:', child.name,
              'skeleton bones:', child.skeleton?.bones.length);
            child.frustumCulled = false;
          }
          if (child instanceof Mesh && !(child instanceof SkinnedMesh)) {
            console.log('[TryOnCanvas] Mesh:', child.name);
          }
        });

        // Normalize the model size
        const box = new Box3().setFromObject(scene);
        const size = new Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
          const normalizeScale = 1 / maxDim;
          scene.scale.setScalar(normalizeScale);

          // Center on the torso area (not absolute center - shift up)
          const center = new Vector3();
          box.getCenter(center);
          scene.position.set(
            -center.x * normalizeScale,
            -center.y * normalizeScale + 0.1,
            -center.z * normalizeScale
          );
        }

        setJacketModel(scene);
      },
      (progress) => {
        if (progress.total > 0) {
          const pct = (progress.loaded / progress.total * 100);
          setLoadProgress(pct);
          console.log('[TryOnCanvas] Loading:', pct.toFixed(1) + '%');
        }
      },
      (error) => console.error('[TryOnCanvas] Error loading jacket model:', error)
    );

    // Cleanup: dispose Three.js resources on unmount
    return () => {
      if (jacketModel) {
        console.log('[TryOnCanvas] Disposing jacket model resources...');
        jacketModel.traverse((child) => {
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
  }, []);

  return (
    <div className="relative w-full h-full bg-black">
      {/* Webcam video background — mirrored for selfie view */}
      <video
        ref={videoRef}
        className="absolute top-0 left-0 w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
        playsInline
        autoPlay
        muted
      />

      {/* 3D jacket overlay — uses orthographic camera aligned with screen */}
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

          <JacketOverlay model={jacketModel} landmarks={landmarks} />
        </Canvas>
      </div>

      {/* Skeleton overlay (debug) — needs to match the mirrored video */}
      {showSkeleton && (
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          style={{ transform: 'scaleX(-1)' }}
          width={640}
          height={480}
        />
      )}
      {showSkeleton && (
        <BodyOverlay canvasRef={canvasRef} landmarks={landmarks} />
      )}

      {/* HUD */}
      <div className="absolute top-4 left-4 space-y-2 z-10">
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
                : jacketModel
                ? 'Initializing...'
                : `Loading Model ${loadProgress.toFixed(0)}%`}
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowSkeleton(!showSkeleton)}
          className="bg-black/70 backdrop-blur px-4 py-2 rounded-lg text-white text-sm hover:bg-black/80 transition"
        >
          {showSkeleton ? 'Hide' : 'Show'} Skeleton
        </button>
      </div>

      {/* Instructions */}
      {!landmarks?.poseLandmarks && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/70 backdrop-blur px-8 py-4 rounded-lg text-center">
            <p className="text-white text-lg font-semibold mb-2">
              Position yourself in front of the camera
            </p>
            <p className="text-white/80 text-sm">
              Make sure your upper body is visible
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
