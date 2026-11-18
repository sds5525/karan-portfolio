import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { HomeParticles, hasPlayedHomeIntro } from '../lib/particles/home';
import styles from './HomeView.module.css';

export default function HomeView() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const particlesRef = useRef<HomeParticles | null>(null);
  const isLeavingRef = useRef(false);

  const intro = !hasPlayedHomeIntro();

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    if (!canvas || !section) return;

    isLeavingRef.current = false;
    section.classList.remove(styles.leaving);

    const onLeaveComplete = () => {
      navigate('/work', { state: { fromHome: true } });
    };

    const particles = new HomeParticles(canvas, onLeaveComplete);
    particlesRef.current = particles;
    particles.start();

    const triggerLeave = () => {
      if (isLeavingRef.current) return;
      if (!particlesRef.current || particlesRef.current.isIntroActive()) return;
      isLeavingRef.current = true;
      section.classList.add(styles.leaving);
      particlesRef.current.leave();
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
      particles.resize();
    };

    window.addEventListener('resize', handleResize);
    section.addEventListener('wheel', handleWheel, { passive: true });
    section.addEventListener('touchstart', handleTouchStart, { passive: true });
    section.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      particles.stop();
      particlesRef.current = null;
      window.removeEventListener('resize', handleResize);
      section.removeEventListener('wheel', handleWheel);
      section.removeEventListener('touchstart', handleTouchStart);
      section.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigate]);

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    particlesRef.current?.setPointer(e.clientX, e.clientY);
  };

  const handlePointerLeave = () => {
    particlesRef.current?.setPointer(-999, -999);
  };

  const handleViewWorkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (!particlesRef.current || particlesRef.current.isIntroActive()) {
      navigate('/work', { state: { fromHome: true } });
    } else {
      if (isLeavingRef.current) return;
      isLeavingRef.current = true;
      sectionRef.current?.classList.add(styles.leaving);
      particlesRef.current.leave();
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
      <canvas ref={canvasRef} id="cv" className={styles.cv} />
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
