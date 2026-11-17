import React, { forwardRef } from 'react';
import type { Project } from '../../data/projects';
import styles from './InfoPanel.module.css';

interface InfoPanelProps {
  project: Project;
}

export const InfoPanel = forwardRef<HTMLElement, InfoPanelProps>(({ project }, ref) => {
  return (
    <aside ref={ref} className={styles.info}>
      <h1>{project.title}</h1>
      <div className={styles.row}>
        <b>Role</b>
        <span>
          {project.role.map((r, i) => (
            <React.Fragment key={i}>
              {r}
              {i < project.role.length - 1 && <br />}
            </React.Fragment>
          ))}
        </span>
      </div>
      <div className={styles.row}>
        <b>Year</b>
        <span>{project.year}</span>
      </div>
      <div className={styles.row}>
        <b>Built with</b>
        <span>
          {project.tools.map((t, i) => (
            <React.Fragment key={i}>
              {t}
              {i < project.tools.length - 1 && <br />}
            </React.Fragment>
          ))}
        </span>
      </div>
    </aside>
  );
});

InfoPanel.displayName = 'InfoPanel';

