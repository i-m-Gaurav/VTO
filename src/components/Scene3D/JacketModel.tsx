import { useRef, useEffect, useState } from 'react';
import { Group, SkinnedMesh, Mesh } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useTextureSwap } from '../../hooks/useTextureSwap';

export function JacketModel() {
  const groupRef = useRef<Group>(null);
  const [model, setModel] = useState<Group | null>(null);

  useTextureSwap(model);

  useEffect(() => {
    const loader = new GLTFLoader();
    loader.load(
      '/models/jacket_rigged.glb',
      (gltf) => {
        const scene = gltf.scene;
        // Scale to fit the viewer
        scene.scale.set(0.01, 0.01, 0.01);

        scene.traverse((child) => {
          if (child instanceof SkinnedMesh) {
            child.frustumCulled = false;
          }
        });

        setModel(scene);
      },
      (progress) => {
        if (progress.total > 0) {
          console.log('Loading:', (progress.loaded / progress.total * 100).toFixed(1) + '%');
        }
      },
      (error) => {
        console.error('Error loading jacket GLB:', error);
      }
    );

    // Cleanup: dispose Three.js resources on unmount
    return () => {
      if (model) {
        console.log('[JacketModel] Disposing model resources...');
        model.traverse((child) => {
          if (child instanceof SkinnedMesh || child instanceof Mesh) {
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

  if (!model) {
    return null;
  }

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <primitive object={model} />
    </group>
  );
}
