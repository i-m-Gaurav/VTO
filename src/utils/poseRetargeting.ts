import type { NormalizedLandmark } from '@mediapipe/pose';
import { Vector3, Quaternion, Bone, Skeleton } from 'three';

/**
 * MediaPipe Pose Landmark indices
 * Reference: https://developers.google.com/mediapipe/solutions/vision/pose_landmarker
 */
export const MP_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;

/**
 * Common bone names found in humanoid skeletons (Mixamo, UE4, Unity Humanoid, MetaHuman, etc.)
 * The rigging system will try to find bones matching these patterns
 * Order matters - more specific patterns should come first
 */
export const BONE_NAME_PATTERNS = {
  // Root/Pelvis
  hips: ['pelvis', 'hips', 'root', 'hip'],

  // Spine chain - MetaHuman uses spine_01, spine_02, etc.
  spine: ['spine_01', 'spine', 'spine1', 'spine.001'],
  spine1: ['spine_02', 'spine_03', 'spine2', 'spine.002', 'chest'],
  spine2: ['spine_04', 'spine_05', 'spine3', 'spine.003', 'upperchest'],

  // Neck and head
  neck: ['neck_01', 'neck_02', 'neck'],
  head: ['head', 'head_01'],

  // Left arm (MetaHuman: clavicle_l, upperarm_l, lowerarm_l, hand_l)
  leftShoulder: ['clavicle_l', 'leftshoulder', 'shoulder_l', 'l_clavicle', 'shoulder.l'],
  leftUpperArm: ['upperarm_l', 'leftarm', 'l_upperarm', 'arm_l', 'upper_arm.l', 'upperarm.l'],
  leftLowerArm: ['lowerarm_l', 'leftforearm', 'l_lowerarm', 'forearm_l', 'lower_arm.l', 'lowerarm.l'],
  leftHand: ['hand_l', 'lefthand', 'l_hand', 'hand.l'],

  // Right arm (MetaHuman: clavicle_r, upperarm_r, lowerarm_r, hand_r)
  rightShoulder: ['clavicle_r', 'rightshoulder', 'shoulder_r', 'r_clavicle', 'shoulder.r'],
  rightUpperArm: ['upperarm_r', 'rightarm', 'r_upperarm', 'arm_r', 'upper_arm.r', 'upperarm.r'],
  rightLowerArm: ['lowerarm_r', 'rightforearm', 'r_lowerarm', 'forearm_r', 'lower_arm.r', 'lowerarm.r'],
  rightHand: ['hand_r', 'righthand', 'r_hand', 'hand.r'],

  // Left leg (MetaHuman: thigh_l, calf_l, foot_l)
  leftUpperLeg: ['thigh_l', 'leftupleg', 'l_thigh', 'upperleg_l', 'upper_leg.l', 'thigh.l'],
  leftLowerLeg: ['calf_l', 'leftleg', 'l_calf', 'lowerleg_l', 'lower_leg.l', 'shin.l'],
  leftFoot: ['foot_l', 'leftfoot', 'l_foot', 'foot.l'],
  leftToe: ['ball_l', 'lefttoebase', 'toe_l', 'l_toe', 'toe.l'],

  // Right leg (MetaHuman: thigh_r, calf_r, foot_r)
  rightUpperLeg: ['thigh_r', 'rightupleg', 'r_thigh', 'upperleg_r', 'upper_leg.r', 'thigh.r'],
  rightLowerLeg: ['calf_r', 'rightleg', 'r_calf', 'lowerleg_r', 'lower_leg.r', 'shin.r'],
  rightFoot: ['foot_r', 'rightfoot', 'r_foot', 'foot.r'],
  rightToe: ['ball_r', 'righttoebase', 'toe_r', 'r_toe', 'toe.r'],
};

/**
 * Find a bone in the skeleton by trying multiple name patterns
 * Uses exact matching first, then falls back to includes matching
 */
export function findBoneByPattern(skeleton: Skeleton, boneKey: keyof typeof BONE_NAME_PATTERNS): Bone | null {
  const patterns = BONE_NAME_PATTERNS[boneKey];

  // First pass: exact match (case-insensitive)
  for (const pattern of patterns) {
    const bone = skeleton.bones.find(
      b => b.name.toLowerCase() === pattern.toLowerCase()
    );
    if (bone) return bone;
  }

  // Second pass: includes match (for variations)
  for (const pattern of patterns) {
    const bone = skeleton.bones.find(
      b => b.name.toLowerCase().includes(pattern.toLowerCase()) &&
           // Avoid matching twist/corrective bones
           !b.name.toLowerCase().includes('twist') &&
           !b.name.toLowerCase().includes('corrective') &&
           !b.name.toLowerCase().includes('_in_') &&
           !b.name.toLowerCase().includes('_out_') &&
           !b.name.toLowerCase().includes('_fwd') &&
           !b.name.toLowerCase().includes('_bck')
    );
    if (bone) return bone;
  }

  return null;
}

/**
 * Convert MediaPipe landmark to Three.js world space position
 * MediaPipe: x=[0,1] left->right, y=[0,1] top->bottom, z=depth (negative=closer)
 */
export function landmarkToWorld(landmark: NormalizedLandmark, scale: number = 1): Vector3 {
  return new Vector3(
    (landmark.x - 0.5) * scale,        // Center X
    -(landmark.y - 0.5) * scale,       // Invert Y (MediaPipe Y is top-down)
    -(landmark.z || 0) * scale * 0.5   // Z depth (scaled down, negative = closer in MP)
  );
}

/**
 * Get the midpoint between two landmarks
 */
export function getLandmarkMidpoint(l1: NormalizedLandmark, l2: NormalizedLandmark, scale: number = 1): Vector3 {
  const p1 = landmarkToWorld(l1, scale);
  const p2 = landmarkToWorld(l2, scale);
  return p1.add(p2).multiplyScalar(0.5);
}

/**
 * Calculate a rotation quaternion that rotates from one direction to another
 */
export function getRotationBetweenVectors(from: Vector3, to: Vector3): Quaternion {
  const quaternion = new Quaternion();
  const fromNorm = from.clone().normalize();
  const toNorm = to.clone().normalize();

  const dot = fromNorm.dot(toNorm);

  if (dot > 0.9999) {
    return quaternion.identity();
  }

  if (dot < -0.9999) {
    // 180 degree rotation
    let axis = new Vector3(1, 0, 0).cross(fromNorm);
    if (axis.lengthSq() < 0.001) {
      axis = new Vector3(0, 1, 0).cross(fromNorm);
    }
    return quaternion.setFromAxisAngle(axis.normalize(), Math.PI);
  }

  const axis = fromNorm.clone().cross(toNorm).normalize();
  const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
  return quaternion.setFromAxisAngle(axis, angle);
}

/**
 * Calculate bone rotation from parent-to-child direction
 * This is the core function for limb bone retargeting
 */
export function calculateLimbRotation(
  parentPos: Vector3,
  childPos: Vector3,
  restDirection: Vector3,
  restRotation: Quaternion
): Quaternion {
  const currentDir = childPos.clone().sub(parentPos).normalize();
  const deltaRotation = getRotationBetweenVectors(restDirection, currentDir);

  // Apply delta rotation to rest pose
  return restRotation.clone().multiply(deltaRotation);
}

/**
 * Represents the full pose data extracted from MediaPipe landmarks
 */
export interface PoseData {
  // Core positions
  hipCenter: Vector3;
  shoulderCenter: Vector3;

  // Spine/torso
  spineRotation: Quaternion;

  // Head
  headRotation: Quaternion;

  // Left arm
  leftShoulderPos: Vector3;
  leftElbowPos: Vector3;
  leftWristPos: Vector3;
  leftUpperArmRotation: Quaternion;
  leftLowerArmRotation: Quaternion;

  // Right arm
  rightShoulderPos: Vector3;
  rightElbowPos: Vector3;
  rightWristPos: Vector3;
  rightUpperArmRotation: Quaternion;
  rightLowerArmRotation: Quaternion;

  // Left leg
  leftHipPos: Vector3;
  leftKneePos: Vector3;
  leftAnklePos: Vector3;
  leftUpperLegRotation: Quaternion;
  leftLowerLegRotation: Quaternion;

  // Right leg
  rightHipPos: Vector3;
  rightKneePos: Vector3;
  rightAnklePos: Vector3;
  rightUpperLegRotation: Quaternion;
  rightLowerLegRotation: Quaternion;

  // Overall body
  bodyPosition: Vector3;
  bodyScale: number;
}

/**
 * Rest pose directions for a standard T-pose humanoid skeleton
 * These are the default bone directions when the model is in T-pose
 */
export const REST_DIRECTIONS = {
  spine: new Vector3(0, 1, 0),           // Spine points up
  neck: new Vector3(0, 1, 0),            // Neck points up
  head: new Vector3(0, 1, 0),            // Head points up

  // Arms in T-pose extend horizontally
  leftUpperArm: new Vector3(-1, 0, 0),   // Left arm points left
  leftLowerArm: new Vector3(-1, 0, 0),   // Left forearm points left
  rightUpperArm: new Vector3(1, 0, 0),   // Right arm points right
  rightLowerArm: new Vector3(1, 0, 0),   // Right forearm points right

  // Legs point down
  leftUpperLeg: new Vector3(0, -1, 0),
  leftLowerLeg: new Vector3(0, -1, 0),
  rightUpperLeg: new Vector3(0, -1, 0),
  rightLowerLeg: new Vector3(0, -1, 0),
};

/**
 * Extract pose data from MediaPipe landmarks
 */
export function extractPoseData(
  landmarks: NormalizedLandmark[],
  restRotations: Map<string, Quaternion>,
  scale: number = 2
): PoseData {
  const L = MP_LANDMARKS;

  // Extract key positions
  const leftShoulder = landmarkToWorld(landmarks[L.LEFT_SHOULDER], scale);
  const rightShoulder = landmarkToWorld(landmarks[L.RIGHT_SHOULDER], scale);
  const leftElbow = landmarkToWorld(landmarks[L.LEFT_ELBOW], scale);
  const rightElbow = landmarkToWorld(landmarks[L.RIGHT_ELBOW], scale);
  const leftWrist = landmarkToWorld(landmarks[L.LEFT_WRIST], scale);
  const rightWrist = landmarkToWorld(landmarks[L.RIGHT_WRIST], scale);
  const leftHip = landmarkToWorld(landmarks[L.LEFT_HIP], scale);
  const rightHip = landmarkToWorld(landmarks[L.RIGHT_HIP], scale);
  const leftKnee = landmarkToWorld(landmarks[L.LEFT_KNEE], scale);
  const rightKnee = landmarkToWorld(landmarks[L.RIGHT_KNEE], scale);
  const leftAnkle = landmarkToWorld(landmarks[L.LEFT_ANKLE], scale);
  const rightAnkle = landmarkToWorld(landmarks[L.RIGHT_ANKLE], scale);
  const nose = landmarkToWorld(landmarks[L.NOSE], scale);
  const leftEar = landmarkToWorld(landmarks[L.LEFT_EAR], scale);
  const rightEar = landmarkToWorld(landmarks[L.RIGHT_EAR], scale);

  // Calculate centers
  const hipCenter = leftHip.clone().add(rightHip).multiplyScalar(0.5);
  const shoulderCenter = leftShoulder.clone().add(rightShoulder).multiplyScalar(0.5);

  // Body position (use hip center as root)
  const bodyPosition = hipCenter.clone();

  // Calculate body scale from shoulder width
  const shoulderWidth = leftShoulder.distanceTo(rightShoulder);
  const bodyScale = shoulderWidth * 2.5; // Tune this multiplier

  // --- Spine rotation ---
  const spineDir = shoulderCenter.clone().sub(hipCenter).normalize();
  const spineRotation = getRotationBetweenVectors(REST_DIRECTIONS.spine, spineDir);

  // --- Head rotation ---
  const earCenter = leftEar.clone().add(rightEar).multiplyScalar(0.5);
  const headDir = nose.clone().sub(earCenter).normalize();
  // Head forward is -Z in most skeletons
  const headForward = new Vector3(0, 0, -1);
  const headRotation = getRotationBetweenVectors(headForward, headDir);

  // --- Left arm ---
  const leftUpperArmDir = leftElbow.clone().sub(leftShoulder).normalize();
  const leftLowerArmDir = leftWrist.clone().sub(leftElbow).normalize();

  const leftUpperArmRest = restRotations.get('leftUpperArm') || new Quaternion();
  const leftLowerArmRest = restRotations.get('leftLowerArm') || new Quaternion();

  const leftUpperArmDelta = getRotationBetweenVectors(REST_DIRECTIONS.leftUpperArm, leftUpperArmDir);
  const leftLowerArmDelta = getRotationBetweenVectors(REST_DIRECTIONS.leftLowerArm, leftLowerArmDir);

  const leftUpperArmRotation = leftUpperArmRest.clone().multiply(leftUpperArmDelta);
  const leftLowerArmRotation = leftLowerArmRest.clone().multiply(leftLowerArmDelta);

  // --- Right arm ---
  const rightUpperArmDir = rightElbow.clone().sub(rightShoulder).normalize();
  const rightLowerArmDir = rightWrist.clone().sub(rightElbow).normalize();

  const rightUpperArmRest = restRotations.get('rightUpperArm') || new Quaternion();
  const rightLowerArmRest = restRotations.get('rightLowerArm') || new Quaternion();

  const rightUpperArmDelta = getRotationBetweenVectors(REST_DIRECTIONS.rightUpperArm, rightUpperArmDir);
  const rightLowerArmDelta = getRotationBetweenVectors(REST_DIRECTIONS.rightLowerArm, rightLowerArmDir);

  const rightUpperArmRotation = rightUpperArmRest.clone().multiply(rightUpperArmDelta);
  const rightLowerArmRotation = rightLowerArmRest.clone().multiply(rightLowerArmDelta);

  // --- Left leg ---
  const leftUpperLegDir = leftKnee.clone().sub(leftHip).normalize();
  const leftLowerLegDir = leftAnkle.clone().sub(leftKnee).normalize();

  const leftUpperLegRest = restRotations.get('leftUpperLeg') || new Quaternion();
  const leftLowerLegRest = restRotations.get('leftLowerLeg') || new Quaternion();

  const leftUpperLegDelta = getRotationBetweenVectors(REST_DIRECTIONS.leftUpperLeg, leftUpperLegDir);
  const leftLowerLegDelta = getRotationBetweenVectors(REST_DIRECTIONS.leftLowerLeg, leftLowerLegDir);

  const leftUpperLegRotation = leftUpperLegRest.clone().multiply(leftUpperLegDelta);
  const leftLowerLegRotation = leftLowerLegRest.clone().multiply(leftLowerLegDelta);

  // --- Right leg ---
  const rightUpperLegDir = rightKnee.clone().sub(rightHip).normalize();
  const rightLowerLegDir = rightAnkle.clone().sub(rightKnee).normalize();

  const rightUpperLegRest = restRotations.get('rightUpperLeg') || new Quaternion();
  const rightLowerLegRest = restRotations.get('rightLowerLeg') || new Quaternion();

  const rightUpperLegDelta = getRotationBetweenVectors(REST_DIRECTIONS.rightUpperLeg, rightUpperLegDir);
  const rightLowerLegDelta = getRotationBetweenVectors(REST_DIRECTIONS.rightLowerLeg, rightLowerLegDir);

  const rightUpperLegRotation = rightUpperLegRest.clone().multiply(rightUpperLegDelta);
  const rightLowerLegRotation = rightLowerLegRest.clone().multiply(rightLowerLegDelta);

  return {
    hipCenter,
    shoulderCenter,
    spineRotation,
    headRotation,

    leftShoulderPos: leftShoulder,
    leftElbowPos: leftElbow,
    leftWristPos: leftWrist,
    leftUpperArmRotation,
    leftLowerArmRotation,

    rightShoulderPos: rightShoulder,
    rightElbowPos: rightElbow,
    rightWristPos: rightWrist,
    rightUpperArmRotation,
    rightLowerArmRotation,

    leftHipPos: leftHip,
    leftKneePos: leftKnee,
    leftAnklePos: leftAnkle,
    leftUpperLegRotation,
    leftLowerLegRotation,

    rightHipPos: rightHip,
    rightKneePos: rightKnee,
    rightAnklePos: rightAnkle,
    rightUpperLegRotation,
    rightLowerLegRotation,

    bodyPosition,
    bodyScale,
  };
}

/**
 * Smoothly interpolate between two quaternions
 */
export function slerpQuaternion(from: Quaternion, to: Quaternion, t: number): Quaternion {
  return from.clone().slerp(to, t);
}

/**
 * Smoothly interpolate between two vectors
 */
export function lerpVector3(from: Vector3, to: Vector3, t: number): Vector3 {
  return from.clone().lerp(to, t);
}
