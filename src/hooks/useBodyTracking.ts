import { useEffect, useRef, useState } from 'react';
import { Pose, Results } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';

export function useBodyTracking(videoRef: React.RefObject<HTMLVideoElement>) {
  const [landmarks, setLandmarks] = useState<Results | null>(null);
  const poseRef = useRef<Pose | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const frameCountRef = useRef(0);

  useEffect(() => {
    if (!videoRef.current) return;

    // Initialize MediaPipe Pose
    poseRef.current = new Pose({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    poseRef.current.setOptions({
      modelComplexity: 0, // Use lightweight model (saves ~100MB RAM)
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    poseRef.current.onResults((results: Results) => {
      setLandmarks(results);
    });

    // Start camera with frame throttling
    cameraRef.current = new Camera(videoRef.current, {
      onFrame: async () => {
        // Process every 2nd frame to reduce CPU/RAM usage by ~50%
        frameCountRef.current++;
        if (frameCountRef.current % 2 !== 0) return;

        if (poseRef.current && videoRef.current) {
          await poseRef.current.send({ image: videoRef.current });
        }
      },
      width: 640, // Reduced from 1280 (saves ~4-6GB RAM)
      height: 480, // Reduced from 720
    });

    cameraRef.current.start();

    return () => {
      // Proper cleanup
      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }
      if (poseRef.current) {
        poseRef.current.close();
        poseRef.current = null;
      }
      frameCountRef.current = 0;
    };
  }, [videoRef]);

  return landmarks;
}
