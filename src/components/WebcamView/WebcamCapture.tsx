import { useRef } from 'react';
import { useBodyTracking } from '../../hooks/useBodyTracking';
import { BodyOverlay } from './BodyOverlay';

export function WebcamCapture() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarks = useBodyTracking(videoRef);

  return (
    <div className="relative w-full h-full bg-black">
      {/* Webcam video */}
      <video
        ref={videoRef}
        className="absolute top-0 left-0 w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
        playsInline
        autoPlay
        muted
      />

      {/* Skeleton overlay canvas — mirrored to match video */}
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
        style={{ transform: 'scaleX(-1)' }}
        width={640}
        height={480}
      />
      <BodyOverlay canvasRef={canvasRef} landmarks={landmarks} />

      {/* Status indicator */}
      <div className="absolute top-4 left-4 bg-black/60 backdrop-blur px-4 py-2 rounded-lg">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${landmarks?.poseLandmarks ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`} />
          <span className="text-white text-sm font-medium">
            {landmarks?.poseLandmarks ? 'Body Detected' : 'Detecting...'}
          </span>
        </div>
      </div>
    </div>
  );
}
