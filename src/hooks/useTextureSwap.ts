import { useEffect, useRef } from 'react';
import {
  Group,
  Mesh,
  SkinnedMesh,
  MeshStandardMaterial,
  Color,
  TextureLoader,
  Texture,
  RepeatWrapping,
  SRGBColorSpace
} from 'three';
import { useAppStore } from '../stores/appStore';

// Cache for loaded textures to avoid reloading
const textureCache = new Map<string, Texture>();
const textureLoader = new TextureLoader();

/**
 * Load a texture with caching
 */
function loadTexture(url: string): Promise<Texture> {
  // Check cache first
  const cached = textureCache.get(url);
  if (cached) {
    return Promise.resolve(cached);
  }

  return new Promise((resolve, reject) => {
    textureLoader.load(
      url,
      (texture) => {
        // Configure texture for fabric
        texture.wrapS = RepeatWrapping;
        texture.wrapT = RepeatWrapping;
        texture.repeat.set(3, 3); // Repeat pattern 3x3
        texture.colorSpace = SRGBColorSpace;
        texture.needsUpdate = true;

        // Cache it
        textureCache.set(url, texture);
        resolve(texture);
      },
      undefined,
      (error) => {
        console.error('[TextureSwap] Failed to load texture:', url, error);
        reject(error);
      }
    );
  });
}

/**
 * Hook to swap textures/colors on the jacket model
 */
export function useTextureSwap(model: Group | null) {
  const { selectedFabricId, fabrics } = useAppStore();

  // Reuse Color object instead of creating new ones each time
  const colorRef = useRef(new Color());
  const currentTextureRef = useRef<string | null>(null);

  useEffect(() => {
    if (!model) return;

    // Find the selected fabric
    const fabric = fabrics.find((f) => f.id === selectedFabricId);
    if (!fabric) return;

    // Get all target meshes (jacket parts)
    const targetMeshes: Mesh[] = [];
    model.traverse((child) => {
      if (child instanceof Mesh || child instanceof SkinnedMesh) {
        // Target jacket meshes - adjust these names based on your model
        const name = child.name.toLowerCase();
        if (
          name.includes('jacket') ||
          name.includes('coat') ||
          name.includes('shirt') ||
          name.includes('top') ||
          name.includes('cloth') ||
          // If no specific name, apply to all visible meshes except body parts
          (!name.includes('body') &&
            !name.includes('skin') &&
            !name.includes('face') &&
            !name.includes('hand') &&
            !name.includes('head') &&
            !name.includes('leg') &&
            !name.includes('arm_') &&
            child.visible)
        ) {
          targetMeshes.push(child);
        }
      }
    });

    if (targetMeshes.length === 0) {
      console.warn('[TextureSwap] No target meshes found');
      return;
    }

    // Apply based on fabric type
    if (fabric.type === 'color' && fabric.color) {
      // Solid color - remove any texture and set color
      colorRef.current.set(fabric.color);

      targetMeshes.forEach((mesh) => {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

        materials.forEach((material) => {
          if (material instanceof MeshStandardMaterial) {
            // Remove texture if any
            if (material.map) {
              material.map = null;
            }
            // Set color
            material.color.copy(colorRef.current);
            material.needsUpdate = true;
          }
        });
      });

      currentTextureRef.current = null;
      console.log('[TextureSwap] Applied color:', fabric.color);

    } else if (fabric.type === 'texture' && fabric.textureUrl) {
      // Texture image
      const textureUrl = fabric.textureUrl;

      // Skip if same texture already applied
      if (currentTextureRef.current === textureUrl) {
        return;
      }

      loadTexture(textureUrl)
        .then((texture) => {
          targetMeshes.forEach((mesh) => {
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

            materials.forEach((material) => {
              if (material instanceof MeshStandardMaterial) {
                // Set white color so texture shows properly
                material.color.set(0xffffff);
                // Apply texture
                material.map = texture;
                material.needsUpdate = true;
              }
            });
          });

          currentTextureRef.current = textureUrl;
          console.log('[TextureSwap] Applied texture:', textureUrl);
        })
        .catch((error) => {
          // Fallback to color if texture fails
          console.warn('[TextureSwap] Texture load failed, using fallback color');
          if (fabric.color) {
            colorRef.current.set(fabric.color);
            targetMeshes.forEach((mesh) => {
              const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              materials.forEach((material) => {
                if (material instanceof MeshStandardMaterial) {
                  material.color.copy(colorRef.current);
                  material.needsUpdate = true;
                }
              });
            });
          }
        });
    }
  }, [model, selectedFabricId, fabrics]);
}

/**
 * Create a texture from a user-uploaded file
 */
export function createTextureFromFile(file: File): Promise<{ url: string; texture: Texture }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;

      textureLoader.load(
        dataUrl,
        (texture) => {
          // Configure for fabric
          texture.wrapS = RepeatWrapping;
          texture.wrapT = RepeatWrapping;
          texture.repeat.set(3, 3);
          texture.colorSpace = SRGBColorSpace;
          texture.needsUpdate = true;

          // Cache it
          textureCache.set(dataUrl, texture);

          resolve({ url: dataUrl, texture });
        },
        undefined,
        reject
      );
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
