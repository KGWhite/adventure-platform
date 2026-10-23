import { useEffect, useRef, useState } from 'react';
import { playScanFeedback } from '../utils/scanFeedback.js';

interface QrScannerOptions {
  /** Keep the camera running after a detection (action card mode). */
  continuous?: boolean;
  /** Frame detection interval in milliseconds. */
  intervalMs?: number;
  /** In continuous mode, ignore the same payload within this window. */
  dedupeMs?: number;
}

/**
 * Camera QR scanning for World Node terminals. The returned videoRef must be
 * attached to a <video> rendered only while cameraActive is true; the stream
 * is attached after that element mounts. onDetected receives the raw payload
 * (see utils/scanPayload.ts) right after local scan feedback has played.
 */
export function useQrScanner(
  onDetected: (payload: string) => void,
  { continuous = false, intervalMs = 400, dedupeMs = 2000 }: QrScannerOptions = {},
) {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastDetectionRef = useRef<{ payload: string; at: number } | null>(null);
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

  const handleDetection = (payload: string) => {
    const now = Date.now();
    const last = lastDetectionRef.current;
    if (continuous && last && last.payload === payload && now - last.at < dedupeMs) {
      return;
    }
    lastDetectionRef.current = { payload, at: now };
    if (!continuous) stopCamera();
    playScanFeedback();
    onDetectedRef.current(payload);
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

    let detecting = false;
    scanIntervalRef.current = setInterval(async () => {
      const video = videoRef.current;
      if (detecting || !video || video.readyState < 2) return;
      detecting = true;
      try {
        const barcodes = await detector.detect(video);
        if (barcodes.length > 0) {
          handleDetection(String(barcodes[0].rawValue).trim());
        }
      } catch {
        // ignore detector error
      } finally {
        detecting = false;
      }
    }, intervalMs);
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
