import { useEffect, useRef } from 'react';
import { Group, Bone, SkinnedMesh, Euler } from 'three';
import type { Results } from '@mediapipe/pose';
import { MP_LANDMARKS } from '../utils/poseRetargeting';

// Smoothing factor (lower = smoother but more latency)
const SMOOTH = 0.35;

/**
 * Hook to drive a body model's skeleton based on MediaPipe pose landmarks.
 * Handles models with multiple armatures by finding all matching bones.
 */
export function useBodyModelRigging(
  model: Group | null,
  landmarks: Results | null,
  mirrored: boolean = true
) {

  
  // Store ALL bones by name pattern (handles multiple armatures)
  const armBonesRef = useRef<{
    upperarm_l: Bone[];
    upperarm_r: Bone[];
    lowerarm_l: Bone[];
    lowerarm_r: Bone[];
  } | null>(null);

  

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
    if (!model || !landmarks?.poseLandmarks || !initializedRef.current) return;

    const armBones = armBonesRef.current;
    if (!armBones) return;

    // Debug: log initial bone rotations on first frame
    if (frameRef.current === 0) {
      const degStr = (bone: Bone | undefined) => {
        if (!bone) return 'N/A';
        const r = bone.rotation;
        return `X:${(r.x * 180/Math.PI).toFixed(1)} Y:${(r.y * 180/Math.PI).toFixed(1)} Z:${(r.z * 180/Math.PI).toFixed(1)}`;
      };
      console.log('[DEBUG] Initial bone rotations (degrees):', {
        upperarm_l: degStr(armBones.upperarm_l[0]),
        upperarm_r: degStr(armBones.upperarm_r[0]),
        lowerarm_l: degStr(armBones.lowerarm_l[0]),
        lowerarm_r: degStr(armBones.lowerarm_r[0]),
      });
    }

    frameRef.current++;
    const pose = landmarks.poseLandmarks;
    const L = MP_LANDMARKS;
    const m = mirrored ? -1 : 1;

    // Helper to apply rotation to ALL bones in array
    const applyRotationToAll = (bones: Bone[], key: string, x: number, y: number, z: number) => {
      if (bones.length === 0) return;

      // Smooth the rotation
      let smooth = smoothRotations.current.get(key);
      if (!smooth) {
        smooth = new Euler(x, y, z);
        smoothRotations.current.set(key, smooth);
      } else {
        smooth.x += (x - smooth.x) * SMOOTH;
        smooth.y += (y - smooth.y) * SMOOTH;
        smooth.z += (z - smooth.z) * SMOOTH;
      }

      // Apply to ALL matching bones
      bones.forEach(bone => {
        bone.rotation.x = smooth!.x;
        bone.rotation.y = smooth!.y;
        bone.rotation.z = smooth!.z;
        bone.updateMatrix();
        bone.updateMatrixWorld(true);
      });
    };

    // === Body position and scale ===
    const leftShoulder = pose[L.LEFT_SHOULDER];
    const rightShoulder = pose[L.RIGHT_SHOULDER];
    const leftHip = pose[L.LEFT_HIP];
    const rightHip = pose[L.RIGHT_HIP];

    const hipX = ((leftHip.x + rightHip.x) / 2 - 0.5) * m;
    const hipY = -((leftHip.y + rightHip.y) / 2 - 0.5);

    const shoulderWidth = Math.sqrt(
      Math.pow(leftShoulder.x - rightShoulder.x, 2) +
      Math.pow(leftShoulder.y - rightShoulder.y, 2)
    );

    model.position.set(hipX * 3, hipY * 3 - 0.4, 0);
    model.scale.setScalar(shoulderWidth * 5.5);

    // Body turn
    const depthDiff = ((leftShoulder.z || 0) - (rightShoulder.z || 0)) * m;
    const bodyTurn = Math.atan2(depthDiff, shoulderWidth) * 1.2;
    model.rotation.y = bodyTurn; // eslint-disable-line

    // === ARM ROTATIONS ===
    // In mirrored mode: user's RIGHT controls model's LEFT (mirror effect)

    const lShoulder = mirrored ? pose[L.RIGHT_SHOULDER] : pose[L.LEFT_SHOULDER];
    const lElbow = mirrored ? pose[L.RIGHT_ELBOW] : pose[L.LEFT_ELBOW];
    const lWrist = mirrored ? pose[L.RIGHT_WRIST] : pose[L.LEFT_WRIST];

    const rShoulder = mirrored ? pose[L.LEFT_SHOULDER] : pose[L.RIGHT_SHOULDER];
    const rElbow = mirrored ? pose[L.LEFT_ELBOW] : pose[L.RIGHT_ELBOW];
    const rWrist = mirrored ? pose[L.LEFT_WRIST] : pose[L.RIGHT_WRIST];

    // LEFT UPPER ARM
    {
      // Direction from shoulder to elbow (only X and Y for up/down motion)
      const dx = (lElbow.x - lShoulder.x) * m * 415; // horizontal (left/right)
      const dy = -(lElbow.y - lShoulder.y);    // vertical (up is positive now)

      // Z rotation: swings arm up/down (in frontal plane)
      // For left arm pointing left and down in A-pose, we need proper angle mapping
      const armAngle = Math.atan2(dy, Math.abs(dx)); // angle from horizontal
      // Map so that: arm down = small rotation, arm up = large rotation
      const zRot = armAngle - Math.PI/6; // small offset for A-pose rest position

      // No Y rotation - we only want up/down motion, no forward/back
      applyRotationToAll(armBones.upperarm_l, 'upperarm_l', 0, 0, zRot);
    }

    // LEFT LOWER ARM (relative to upper arm direction)
    {
      const dx = (lWrist.x - lElbow.x) * m;
      const dy = -(lWrist.y - lElbow.y);

      // Forearm bend angle
      const armAngle = Math.atan2(dy, Math.abs(dx));
      const zRot = armAngle * 0.6; // reduced to avoid over-rotation

      // No Y rotation - only up/down motion
      applyRotationToAll(armBones.lowerarm_l, 'lowerarm_l', 0, 0, zRot);
    }

    // RIGHT UPPER ARM
    {
      const dx = (rElbow.x - rShoulder.x) * m;
      const dy = -(rElbow.y - rShoulder.y);

      // Z rotation for right arm (mirrored from left)
      const armAngle = Math.atan2(dy, Math.abs(dx));
      const zRot = -(armAngle - Math.PI/6); // negative for right side

      // No Y rotation - only up/down motion
      applyRotationToAll(armBones.upperarm_r, 'upperarm_r', 0, 0, zRot);
    }

    // RIGHT LOWER ARM
    {
      const dx = (rWrist.x - rElbow.x) * m;
      const dy = -(rWrist.y - rElbow.y);

      // Forearm bend angle (mirrored from left)
      const armAngle = Math.atan2(dy, Math.abs(dx));
      const zRot = -armAngle * 0.6;

      // No Y rotation - only up/down motion
      applyRotationToAll(armBones.lowerarm_r, 'lowerarm_r', 0, 0, zRot);
    }

    // Debug log
    if (frameRef.current <= 5 || frameRef.current % 120 === 0) {
      console.log('[Rigging] Frame', frameRef.current, {
        bonesCounts: {
          upperarm_l: armBones.upperarm_l.length,
          upperarm_r: armBones.upperarm_r.length,
        },
        rotations: {
          upperarm_l_z: smoothRotations.current.get('upperarm_l')?.z.toFixed(2),
          upperarm_r_z: smoothRotations.current.get('upperarm_r')?.z.toFixed(2),
        }
      });
    }

  }, [model, landmarks, mirrored]);
}
