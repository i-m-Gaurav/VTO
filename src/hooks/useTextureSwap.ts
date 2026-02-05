import { useEffect, useRef } from 'react';
import { Group, Mesh, MeshStandardMaterial, Color } from 'three';
import { useAppStore } from '../stores/appStore';
import { textureConfigs } from '../components/UI/TextureSelector';

export function useTextureSwap(model: Group | null) {
  const selectedTexture = useAppStore((s) => s.selectedTexture);
  // Reuse Color object instead of creating new ones each time
  const colorRef = useRef(new Color());

  useEffect(() => {
    if (!model) return;

    // Find the selected texture config
    const textureConfig = textureConfigs.find((t) => t.id === selectedTexture);
    if (!textureConfig) return;

    // Reuse existing Color object
    colorRef.current.set(textureConfig.color);

    // Traverse the model and update all mesh materials
    model.traverse((child) => {
      if (child instanceof Mesh) {
        if (child.material) {
          // Handle both single material and array of materials
          const materials = Array.isArray(child.material)
            ? child.material
            : [child.material];

          materials.forEach((material) => {
            if (material instanceof MeshStandardMaterial) {
              // Update the material color (copy to avoid reference issues)
              material.color.copy(colorRef.current);
              material.needsUpdate = true;
            }
          });
        }
      }
    });
  }, [model, selectedTexture]);
}
