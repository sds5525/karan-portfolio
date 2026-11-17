import { useEffect, useRef } from 'react';
import { DiscEntranceEffect } from '../../lib/particles/entrance';
import styles from './DiscEntrance.module.css';

interface DiscEntranceProps {
  onComplete?: () => void;
}

export function DiscEntrance({ onComplete }: DiscEntranceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const effect = new DiscEntranceEffect(canvas, () => {
      onCompleteRef.current?.();
    });
    effect.start();

    return () => {
      effect.stop();
    };
  }, []);

  return <canvas ref={canvasRef} id="cv2" className={styles.cv2} />;
}

