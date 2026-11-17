import { useEffect, useRef } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { projects } from '../data/projects';
import { Disc } from '../components/Disc/Disc';
import styles from './ProjectView.module.css';

const pad = (n: number) => String(n + 1).padStart(2, '0');

export default function ProjectView() {
  const { slug } = useParams<{ slug: string }>();
  const projectRef = useRef<HTMLElement | null>(null);

  const projectIndex = projects.findIndex((p) => p.slug === slug);

  useEffect(() => {
    if (projectRef.current) {
      projectRef.current.scrollTop = 0;
    }
    window.scrollTo(0, 0);
  }, [slug]);

  if (projectIndex === -1) {
    return <Navigate to="/work" replace />;
  }

  const project = projects[projectIndex];
  const prevProject = projects[(projectIndex + projects.length - 1) % projects.length];
  const nextProject = projects[(projectIndex + 1) % projects.length];

  return (
    <section className={styles.project} ref={projectRef} id="project">
      <div className={styles.pgrid}>
        <div>
          <small className={styles.meta}>
            {pad(projectIndex)} / {project.year}
          </small>
          <h1>{project.title}</h1>
          <p>{project.description}</p>
          <div className={`${styles.row} ${styles.firstRow}`}>
            <b>Role</b>
            <span>{project.role.join(', ')}</span>
          </div>
          <div className={styles.row}>
            <b>Built with</b>
            <span>{project.tools.join(', ')}</span>
          </div>
        </div>

        <div className={styles.pdisc}>
          <Disc
            project={project}
            index={projectIndex}
            onClick={() => {}}
            hideNote
            className={styles.pdiscItem}
          />
        </div>
      </div>

      <div className={styles.pnav}>
        <Link to={`/work/${prevProject.slug}`}>← {prevProject.title}</Link>
        <Link to="/work" state={{ initialIndex: projectIndex }}>
          All work
        </Link>
        <Link to={`/work/${nextProject.slug}`}>{nextProject.title} →</Link>
      </div>
    </section>
  );
}
