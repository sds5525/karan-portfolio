import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { projects } from '../data/projects';

const pad = (n: number) => String(n + 1).padStart(2, '0');
const clamp = (v: number) => Math.max(0, Math.min(projects.length - 1, v));

export interface TouchGestureState {
  state: 'idle' | 'pending' | 'swiping' | 'holding';
  startX: number;
  startY: number;
  startTime: number;
  startTarget: number;
  touchedIndex: number | null;
  isCentre: boolean;
  holdRotX: number;
  holdRotY: number;
  isHolding: boolean;
  onSelect?: (slug: string, index: number) => void;
}

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

  // Touch gesture state for mobile/coarse pointer
  const touchStateRef = useRef<TouchGestureState>({
    state: 'idle',
    startX: 0,
    startY: 0,
    startTime: 0,
    startTarget: 0,
    touchedIndex: null,
    isCentre: false,
    holdRotX: 0,
    holdRotY: 0,
    isHolding: false,
  });
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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

    const isTouch =
      e.pointerType === 'touch' ||
      window.matchMedia('(pointer: coarse)').matches ||
      window.innerWidth < 760;

    if (isTouch) {
      clearTimeout(holdTimerRef.current);
      touchStateRef.current.state = 'pending';
      touchStateRef.current.startX = e.clientX;
      touchStateRef.current.startY = e.clientY;
      touchStateRef.current.startTime = performance.now();
      touchStateRef.current.startTarget = Math.round(targetRef.current);
      touchStateRef.current.holdRotX = 0;
      touchStateRef.current.holdRotY = 0;
      touchStateRef.current.isHolding = false;

      // Start 150 ms timer: if finger stays still on the centre disc -> HOLD
      holdTimerRef.current = setTimeout(() => {
        if (touchStateRef.current.state === 'pending' && touchStateRef.current.isCentre) {
          touchStateRef.current.state = 'holding';
          touchStateRef.current.isHolding = true;
        }
      }, 150);
    }
  }, []);

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!downRef.current) return;

      const isTouch =
        e.pointerType === 'touch' ||
        window.matchMedia('(pointer: coarse)').matches ||
        window.innerWidth < 760;

      if (isTouch) {
        const dx = e.clientX - touchStateRef.current.startX;
        const dy = e.clientY - touchStateRef.current.startY;
        const dist = Math.hypot(dx, dy);

        if (touchStateRef.current.state === 'pending') {
          // SWIPE: finger moves more than 10 px within the first 150 ms
          if (dist > 10) {
            clearTimeout(holdTimerRef.current);
            touchStateRef.current.state = 'swiping';
            movedRef.current = true;
          }
        }

        if (touchStateRef.current.state === 'swiping') {
          // While dragging, carousel follows only a little:
          // target = start - clamp(dx / width * 0.8, -0.35, 0.35)
          const follow = Math.max(-0.35, Math.min(0.35, (dx / window.innerWidth) * 0.8));
          targetRef.current = clamp(touchStateRef.current.startTarget - follow);
        } else if (touchStateRef.current.state === 'holding') {
          // From then on, disc tilts to follow finger and carousel doesn't move:
          // rotY = clamp(dx / width * 2.2, -0.9, 0.9), rotX = clamp(dy / height * 2.2, -0.9, 0.9)
          touchStateRef.current.holdRotY = Math.max(
            -0.9,
            Math.min(0.9, (dx / window.innerWidth) * 2.2)
          );
          touchStateRef.current.holdRotX = Math.max(
            -0.9,
            Math.min(0.9, (dy / window.innerHeight) * 2.2)
          );
        }
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

  const onPointerUp = useCallback(
    (e: PointerEvent) => {
      if (!downRef.current) return;
      downRef.current = false;
      clearTimeout(holdTimerRef.current);

      const isTouch =
        e.pointerType === 'touch' ||
        window.matchMedia('(pointer: coarse)').matches ||
        window.innerWidth < 760;

      if (isTouch) {
        const elapsed = performance.now() - touchStateRef.current.startTime;
        const dx = e.clientX - touchStateRef.current.startX;
        const dy = e.clientY - touchStateRef.current.startY;
        const dist = Math.hypot(dx, dy);

        if (touchStateRef.current.state === 'holding') {
          // On release, ease back (lerp 0.08) and fade the outline
          touchStateRef.current.state = 'idle';
          touchStateRef.current.isHolding = false;
          touchStateRef.current.holdRotX = 0;
          touchStateRef.current.holdRotY = 0;
        } else if (touchStateRef.current.state === 'swiping') {
          touchStateRef.current.state = 'idle';
          const speed = elapsed > 0 ? Math.abs(dx) / elapsed : 0;
          // if |dx| > 60 px or speed > 0.45 px/ms → move exactly one disc in that direction; otherwise spring back
          if (Math.abs(dx) > 60 || speed > 0.45) {
            const dir = dx < 0 ? 1 : -1;
            targetRef.current = clamp(touchStateRef.current.startTarget + dir);
          } else {
            targetRef.current = touchStateRef.current.startTarget;
          }
          settle();
          setTimeout(() => {
            movedRef.current = false;
          }, 80);
        } else if (touchStateRef.current.state === 'pending') {
          touchStateRef.current.state = 'idle';
          // TAP (under 10 px and under 250 ms):
          if (dist <= 10 && elapsed < 250) {
            const touchedIdx = touchStateRef.current.touchedIndex;
            if (touchedIdx !== null) {
              if (touchStateRef.current.isCentre) {
                // centre disc → open the project
                const p = projects[touchedIdx];
                if (p) {
                  touchStateRef.current.onSelect?.(p.slug, touchedIdx);
                }
              } else {
                // side disc → move to it
                targetRef.current = clamp(touchedIdx);
                settle();
              }
            }
          }
        }

        touchStateRef.current.touchedIndex = null;
        touchStateRef.current.isCentre = false;
      } else {
        settle();
      }
    },
    [settle]
  );

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
      clearTimeout(holdTimerRef.current);
    };
  }, [workRef, onWheel, onPointerDown, onPointerMove, onPointerUp, onKeyDown]);

  return {
    posRef,
    targetRef,
    movedRef,
    activeIndex,
    onActiveIndexChange,
    touchStateRef,
  };
}
