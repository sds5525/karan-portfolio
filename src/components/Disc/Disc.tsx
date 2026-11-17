import { forwardRef, useId } from 'react';
import type { Project } from '../../data/projects';
import styles from './Disc.module.css';

interface DiscProps {
  project: Project;
  index: number;
  onClick: () => void;
  hideNote?: boolean;
  className?: string;
}

export const Disc = forwardRef<HTMLDivElement, DiscProps>(
  ({ project, index, onClick, hideNote = false, className = '' }, ref) => {
    const pathId = useId();

    const h = project.hue;
    const ring = [...project.role, ...project.tools, project.year].join(' · ').toUpperCase();
    const faceBackground = `radial-gradient(circle at 28% 24%,hsl(${h} 70% 62%),hsl(${h + 35} 55% 22%) 48%,#0b0b0c 80%),conic-gradient(from ${h}deg,transparent,rgba(255,255,255,.08),transparent 40%)`;

    return (
      <div
        ref={ref}
        className={`${styles.item} ${className}`.trim()}
        data-i={index}
        onClick={onClick}
      >
        <div className={styles.disc}>
          <div className={styles.face} style={{ background: faceBackground }} />
          <svg viewBox="0 0 100 100" aria-hidden="true" className={styles.discSvg}>
            <defs>
              <path
                id={pathId}
                d="M50,50 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0"
              />
            </defs>
            <text>
              <textPath href={`#${pathId}`}>{ring} · {ring}</textPath>
            </text>
          </svg>
          <div className={styles.dtitle}>{project.title}</div>
          <div className={styles.hole} />
        </div>
        {!hideNote && (
          <div className={styles.note}>
            <small>{project.by}</small>
            <p>“{project.note}”</p>
          </div>
        )}
      </div>
    );
  }
);

Disc.displayName = 'Disc';
