import { useEffect } from 'react';
import type { Results } from '@mediapipe/pose';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { POSE_CONNECTIONS } from '@mediapipe/pose';

interface Props {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  landmarks: Results | null;
}

/**
 * Draws the MediaPipe skeleton onto the provided canvas element.
 * Does NOT render its own canvas — the parent must create one and pass canvasRef.
 */
export function BodyOverlay({ canvasRef, landmarks }: Props) {
  useEffect(() => {
    if (!canvasRef.current || !landmarks?.poseLandmarks) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear previous drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw pose connections (skeleton lines)
    drawConnectors(ctx, landmarks.poseLandmarks, POSE_CONNECTIONS, {
      color: '#00FF00',
      lineWidth: 3,
    });

    // Draw pose landmarks (joint points)
    drawLandmarks(ctx, landmarks.poseLandmarks, {
      color: '#FF0000',
      radius: 4,
      fillColor: '#FF0000',
    });
  }, [canvasRef, landmarks]);

  // No DOM output — drawing is side-effect only
  return null;
}
