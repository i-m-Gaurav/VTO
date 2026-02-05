import { useEffect, useRef } from 'react';
import { Group, Vector3, Quaternion, Bone, SkinnedMesh, Skeleton, Matrix4 } from 'three';
import { Results } from '@mediapipe/pose';
import {
  LANDMARKS,
  landmarkToScreen,
  landmarkTo3D,
  landmarkMidpoint,
  normalizedShoulderWidth,
  shoulderTiltAngle,
  bodyTurnAngle,
  quaternionFromDirections,
  findBone,
  landmarkDirection,
} from '../utils/boneMapping';

const SMOOTH = 0.15;
const BONE_SMOOTH = 0.15;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function slerpQuaternion(from: Quaternion, to: Quaternion, t: number): Quaternion {
  return from.clone().slerp(to, t);
}

interface BoneState {
  rotation: Quaternion;
}

/**
 * Drives the jacket skeleton bones based on MediaPipe pose landmarks.
 *
 * Strategy:
 * 1. Position & scale the whole model to match the body in screen space
 * 2. Drive spine bones for torso tilt and body turn
 * 3. Drive arm bones (upperarm, lowerarm) to match arm poses
 */
export function useJacketRigging(
  jacketModel: Group | null,
  landmarks: Results | null,
  aspect: number
) {
  const prevPos = useRef(new Vector3());
  const prevScale = useRef(1);
  const prevRotZ = useRef(0);
  const prevRotY = useRef(0);
  const initialized = useRef(false);
  const frameCountRef = useRef(0);

  const skeletonRef = useRef<Skeleton | null>(null);
  const restPosesRef = useRef<Map<string, Quaternion>>(new Map());
  const prevBones = useRef<Map<string, BoneState>>(new Map());
  const bonesInitialized = useRef(false);

  // Reusable objects to avoid creating new ones every frame
  const reusableVec3_1 = useRef(new Vector3());
  const reusableVec3_2 = useRef(new Vector3());
  const reusableVec3_3 = useRef(new Vector3());
  const reusableVec3_4 = useRef(new Vector3());
  const reusableQuat_1 = useRef(new Quaternion());
  const reusableQuat_2 = useRef(new Quaternion());

  // Find the skeleton once when the model is loaded
  useEffect(() => {
    if (!jacketModel) return;

    let skeleton: Skeleton | null = null;
    jacketModel.traverse((child) => {
      if (child instanceof SkinnedMesh && child.skeleton) {
        skeleton = child.skeleton;
      }
    });

    if (skeleton) {
      skeletonRef.current = skeleton;
      // Store rest poses for all bones
      const restPoses = new Map<string, Quaternion>();
      skeleton.bones.forEach((bone: Bone) => {
        restPoses.set(bone.name, bone.quaternion.clone());
      });
      restPosesRef.current = restPoses;
      console.log('[useJacketRigging] Found skeleton with', skeleton.bones.length, 'bones');
      console.log('[useJacketRigging] Key bones:', skeleton.bones.map(b => b.name).filter(n =>
        /^(spine|pelvis|clavicle|upperarm|lowerarm|hand|neck|head|root)/.test(n)
      ));
    } else {
      console.warn('[useJacketRigging] No skeleton found in model');
    }
  }, [jacketModel]);

  // Drive bones each frame
  useEffect(() => {
    if (!jacketModel || !landmarks?.poseLandmarks) return;

    const pose = landmarks.poseLandmarks;
    const skeleton = skeletonRef.current;
    frameCountRef.current++;

    try {
      // ── 1. Position & Scale (whole model) ──
      const shoulderMid = landmarkMidpoint(
        pose[LANDMARKS.LEFT_SHOULDER],
        pose[LANDMARKS.RIGHT_SHOULDER],
        aspect
      );
      // Shift down to align jacket with torso (adjust based on your model)
      shoulderMid.y -= 0.15;

      const shoulderW = normalizedShoulderWidth(pose);
      // Increase scale significantly to match body size
      const targetScale = shoulderW * 5.0;

      const targetRotZ = shoulderTiltAngle(pose);
      const targetRotY = bodyTurnAngle(pose);

      const smoothFactor = 1 - SMOOTH;
      if (!initialized.current) {
        prevPos.current.copy(shoulderMid);
        prevScale.current = targetScale;
        prevRotZ.current = targetRotZ;
        prevRotY.current = targetRotY;
        initialized.current = true;
      }

      prevPos.current.lerp(shoulderMid, smoothFactor);
      prevScale.current = lerp(prevScale.current, targetScale, smoothFactor);
      prevRotZ.current = lerp(prevRotZ.current, targetRotZ, smoothFactor);
      prevRotY.current = lerp(prevRotY.current, targetRotY, smoothFactor);

      jacketModel.position.copy(prevPos.current);
      jacketModel.scale.setScalar(prevScale.current);
      // Preserve the initial 180° rotation and apply body rotations on top
      jacketModel.rotation.set(Math.PI, prevRotY.current, prevRotZ.current);

      // Debug logging (first 60 frames only)
      if (frameCountRef.current < 60) {
        console.log(`[Rigging] pos: ${prevPos.current.x.toFixed(2)}, ${prevPos.current.y.toFixed(2)}, scale: ${prevScale.current.toFixed(2)}`);
      }

      // ── 2. Bone-level rigging ──
      if (!skeleton) return;

      const boneSmoothFactor = 1 - BONE_SMOOTH;

      // Initialize bone states
      if (!bonesInitialized.current) {
        skeleton.bones.forEach((bone: Bone) => {
          const rest = restPosesRef.current.get(bone.name);
          prevBones.current.set(bone.name, {
            rotation: rest ? rest.clone() : bone.quaternion.clone(),
          });
        });
        bonesInitialized.current = true;
      }

      // Helper: apply smoothed rotation to a bone
      const applyBoneRotation = (boneName: string, targetQuat: Quaternion) => {
        const bone = findBone(skeleton, boneName);
        if (!bone) return;
        const prev = prevBones.current.get(boneName);
        if (prev) {
          prev.rotation.slerp(targetQuat, boneSmoothFactor);
          bone.quaternion.copy(prev.rotation);
        } else {
          bone.quaternion.copy(targetQuat);
        }
      };

      // ── Spine / Torso ──
      // Drive spine_01 with a subtle torso lean based on hip-shoulder offset
      // Reuse vectors to avoid allocation
      const hipMid3D = reusableVec3_1.current;
      hipMid3D.copy(landmarkTo3D(pose[LANDMARKS.LEFT_HIP]))
        .add(landmarkTo3D(pose[LANDMARKS.RIGHT_HIP]))
        .multiplyScalar(0.5);

      const shoulderMid3D = reusableVec3_2.current;
      shoulderMid3D.copy(landmarkTo3D(pose[LANDMARKS.LEFT_SHOULDER]))
        .add(landmarkTo3D(pose[LANDMARKS.RIGHT_SHOULDER]))
        .multiplyScalar(0.5);

      const torsoDir = reusableVec3_3.current;
      torsoDir.copy(shoulderMid3D).sub(hipMid3D).normalize();

      // Rest pose torso direction is roughly +Y (upward)
      const restTorsoDir = reusableVec3_4.current.set(0, 1, 0);
      const spineQuat = quaternionFromDirections(restTorsoDir, torsoDir);

      // Distribute spine rotation across spine bones for natural look
      const spinePartial = reusableQuat_1.current.identity().slerp(spineQuat, 0.3);
      applyBoneRotation('spine_01', spinePartial);
      applyBoneRotation('spine_02', spinePartial);
      applyBoneRotation('spine_03', spinePartial);

      // ── Left Arm ──
      const lShoulder = landmarkTo3D(pose[LANDMARKS.LEFT_SHOULDER]);
      const lElbow = landmarkTo3D(pose[LANDMARKS.LEFT_ELBOW]);
      const lWrist = landmarkTo3D(pose[LANDMARKS.LEFT_WRIST]);

      // Upper arm: direction from shoulder to elbow (reuse vectors)
      const lUpperArmDir = reusableVec3_1.current.copy(lElbow).sub(lShoulder).normalize();
      // In the skeleton rest pose, the left upper arm typically points roughly in -X (left) and slightly down
      const restLeftUpperArm = reusableVec3_2.current.set(-0.7, -0.7, 0).normalize();
      const lUpperArmQuat = quaternionFromDirections(restLeftUpperArm, lUpperArmDir);
      // Combine with rest pose
      const lUpperArmRest = restPosesRef.current.get('upperarm_l') || new Quaternion();
      const lUpperArmFinal = reusableQuat_1.current.copy(lUpperArmRest).multiply(lUpperArmQuat);
      applyBoneRotation('upperarm_l', lUpperArmFinal);

      // Forearm: direction from elbow to wrist (reuse vectors)
      const lForearmDir = reusableVec3_3.current.copy(lWrist).sub(lElbow).normalize();
      const restLeftForearm = reusableVec3_4.current.set(-0.9, -0.4, 0).normalize();
      const lForearmQuat = quaternionFromDirections(restLeftForearm, lForearmDir);
      const lForearmRest = restPosesRef.current.get('lowerarm_l') || new Quaternion();
      const lForearmFinal = reusableQuat_2.current.copy(lForearmRest).multiply(lForearmQuat);
      applyBoneRotation('lowerarm_l', lForearmFinal);

      // ── Right Arm ──
      const rShoulder = landmarkTo3D(pose[LANDMARKS.RIGHT_SHOULDER]);
      const rElbow = landmarkTo3D(pose[LANDMARKS.RIGHT_ELBOW]);
      const rWrist = landmarkTo3D(pose[LANDMARKS.RIGHT_WRIST]);

      // Upper arm: direction from shoulder to elbow (reuse vectors)
      const rUpperArmDir = reusableVec3_1.current.copy(rElbow).sub(rShoulder).normalize();
      const restRightUpperArm = reusableVec3_2.current.set(0.7, -0.7, 0).normalize();
      const rUpperArmQuat = quaternionFromDirections(restRightUpperArm, rUpperArmDir);
      const rUpperArmRest = restPosesRef.current.get('upperarm_r') || new Quaternion();
      const rUpperArmFinal = reusableQuat_1.current.copy(rUpperArmRest).multiply(rUpperArmQuat);
      applyBoneRotation('upperarm_r', rUpperArmFinal);

      // Forearm (reuse vectors)
      const rForearmDir = reusableVec3_3.current.copy(rWrist).sub(rElbow).normalize();
      const restRightForearm = reusableVec3_4.current.set(0.9, -0.4, 0).normalize();
      const rForearmQuat = quaternionFromDirections(restRightForearm, rForearmDir);
      const rForearmRest = restPosesRef.current.get('lowerarm_r') || new Quaternion();
      const rForearmFinal = reusableQuat_2.current.copy(rForearmRest).multiply(rForearmQuat);
      applyBoneRotation('lowerarm_r', rForearmFinal);

      // Update the skeleton
      skeleton.bones.forEach(bone => bone.updateMatrixWorld(true));

    } catch (error) {
      console.error('[useJacketRigging] Error:', error);
    }
  }, [jacketModel, landmarks, aspect]);
}
