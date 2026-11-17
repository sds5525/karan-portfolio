import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { projects } from '../data/projects';

const pad = (n: number) => String(n + 1).padStart(2, '0');
const ez = (x: number) => 1 - Math.pow(1 - x, 3);
const clamp = (v: number) => Math.max(0, Math.min(projects.length - 1, v));

interface UseCarouselProps {
  workRef: React.RefObject<HTMLElement | null>;
  infoRef: React.RefObject<HTMLElement | null>;
  itemRefs: React.MutableRefObject<(HTMLElement | null)[]>;
  setCounterText: (text: string) => void;
}

export function useCarousel({ workRef, infoRef, itemRefs, setCounterText }: UseCarouselProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { fromHome?: boolean; initialIndex?: number } | null;
  const fromHome = Boolean(locationState?.fromHome);
  const initialIndex = typeof locationState?.initialIndex === 'number'
    ? Math.max(0, Math.min(projects.length - 1, locationState.initialIndex))
    : 0;

  const startIdx = fromHome ? 0 : initialIndex;

  // Only React state allowed: current rounded index
  const [activeIndex, setActiveIndex] = useState(startIdx);

  // Per-frame animation values in useRef
  const posRef = useRef(startIdx);
  const targetRef = useRef(startIdx);
  const shownRef = useRef(fromHome ? -1 : startIdx);
  const ipRef = useRef(fromHome ? 0 : 1);
  const ipTRef = useRef(1);
  const lockRef = useRef(fromHome ? performance.now() + 450 : 0);
  const idleRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const downRef = useRef(false);
  const movedRef = useRef(false);
  const sxRef = useRef(0);
  const syRef = useRef(0);

  // When arriving from home, initialize intro animation
  useEffect(() => {
    if (fromHome) {
      ipRef.current = 0;
      ipTRef.current = 1;
      lockRef.current = performance.now() + 450;
    }
  }, [fromHome]);

  // Initialize counter for non-fromHome arrivals
  useEffect(() => {
    if (!fromHome) {
      setCounterText(pad(startIdx) + ' / ' + pad(projects.length - 1));
    }
  }, [fromHome, startIdx, setCounterText]);

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
      if (ipTRef.current < 1 || (targetRef.current < 0.05 && dy < 0)) {
        if (ipTRef.current <= 0.001 && dy < -40) {
          navigate('/');
          return;
        }
        const was = ipTRef.current;
        ipTRef.current = Math.max(0, Math.min(1, ipTRef.current + dy * 0.0011));
        if (was < 1 && ipTRef.current >= 1) {
          lockRef.current = performance.now() + 450;
        }
        return;
      }
      if (performance.now() < lockRef.current) return;
      targetRef.current = clamp(targetRef.current + dy * 0.0016);
      settle();
    },
    [navigate, settle]
  );

  const onPointerDown = useCallback((e: PointerEvent) => {
    downRef.current = true;
    movedRef.current = false;
    sxRef.current = e.clientX;
    syRef.current = e.clientY;
  }, []);

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!downRef.current) return;
      const dx = e.clientX - sxRef.current;
      const dy = e.clientY - syRef.current;
      if (Math.abs(dx) + Math.abs(dy) > 6) {
        movedRef.current = true;
      }
      if (ipTRef.current < 1 || (targetRef.current < 0.05 && dy > 0)) {
        ipTRef.current = Math.max(0, Math.min(1, ipTRef.current - (dy / window.innerHeight) * 1.3));
        sxRef.current = e.clientX;
        syRef.current = e.clientY;
        return;
      }
      const m = Math.abs(dx) > Math.abs(dy) ? dx : dy;
      targetRef.current = clamp(targetRef.current - (m / window.innerWidth) * 1.5);
      sxRef.current = e.clientX;
      syRef.current = e.clientY;
      settle();
    },
    [settle]
  );

  const onPointerUp = useCallback(() => {
    downRef.current = false;
    settle();
  }, [settle]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (['ArrowRight', 'ArrowDown'].includes(e.key)) {
        if (ipTRef.current < 1) ipTRef.current = Math.min(1, ipTRef.current + 0.35);
        else targetRef.current = clamp(Math.round(targetRef.current) + 1);
      }
      if (['ArrowLeft', 'ArrowUp'].includes(e.key)) {
        if (ipTRef.current < 1 || targetRef.current < 0.05) ipTRef.current = Math.max(0, ipTRef.current - 0.35);
        else targetRef.current = clamp(Math.round(targetRef.current) - 1);
      }
      if (e.key === 'Enter') {
        const idx = Math.round(targetRef.current);
        const p = projects[idx];
        if (p) {
          navigate(`/work/${p.slug}`);
        }
      }
    },
    [navigate]
  );

  const handleDiscClick = useCallback(
    (index: number) => {
      if (!movedRef.current) {
        const p = projects[index];
        if (p) {
          navigate(`/work/${p.slug}`);
        }
      }
    },
    [navigate]
  );

  useEffect(() => {
    let rafId: number;

    const frame = () => {
      posRef.current += (targetRef.current - posRef.current) * 0.11;
      const W = window.innerWidth;
      const H = window.innerHeight;
      ipRef.current += (ipTRef.current - ipRef.current) * 0.1;

      const infoEl = infoRef.current;
      if (infoEl) {
        infoEl.style.opacity = String(Math.min(1, Math.max(0, (ipRef.current - 0.6) / 0.35)));
      }

      const items = itemRefs.current;
      for (let i = 0; i < items.length; i++) {
        const el = items[i];
        if (!el) continue;
        const d = i - posRef.current;
        const a = Math.abs(d);
        el.style.visibility = a > 3 ? 'hidden' : 'visible';
        el.style.zIndex = String(100 - Math.round(a * 10));
        const ki = ez(
          Math.max(0, Math.min(1, a < 0.5 ? ipRef.current / 0.65 : (ipRef.current - 0.5 - (a - 1) * 0.05) / 0.3))
        );
        el.style.opacity = String(a < 0.5 ? Math.min(1, ki * 6) : Math.min(1, ki * 2.5));
        el.style.transform = `translate(-50%,-50%) translate3d(${d * W * 0.36}px,${
          -d * H * 0.13 + (1 - ki) * (a < 0.5 ? H * 1.05 : 70)
        }px,0) scale(${(1 - Math.min(a, 2.4) * 0.13) * (a < 0.5 ? 0.8 + 0.2 * ki : 1)})`;

        const disc = el.children[0] as HTMLElement | undefined;
        if (disc) {
          disc.style.transform = `perspective(1100px) rotate(${
            -14 - d * 12 - (a < 0.5 ? (1 - ki) * 260 : 0)
          }deg) rotateX(${Math.min(a, 2) * 10 + (a < 0.5 ? (1 - ki) * 62 : 0)}deg) rotateY(${-d * 8}deg)`;
        }

        const note = el.children[1] as HTMLElement | undefined;
        if (note) {
          note.style.opacity = String(
            Math.max(0, 1 - a * 2.2) * Math.min(1, Math.max(0, (ipRef.current - 0.6) / 0.35))
          );
        }
      }

      const r = Math.round(posRef.current);
      if (r !== shownRef.current) {
        shownRef.current = r;
        const safeR = Math.max(0, Math.min(projects.length - 1, r));
        setActiveIndex(safeR);
        setCounterText(pad(safeR) + ' / ' + pad(projects.length - 1));
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [infoRef, itemRefs, setCounterText]);

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

  return { activeIndex, handleDiscClick };
}
