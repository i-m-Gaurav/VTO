import { useEffect, useRef } from 'react';
import { Group, Bone, SkinnedMesh, Euler } from 'three';
import type { Results } from '@mediapipe/pose';
import { MP_LANDMARKS } from '../utils/poseRetargeting';
import { useDebugStore } from '../stores/debugStore';

// Degrees to radians conversion
const DEG2RAD = Math.PI / 180;

// Y rotation values discovered via debug sliders
const Y_ROTATION_ARMS_DOWN = 13;   // degrees - when standing normally
const Y_ROTATION_T_POSE = -48;     // degrees - when arms are horizontal (T-pose)

/**
 * Hook to drive a body model's skeleton based on MediaPipe pose landmarks.
 * Uses Y rotation for arm up/down movement based on discovered values.
 */
export function useBodyModelRigging(
  model: Group | null,
  landmarks: Results | null,
  mirrored: boolean = true
) {
  // Get debug values from store
  const debugValues = useDebugStore();

  // Store ALL bones by name pattern (handles multiple armatures)
  const armBonesRef = useRef<{
    upperarm_l: Bone[];
    upperarm_r: Bone[];
    lowerarm_l: Bone[];
    lowerarm_r: Bone[];
  } | null>(null);

  // Store rest pose rotations for each bone (keyed by bone name)
  const restRotationsRef = useRef<Map<string, Euler>>(new Map());

  const smoothRotations = useRef<Map<string, Euler>>(new Map());
  const initializedRef = useRef(false);
  const frameRef = useRef(0);

  // Initialize - find ALL arm bones from all skeletons
  useEffect(() => {
    if (!model) return;

    const upperarm_l: Bone[] = [];
    const upperarm_r: Bone[] = [];
    const lowerarm_l: Bone[] = [];
    const lowerarm_r: Bone[] = [];

    // Find all SkinnedMeshes and collect bones
    model.traverse((child) => {
      if (child instanceof SkinnedMesh && child.skeleton) {
        child.frustumCulled = false;

        child.skeleton.bones.forEach((bone: Bone) => {
          const name = bone.name.toLowerCase();

          // Match upperarm_l (but not twist, corrective, etc.)
          if (name.includes('upperarm_l') &&
            !name.includes('twist') &&
            !name.includes('corrective') &&
            !name.includes('_in') &&
            !name.includes('_out') &&
            !name.includes('_fwd') &&
            !name.includes('_bck') &&
            !name.includes('bicep') &&
            !name.includes('tricep')) {
            upperarm_l.push(bone);
          }

          // Match upperarm_r
          if (name.includes('upperarm_r') &&
            !name.includes('twist') &&
            !name.includes('corrective') &&
            !name.includes('_in') &&
            !name.includes('_out') &&
            !name.includes('_fwd') &&
            !name.includes('_bck') &&
            !name.includes('bicep') &&
            !name.includes('tricep')) {
            upperarm_r.push(bone);
          }

          // Match lowerarm_l
          if (name.includes('lowerarm_l') &&
            !name.includes('twist') &&
            !name.includes('corrective') &&
            !name.includes('_in') &&
            !name.includes('_out') &&
            !name.includes('_fwd') &&
            !name.includes('_bck')) {
            lowerarm_l.push(bone);
          }

          // Match lowerarm_r
          if (name.includes('lowerarm_r') &&
            !name.includes('twist') &&
            !name.includes('corrective') &&
            !name.includes('_in') &&
            !name.includes('_out') &&
            !name.includes('_fwd') &&
            !name.includes('_bck')) {
            lowerarm_r.push(bone);
          }
        });
      }
    });

    armBonesRef.current = { upperarm_l, upperarm_r, lowerarm_l, lowerarm_r };

    // Capture rest pose rotations before we start modifying them
    const allBones = [...upperarm_l, ...upperarm_r, ...lowerarm_l, ...lowerarm_r];
    allBones.forEach(bone => {
      restRotationsRef.current.set(bone.name, bone.rotation.clone());
    });

    console.log('[Rigging] Found bones:', {
      upperarm_l: upperarm_l.map(b => b.name),
      upperarm_r: upperarm_r.map(b => b.name),
      lowerarm_l: lowerarm_l.map(b => b.name),
      lowerarm_r: lowerarm_r.map(b => b.name),
    });

    initializedRef.current = true;
    frameRef.current = 0;
  }, [model]);

  // Apply pose each frame
  useEffect(() => {
    if (!model || !initializedRef.current) return;

    const armBones = armBonesRef.current;
    if (!armBones) return;

    // Get current debug values
    const {
      enableTracking,
      useManualRotations,
      smoothingFactor,
      leftUpperArmX, leftUpperArmY, leftUpperArmZ,
      leftLowerArmX, leftLowerArmY, leftLowerArmZ,
      rightUpperArmX, rightUpperArmY, rightUpperArmZ,
      rightLowerArmX, rightLowerArmY, rightLowerArmZ,
    } = debugValues;

    // If tracking is disabled and not in manual mode, do nothing
    if (!enableTracking && !useManualRotations) return;

    const SMOOTH = smoothingFactor;

    // Helper to apply rotation to bones (now modifies X, Y, Z)
    const applyArmRotation = (
      bones: Bone[],
      key: string,
      xDelta: number,
      yDelta: number,
      zDelta: number
    ) => {
      if (bones.length === 0) return;

      // Smooth the delta values
      let smooth = smoothRotations.current.get(key);
      if (!smooth) {
        smooth = new Euler(xDelta, yDelta, zDelta);
        smoothRotations.current.set(key, smooth);
      } else {
        smooth.x += (xDelta - smooth.x) * SMOOTH;
        smooth.y += (yDelta - smooth.y) * SMOOTH;
        smooth.z += (zDelta - smooth.z) * SMOOTH;
      }

      // Apply to ALL matching bones
      bones.forEach(bone => {
        const rest = restRotationsRef.current.get(bone.name);
        if (rest) {
          bone.rotation.x = rest.x + smooth!.x;
          bone.rotation.y = rest.y + smooth!.y;
          bone.rotation.z = rest.z + smooth!.z;
        }
        bone.updateMatrix();
        bone.updateMatrixWorld(true);
      });
    };

    // === MANUAL MODE ===
    if (useManualRotations) {
      // Apply slider values directly (convert from degrees to radians)
      applyArmRotation(
        armBones.upperarm_l,
        'upperarm_l',
        leftUpperArmX * DEG2RAD,
        leftUpperArmY * DEG2RAD,
        leftUpperArmZ * DEG2RAD
      );
      applyArmRotation(
        armBones.lowerarm_l,
        'lowerarm_l',
        leftLowerArmX * DEG2RAD,
        leftLowerArmY * DEG2RAD,
        leftLowerArmZ * DEG2RAD
      );
      applyArmRotation(
        armBones.upperarm_r,
        'upperarm_r',
        rightUpperArmX * DEG2RAD,
        rightUpperArmY * DEG2RAD,
        rightUpperArmZ * DEG2RAD
      );
      applyArmRotation(
        armBones.lowerarm_r,
        'lowerarm_r',
        rightLowerArmX * DEG2RAD,
        rightLowerArmY * DEG2RAD,
        rightLowerArmZ * DEG2RAD
      );

      // Keep model facing forward
      model.rotation.y = 0;
      return;
    }

    // === TRACKING MODE ===
    if (!landmarks?.poseLandmarks) return;

    frameRef.current++;
    const pose = landmarks.poseLandmarks;
    const L = MP_LANDMARKS;
    const m = mirrored ? -1 : 1;

    // === Body position and scale ===
    const leftShoulder = pose[L.LEFT_SHOULDER];
    const rightShoulder = pose[L.RIGHT_SHOULDER];

    const shoulderWidth = Math.sqrt(
      Math.pow(leftShoulder.x - rightShoulder.x, 2) +
      Math.pow(leftShoulder.y - rightShoulder.y, 2)
    );

    // === CONSTRAINTS ===
    // Position constraints - keep model within the viewport box
    const MIN_X = -0.6;
    const MAX_X = 0.6;
    const MIN_Y = -7.0;  // Allow model to go lower to show head
    const MAX_Y = 0.9;

    // Scale constraints - larger scale to show just upper body
    const MIN_SCALE = 0.6;   // Minimum scale (zoomed in more)
    const MAX_SCALE = 1.8;   // Maximum scale

    // Calculate raw values
    // Use shoulder center for positioning (more stable for upper body view)
    const shoulderCenterX = ((leftShoulder.x + rightShoulder.x) / 2 - 0.5) * m;
    const shoulderCenterY = -((leftShoulder.y + rightShoulder.y) / 2 - 0.5);

    const rawX = shoulderCenterX * 2;
    // Shift the model DOWN significantly so we see the FACE and torso
    // Large negative offset to bring head into view
    const rawY = shoulderCenterY * 2 - 2.5;  // Even larger offset DOWN to show face

    // Larger scale to zoom in on upper body
    const rawScale = shoulderWidth * 8;

    // Apply constraints
    const clampedX = Math.max(MIN_X, Math.min(MAX_X, rawX));
    const clampedY = Math.max(MIN_Y, Math.min(MAX_Y, rawY));
    const clampedScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, rawScale));

    model.position.set(clampedX, clampedY, 0);
    model.scale.setScalar(clampedScale);

    // Keep model facing forward (no body turn)
    model.rotation.y = 0;

    // === ARM ROTATIONS ===
    // In mirrored mode: user's RIGHT controls model's LEFT (mirror effect)

    const lShoulder = mirrored ? pose[L.RIGHT_SHOULDER] : pose[L.LEFT_SHOULDER];
    const lElbow = mirrored ? pose[L.RIGHT_ELBOW] : pose[L.LEFT_ELBOW];

    const rShoulder = mirrored ? pose[L.LEFT_SHOULDER] : pose[L.RIGHT_SHOULDER];
    const rElbow = mirrored ? pose[L.LEFT_ELBOW] : pose[L.RIGHT_ELBOW];

    /**
     * Calculate arm angle from shoulder to elbow
     * Returns value from 0 (arm down) to 1 (arm horizontal/T-pose)
     */
    const calcArmRatio = (shoulder: typeof lShoulder, elbow: typeof lElbow): number => {
      const dx = Math.abs(elbow.x - shoulder.x);
      const dy = -(elbow.y - shoulder.y); // positive = up, negative = down

      // Calculate angle: -PI/2 = down, 0 = horizontal
      const angle = Math.atan2(dy, dx);

      // Map angle to ratio:
      // -PI/2 (-90°) = arms down = ratio 0
      // 0 (0°) = arms horizontal = ratio 1
      // Clamp between 0 and 1
      const ratio = (angle + Math.PI / 2) / (Math.PI / 2);
      return Math.max(0, Math.min(1, ratio));
    };

    /**
     * Map ratio (0-1) to Y rotation (13° to -48°)
     */
    const mapToYRotation = (ratio: number): number => {
      // ratio 0 (arms down) = 13°
      // ratio 1 (T-pose) = -48°
      const yDegrees = Y_ROTATION_ARMS_DOWN + (Y_ROTATION_T_POSE - Y_ROTATION_ARMS_DOWN) * ratio;
      return yDegrees * DEG2RAD;
    };

    // LEFT UPPER ARM
    {
      const ratio = calcArmRatio(lShoulder, lElbow);
      const yRotation = mapToYRotation(ratio);

      // Apply Y rotation only (X and Z stay at 0 delta)
      applyArmRotation(armBones.upperarm_l, 'upperarm_l', 0, yRotation, 0);
    }

    // RIGHT UPPER ARM
    {
      const ratio = calcArmRatio(rShoulder, rElbow);
      const yRotation = mapToYRotation(ratio);

      // Apply Y rotation only (X and Z stay at 0 delta)
      applyArmRotation(armBones.upperarm_r, 'upperarm_r', 0, yRotation, 0);
    }

    // Lower arms - keep at rest pose for now (no forearm tracking)
    applyArmRotation(armBones.lowerarm_l, 'lowerarm_l', 0, 0, 0);
    applyArmRotation(armBones.lowerarm_r, 'lowerarm_r', 0, 0, 0);

    // Debug log
    if (frameRef.current <= 5 || frameRef.current % 120 === 0) {
      const lRatio = calcArmRatio(lShoulder, lElbow);
      const rRatio = calcArmRatio(rShoulder, rElbow);
      console.log('[Rigging] Frame', frameRef.current, {
        leftArmRatio: lRatio.toFixed(2),
        rightArmRatio: rRatio.toFixed(2),
        leftYDegrees: (mapToYRotation(lRatio) / DEG2RAD).toFixed(1),
        rightYDegrees: (mapToYRotation(rRatio) / DEG2RAD).toFixed(1),
      });
    }

  }, [model, landmarks, mirrored, debugValues]);
}
