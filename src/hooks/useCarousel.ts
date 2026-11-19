import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { projects } from '../data/projects';

const pad = (n: number) => String(n + 1).padStart(2, '0');
const clamp = (v: number) => Math.max(0, Math.min(projects.length - 1, v));

interface UseCarouselProps {
  workRef: React.RefObject<HTMLElement | null>;
  infoRef: React.RefObject<HTMLElement | null>;
  setCounterText: (text: string) => void;
  fromHome?: boolean;
}

export function useCarousel({
  workRef,
  infoRef,
  setCounterText,
  fromHome: fromHomeProp,
}: UseCarouselProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { fromHome?: boolean; initialIndex?: number } | null;

  // Capture fromHome and initialIndex once on mount so they remain stable
  const fromHome = useRef(
    fromHomeProp !== undefined ? fromHomeProp : Boolean(locationState?.fromHome)
  ).current;
  const initialIndex = useRef(
    typeof locationState?.initialIndex === 'number'
      ? Math.max(0, Math.min(projects.length - 1, locationState.initialIndex))
      : 0
  ).current;

  const startIdx = fromHome ? 0 : initialIndex;

  // Only React state allowed: current rounded index
  const [activeIndex, setActiveIndex] = useState(startIdx);

  // Per-frame animation values in useRef
  const posRef = useRef(startIdx);
  const targetRef = useRef(startIdx);
  const idleRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const downRef = useRef(false);
  const movedRef = useRef(false);
  const sxRef = useRef(0);
  const syRef = useRef(0);

  // Touch drag tracking for mobile
  const touchStartTargetRef = useRef(0);
  const touchStartXRef = useRef(0);
  const isTouchDragRef = useRef(false);

  // Fade in infoRef during intro or set visible
  useEffect(() => {
    const infoEl = infoRef.current;
    if (!infoEl) return;

    if (!fromHome) {
      infoEl.style.opacity = '1';
      setCounterText(pad(startIdx) + ' / ' + pad(projects.length - 1));
      return;
    }

    infoEl.style.opacity = '0';
    setCounterText(pad(0) + ' / ' + pad(projects.length - 1));

    const startTime = performance.now();
    let rafId: number;

    const fadeStep = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      const opacity = Math.min(1, Math.max(0, (elapsed - 0.4) / 0.6));
      infoEl.style.opacity = String(opacity);
      if (elapsed < 1.2) {
        rafId = requestAnimationFrame(fadeStep);
      }
    };

    rafId = requestAnimationFrame(fadeStep);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [fromHome, startIdx, infoRef, setCounterText]);

  const onActiveIndexChange = useCallback(
    (index: number) => {
      setActiveIndex(index);
      setCounterText(pad(index) + ' / ' + pad(projects.length - 1));
    },
    [setCounterText]
  );

  const settle = useCallback(() => {
    clearTimeout(idleRef.current);
    idleRef.current = setTimeout(() => {
      targetRef.current = Math.round(targetRef.current);
    }, 140);
  }, []);

  const onWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const dy = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      targetRef.current = clamp(targetRef.current + dy * 0.0016);
      settle();
    },
    [settle]
  );

  const onPointerDown = useCallback((e: PointerEvent) => {
    downRef.current = true;
    movedRef.current = false;
    sxRef.current = e.clientX;
    syRef.current = e.clientY;

    const isTouch = e.pointerType === 'touch' || window.innerWidth < 760;
    if (isTouch) {
      isTouchDragRef.current = true;
      touchStartXRef.current = e.clientX;
      touchStartTargetRef.current = targetRef.current;
    } else {
      isTouchDragRef.current = false;
    }
  }, []);

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!downRef.current) return;

      if (isTouchDragRef.current) {
        const totalDx = e.clientX - touchStartXRef.current;
        if (Math.abs(totalDx) > 8) {
          movedRef.current = true;
        }
        // Swiping 25% of the screen width = 1 disc (dx only, ignore dy)
        const deltaDiscs = totalDx / (window.innerWidth * 0.25);
        targetRef.current = clamp(touchStartTargetRef.current - deltaDiscs);
      } else {
        const dx = e.clientX - sxRef.current;
        const dy = e.clientY - syRef.current;
        if (Math.abs(dx) + Math.abs(dy) > 6) {
          movedRef.current = true;
        }

        const m = Math.abs(dx) > Math.abs(dy) ? dx : dy;
        targetRef.current = clamp(targetRef.current - (m / window.innerWidth) * 1.5);
        sxRef.current = e.clientX;
        syRef.current = e.clientY;
        settle();
      }
    },
    [settle]
  );

  const onPointerUp = useCallback(() => {
    if (!downRef.current) return;
    downRef.current = false;
    if (isTouchDragRef.current) {
      isTouchDragRef.current = false;
      // On release, snap to the nearest disc
      targetRef.current = clamp(Math.round(targetRef.current));
    } else {
      settle();
    }
  }, [settle]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (['ArrowRight', 'ArrowDown'].includes(e.key)) {
        targetRef.current = clamp(Math.round(targetRef.current) + 1);
        settle();
      }
      if (['ArrowLeft', 'ArrowUp'].includes(e.key)) {
        targetRef.current = clamp(Math.round(targetRef.current) - 1);
        settle();
      }
      if (e.key === 'Enter') {
        const idx = Math.round(targetRef.current);
        const p = projects[idx];
        if (p) {
          navigate(`/work/${p.slug}`);
        }
      }
    },
    [navigate, settle]
  );

  useEffect(() => {
    const workEl = workRef.current;
    if (!workEl) return;

    workEl.addEventListener('wheel', onWheel, { passive: false });
    workEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      workEl.removeEventListener('wheel', onWheel);
      workEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('keydown', onKeyDown);
      clearTimeout(idleRef.current);
    };
  }, [workRef, onWheel, onPointerDown, onPointerMove, onPointerUp, onKeyDown]);

  return {
    posRef,
    targetRef,
    movedRef,
    activeIndex,
    onActiveIndexChange,
  };
}
