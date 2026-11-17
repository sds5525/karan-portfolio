import { useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { projects } from '../data/projects';
import { useWorkContext } from '../components/Layout/Layout';
import { InfoPanel } from '../components/InfoPanel/InfoPanel';
import { Disc } from '../components/Disc/Disc';
import { DiscEntrance } from '../components/DiscEntrance/DiscEntrance';
import { useCarousel } from '../hooks/useCarousel';
import styles from './WorkView.module.css';

export default function WorkView() {
  const { setCounterText } = useWorkContext();
  const location = useLocation();
  const fromHome = Boolean((location.state as { fromHome?: boolean } | null)?.fromHome);
  const [showEntrance, setShowEntrance] = useState(fromHome);

  const workRef = useRef<HTMLElement>(null);
  const infoRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  const { activeIndex, handleDiscClick } = useCarousel({
    workRef,
    infoRef,
    itemRefs,
    setCounterText,
  });

  return (
    <section ref={workRef} className={styles.work} id="work">
      <InfoPanel ref={infoRef} project={projects[activeIndex]} />
      <div className={styles.stage} id="stage">
        {projects.map((project, i) => (
          <Disc
            key={project.slug}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            project={project}
            index={i}
            onClick={() => handleDiscClick(i)}
          />
        ))}
      </div>
      {showEntrance && <DiscEntrance onComplete={() => setShowEntrance(false)} />}
    </section>
  );
}
