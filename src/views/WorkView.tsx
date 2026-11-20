import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { projects } from '../data/projects';
import { useWorkContext } from '../components/Layout/Layout';
import { InfoPanel } from '../components/InfoPanel/InfoPanel';
import { DiscScene } from '../components/DiscScene/DiscScene';
import { useCarousel } from '../hooks/useCarousel';
import styles from './WorkView.module.css';

export default function WorkView() {
  const { setCounterText } = useWorkContext();
  const location = useLocation();
  const navigate = useNavigate();

  // Capture fromHome once on mount so it stays stable for the life of the view
  const fromHomeRef = useRef(Boolean((location.state as { fromHome?: boolean } | null)?.fromHome));
  const fromHome = fromHomeRef.current;

  // Clear location.state so refresh doesn't replay entrance
  useEffect(() => {
    if (fromHome) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [fromHome, location.pathname, navigate]);

  const workRef = useRef<HTMLElement>(null);
  const infoRef = useRef<HTMLElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);

  const {
    posRef,
    targetRef,
    movedRef,
    activeIndex,
    onActiveIndexChange,
    touchStateRef,
  } = useCarousel({
    workRef,
    infoRef,
    setCounterText,
    fromHome,
  });

  const activeProject = projects[activeIndex];
  const testimonials = activeProject.testimonials ?? [
    { rating: 5, source: activeProject.by, quote: activeProject.note },
  ];

  return (
    <section ref={workRef} className={styles.work} id="work">
      <InfoPanel ref={infoRef} project={activeProject} />
      <DiscScene
        projects={projects}
        posRef={posRef}
        targetRef={targetRef}
        movedRef={movedRef}
        fromHome={fromHome}
        captionRef={captionRef}
        onActiveIndexChange={onActiveIndexChange}
        touchStateRef={touchStateRef}
      />
      <div ref={captionRef} className={styles.captionOverlay}>
        {testimonials.slice(0, 2).map((t, i) => (
          <div key={i} className={styles.captionItem}>
            <div className={styles.captionMeta}>
              <span className={styles.stars}>{'★'.repeat(t.rating ?? 5)}</span>
              <span className={styles.source}>{t.source}</span>
            </div>
            <p className={styles.quote}>“{t.quote}”</p>
          </div>
        ))}
      </div>
    </section>
  );
}
