import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useLocation, useOutletContext } from 'react-router-dom';
import { projects } from '../../data/projects';
import styles from './Layout.module.css';

const STATUS_WORDS = ['Developing', 'Splicing', 'Spooling', 'Rewinding', 'Projecting'] as const;
let statusWordIndex = 0;

export function getNextStatusWord(): string {
  const word = STATUS_WORDS[statusWordIndex];
  statusWordIndex = (statusWordIndex + 1) % STATUS_WORDS.length;
  return word;
}

export interface WorkContextType {
  counterText: string;
  setCounterText: React.Dispatch<React.SetStateAction<string>>;
  transitionStatus: string | null;
  triggerTransition: () => string;
  finishTransition: () => void;
}

export function useWorkContext() {
  return useOutletContext<WorkContextType>();
}

export default function Layout() {
  const location = useLocation();
  const [isIndexOpen, setIsIndexOpen] = useState(false);
  const [counterText, setCounterText] = useState('01 / 06');
  const [transitionStatus, setTransitionStatus] = useState<string | null>(null);
  const idxRef = useRef<HTMLDivElement>(null);

  const triggerTransition = React.useCallback(() => {
    const word = getNextStatusWord();
    setTransitionStatus(word);
    return word;
  }, []);

  const finishTransition = React.useCallback(() => {
    setTransitionStatus(null);
  }, []);

  const isHome = location.pathname === '/';
  const isWork = location.pathname === '/work';
  const projectSlugMatch = location.pathname.match(/^\/work\/([^/]+)/);
  const currentProjectIndex = projectSlugMatch
    ? projects.findIndex((p) => p.slug === projectSlugMatch[1])
    : -1;
  const activeWorkIndex = isWork ? parseInt(counterText.split('/')[0].trim(), 10) - 1 : -1;

  // Toggle "home" class on <body>
  useEffect(() => {
    document.body.classList.toggle('home', isHome);
    return () => {
      document.body.classList.remove('home');
    };
  }, [isHome]);

  // Set document.title per route exactly as legacy does
  useEffect(() => {
    if (isHome) {
      document.title = 'Karan S Achar';
    } else if (isWork) {
      document.title = 'Karan S Achar — Work';
    } else if (location.pathname.startsWith('/work/')) {
      const slug = location.pathname.slice('/work/'.length);
      const project = projects.find((p) => p.slug === slug);
      if (project) {
        document.title = `${project.title} — Karan S Achar`;
      }
    }
  }, [isHome, isWork, location.pathname]);

  // Close IndexMenu on outside click
  useEffect(() => {
    if (!isIndexOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (idxRef.current && !idxRef.current.contains(e.target as Node)) {
        setIsIndexOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isIndexOpen]);

  return (
    <>
      <Link to="/" className={styles.brand}>
        MSLOTW
      </Link>

      <nav className={styles.nav}>
        {transitionStatus ? (
          <div className={styles.transitionStatus}>
            <span className={styles.spinner} />
            <span>{transitionStatus}</span>
          </div>
        ) : (
          <>
            <NavLink
              to="/work"
              end
              state={
                isHome
                  ? { fromHome: true }
                  : currentProjectIndex !== -1
                  ? { initialIndex: currentProjectIndex }
                  : undefined
              }
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
              }
            >
              Work
            </NavLink>

            <div
              ref={idxRef}
              className={`${styles.idx} ${isIndexOpen ? styles.idxOpen : ''}`}
            >
              <button
                type="button"
                aria-expanded={isIndexOpen}
                className={styles.idxButton}
                onClick={() => setIsIndexOpen((prev) => !prev)}
              >
                Index ▾
              </button>
              <ul className={styles.idxList}>
                {projects.map((project, i) => {
                  const isCurrent = isWork
                    ? i === activeWorkIndex
                    : (projectSlugMatch ? project.slug === projectSlugMatch[1] : false);
                  return (
                    <li
                      key={project.slug}
                      className={`${styles.idxItem} ${isCurrent ? styles.idxItemActive : ''}`}
                    >
                      <Link
                        to={`/work/${project.slug}`}
                        onClick={() => setIsIndexOpen(false)}
                      >
                        <span>{project.title}</span>
                        <span>{project.year}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        )}
      </nav>

      {isWork && (
        <>
          <div className={styles.ctr}>{counterText}</div>
          <div className={styles.hint}>Scroll · Drag · ← →</div>
        </>
      )}

      <Outlet
        context={
          {
            counterText,
            setCounterText,
            transitionStatus,
            triggerTransition,
            finishTransition,
          } satisfies WorkContextType
        }
      />
    </>
  );
}

