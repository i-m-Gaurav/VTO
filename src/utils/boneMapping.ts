import type { NormalizedLandmark } from '@mediapipe/pose';
import { Vector3, Quaternion, Bone, Skeleton } from 'three';

// MediaPipe landmark indices
export const LANDMARKS = {
  NOSE: 0,
  LEFT_EYE: 2,
  RIGHT_EYE: 5,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
};

/**
 * Convert MediaPipe normalized landmark to Three.js world-space position.
 * MediaPipe: x=[0,1] left→right, y=[0,1] top→bottom, z=depth
 * We map to a coordinate system where the body is roughly centered at origin.
 */
export function landmarkTo3D(landmark: NormalizedLandmark): Vector3 {
  return new Vector3(
    -(landmark.x - 0.5) * 2,   // Mirror X for selfie view
    -(landmark.y - 0.5) * 2,   // Invert Y
    -(landmark.z || 0) * 2     // Z depth from MediaPipe
  );
}

/**
 * Convert MediaPipe landmark to screen-space for orthographic overlay.
 */
export function landmarkToScreen(
  landmark: NormalizedLandmark,
  aspect: number = 16 / 9
): Vector3 {
  return new Vector3(
    -(landmark.x - 0.5) * 2 * aspect,
    -(landmark.y - 0.5) * 2,
    0
  );
}

export function landmarkMidpoint(
  l1: NormalizedLandmark,
  l2: NormalizedLandmark,
  aspect: number = 16 / 9
): Vector3 {
  const v1 = landmarkToScreen(l1, aspect);
  const v2 = landmarkToScreen(l2, aspect);
  return new Vector3().addVectors(v1, v2).multiplyScalar(0.5);
}

export function shoulderTiltAngle(landmarks: NormalizedLandmark[]): number {
  const left = landmarks[LANDMARKS.LEFT_SHOULDER];
  const right = landmarks[LANDMARKS.RIGHT_SHOULDER];
  const dy = right.y - left.y;
  const dx = right.x - left.x;
  return Math.atan2(dy, dx);
}

export function normalizedShoulderWidth(landmarks: NormalizedLandmark[]): number {
  const left = landmarks[LANDMARKS.LEFT_SHOULDER];
  const right = landmarks[LANDMARKS.RIGHT_SHOULDER];
  const dx = left.x - right.x;
  const dy = left.y - right.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate the body turn angle (Y rotation) from shoulder depth difference.
 * When one shoulder is closer to camera than the other, the body is turned.
 */
export function bodyTurnAngle(landmarks: NormalizedLandmark[]): number {
  const left = landmarks[LANDMARKS.LEFT_SHOULDER];
  const right = landmarks[LANDMARKS.RIGHT_SHOULDER];
  const dz = (left.z || 0) - (right.z || 0);
  // Shoulder depth difference maps to Y rotation
  // Scale factor tuned for natural feel
  return Math.atan2(dz, normalizedShoulderWidth(landmarks)) * 1.5;
}

/**
 * Compute a quaternion that rotates from one direction to another.
 */
export function quaternionFromDirections(from: Vector3, to: Vector3): Quaternion {
  const q = new Quaternion();
  const f = from.clone().normalize();
  const t = to.clone().normalize();
  const dot = f.dot(t);

  if (dot > 0.9999) {
    return q.identity();
  }
  if (dot < -0.9999) {
    // 180 degree rotation - find a perpendicular axis
    const perp = Math.abs(f.x) < 0.9
      ? new Vector3(1, 0, 0)
      : new Vector3(0, 1, 0);
    const axis = new Vector3().crossVectors(f, perp).normalize();
    return q.setFromAxisAngle(axis, Math.PI);
  }

  const axis = new Vector3().crossVectors(f, t).normalize();
  const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
  return q.setFromAxisAngle(axis, angle);
}

/**
 * Find a bone by name in a skeleton (case-insensitive).
 */
export function findBone(skeleton: Skeleton, name: string): Bone | null {
  return skeleton.bones.find(
    b => b.name.toLowerCase() === name.toLowerCase()
  ) || null;
}

/**
 * Calculate the direction vector between two MediaPipe landmarks.
 */
export function landmarkDirection(
  from: NormalizedLandmark,
  to: NormalizedLandmark
): Vector3 {
  const f = landmarkTo3D(from);
  const t = landmarkTo3D(to);
  return t.sub(f).normalize();
}
