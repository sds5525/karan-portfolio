import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HomeParticles, hasPlayedHomeIntro } from '../lib/particles/home';
import { loadSceneHi } from '../lib/particles/cloud';
import { PointScene } from '../components/PointScene/PointScene';
import styles from './HomeView.module.css';

function checkWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl'))
    );
  } catch {
    return false;
  }
}

export default function HomeView() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const particlesRef = useRef<HomeParticles | null>(null);
  const isLeavingRef = useRef(false);
  const leavePointSceneRef = useRef<(() => void) | null>(null);
  const pointerPosRef = useRef({ x: -999, y: -999 });

  const intro = !hasPlayedHomeIntro() && !matchMedia('(prefers-reduced-motion: reduce)').matches;

  const [positions, setPositions] = useState<Float32Array | null>(null);
  const [useFallback, setUseFallback] = useState(false);
  const [showPointScene, setShowPointScene] = useState(!intro);
  const [playBurst, setPlayBurst] = useState(false);

  const positionsRef = useRef<Float32Array | null>(null);
  positionsRef.current = positions;
  const fallbackRef = useRef(false);
  fallbackRef.current = useFallback;

  // 1. Immediately start fetching scene-hi.bin
  useEffect(() => {
    if (!checkWebGL()) {
      setUseFallback(true);
      return;
    }

    loadSceneHi()
      .then((pos) => {
        setPositions(pos);
      })
      .catch((err) => {
        console.warn('Failed to load scene-hi.bin, using 2D fallback:', err);
        setUseFallback(true);
      });
  }, []);

  // 2. Setup 2D Canvas for MASALA logo glitch (or 2D fallback)
  useEffect(() => {
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    if (!canvas || !section) return;

    isLeavingRef.current = false;
    section.classList.remove(styles.leaving);

    const onLeaveComplete = () => {
      navigate('/work', { state: { fromHome: true } });
    };

    // When the 2200 ms logo intro finishes
    const onLogoBurst = (): boolean => {
      if (fallbackRef.current) {
        return false; // Proceed to 2D particle portrait fallback
      }

      if (positionsRef.current) {
        if (canvasRef.current) canvasRef.current.style.display = 'none';
        setShowPointScene(true);
        setPlayBurst(true);
        return true; // HomeParticles stops
      }

      // If positions are still downloading, wait for promise then switch
      loadSceneHi()
        .then((pos) => {
          setPositions(pos);
          if (canvasRef.current) canvasRef.current.style.display = 'none';
          setShowPointScene(true);
          setPlayBurst(true);
        })
        .catch(() => {
          setUseFallback(true);
        });

      return true;
    };

    if (intro || fallbackRef.current) {
      canvas.style.display = 'block';
      const particles = new HomeParticles(canvas, onLeaveComplete, onLogoBurst);
      particlesRef.current = particles;
      particles.start();
    } else {
      canvas.style.display = 'none';
    }

    const triggerLeave = () => {
      if (isLeavingRef.current) return;
      if (particlesRef.current && particlesRef.current.isIntroActive()) return;

      isLeavingRef.current = true;
      section.classList.add(styles.leaving);

      if (leavePointSceneRef.current) {
        leavePointSceneRef.current();
      } else if (particlesRef.current) {
        particlesRef.current.leave();
      } else {
        onLeaveComplete();
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY > 8) triggerLeave();
    };

    let ty0 = 0;
    const handleTouchStart = (e: TouchEvent) => {
      ty0 = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (ty0 - e.touches[0].clientY > 40) triggerLeave();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowDown', 'PageDown', ' '].includes(e.key)) {
        e.preventDefault();
        triggerLeave();
      }
    };

    const handleResize = () => {
      particlesRef.current?.resize();
    };

    window.addEventListener('resize', handleResize);
    section.addEventListener('wheel', handleWheel, { passive: true });
    section.addEventListener('touchstart', handleTouchStart, { passive: true });
    section.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      particlesRef.current?.stop();
      particlesRef.current = null;
      window.removeEventListener('resize', handleResize);
      section.removeEventListener('wheel', handleWheel);
      section.removeEventListener('touchstart', handleTouchStart);
      section.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [intro, navigate]);

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = -(e.clientY / window.innerHeight) * 2 + 1;
    pointerPosRef.current = { x, y };
    particlesRef.current?.setPointer(e.clientX, e.clientY);
  };

  const handlePointerLeave = () => {
    pointerPosRef.current = { x: -999, y: -999 };
    particlesRef.current?.setPointer(-999, -999);
  };

  const handleViewWorkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (particlesRef.current && particlesRef.current.isIntroActive()) {
      navigate('/work', { state: { fromHome: true } });
    } else {
      if (isLeavingRef.current) return;
      isLeavingRef.current = true;
      sectionRef.current?.classList.add(styles.leaving);

      if (leavePointSceneRef.current) {
        leavePointSceneRef.current();
      } else if (particlesRef.current) {
        particlesRef.current.leave();
      } else {
        navigate('/work', { state: { fromHome: true } });
      }
    }
  };

  return (
    <section
      ref={sectionRef}
      id="home"
      className={styles.home}
      style={{ '--hd': intro ? '3.8s' : '1.6s' } as React.CSSProperties}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {/* 2D Canvas for MASALA logo glitch (and 2D portrait fallback) */}
      <canvas ref={canvasRef} id="cv" className={styles.cv} />

      {/* Three.js Point Scene */}
      {showPointScene && positions && !useFallback && (
        <PointScene
          positions={positions}
          playBurst={playBurst}
          onLeaveComplete={() => navigate('/work', { state: { fromHome: true } })}
          leaveRef={leavePointSceneRef}
          pointerPosRef={pointerPosRef}
        />
      )}

      <span className={styles.hn}>Karan S Achar</span>
      <span className={styles.hr}>Creative Developer</span>

      <div className={styles.credit}>
        <a
          href="https://sketchfab.com/3d-models/king-mountain-cairn-point-cloud-surroundings-bbfa503fded6440da262482f148dd974"
          target="_blank"
          rel="noopener"
        >
          Cairn scan — SVickers · CC BY 4.0
        </a>
      </div>

      <div className={styles.hbar}>
        <a href="/work" onClick={handleViewWorkClick}>
          View work →
        </a>
      </div>
    </section>
  );
}
