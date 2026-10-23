import { useEffect, useRef, useState } from 'react';

const PLAYER_URI_PREFIX = 'adventure://player/';

/**
 * Camera QR scanning for World Node terminals. The returned videoRef must be
 * attached to a <video> rendered only while cameraActive is true; the stream
 * is attached after that element mounts.
 */
export function useQrScanner(onDetected: (credentialValue: string) => void) {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onDetectedRef = useRef(onDetected);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  });

  const stopCamera = () => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    scanIntervalRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const startDetection = () => {
    let detector: any = null;
    if ('BarcodeDetector' in window) {
      try {
        detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      } catch {
        detector = null;
      }
    }
    if (!detector) {
      setCameraError('此瀏覽器不支援 QR 自動辨識，請改用手動輸入。');
      return;
    }

    scanIntervalRef.current = setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;
      try {
        const barcodes = await detector.detect(video);
        if (barcodes.length > 0) {
          let token = String(barcodes[0].rawValue).trim();
          if (token.startsWith(PLAYER_URI_PREFIX)) {
            token = token.slice(PLAYER_URI_PREFIX.length);
          }
          stopCamera();
          onDetectedRef.current(token);
        }
      } catch {
        // ignore detector error
      }
    }, 400);
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      setCameraActive(true);
      startDetection();
    } catch (err: any) {
      setCameraError(err?.message || '無法開啟相機，請確認瀏覽器相機權限或使用手動輸入。');
      setCameraActive(false);
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!cameraActive || !video || !streamRef.current) return;
    video.srcObject = streamRef.current;
    video.play().catch(() => {
      // autoPlay + muted normally starts playback; ignore interrupted play()
    });
  }, [cameraActive]);

  useEffect(() => stopCamera, []);

  return { videoRef, cameraActive, cameraError, startCamera, stopCamera };
}
