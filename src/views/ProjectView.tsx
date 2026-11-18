import React, { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import { useParams, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { projects } from '../data/projects';
import { useWorkContext } from '../components/Layout/Layout';
import { SingleDisc } from '../components/DiscScene/SingleDisc';
import styles from './ProjectView.module.css';

gsap.registerPlugin(ScrollTrigger);

// Seeded PRNG for deterministic procedural ridgeline per slug
function createPRNG(seedStr: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

interface Point {
  x: number;
  y: number;
}

function generateBasePoints(seed: string): Point[] {
  const rand = createPRNG(seed);
  const n = 14;
  const raw: Point[] = [];
  let maxY = 0;

  for (let i = 0; i <= n; i++) {
    const x = i === 0 ? 0 : i === n ? 1 : i / n + (rand() - 0.5) * (0.5 / n);
    const wave = Math.sin((i / n) * Math.PI) * 0.12;
    const jag = rand() * 0.07;
    const y = Math.max(0.02, wave + jag);
    if (y > maxY) maxY = y;
    raw.push({ x, y });
  }

  const scale = maxY > 0 ? 0.18 / maxY : 1;
  return raw.map((p) => ({ x: p.x, y: p.y * scale }));
}

function buildClipPathD(basePoints: Point[], progress: number): string {
  if (progress >= 0.999) {
    return 'M 0 0 L 1 0 L 1 1 L 0 1 Z';
  }

  const factor = 1 - progress;
  const points = basePoints.map((p) => ({
    x: p.x,
    y: p.y * factor,
  }));

  let d = `M 0 1 L 0 ${points[0].y.toFixed(4)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) * 0.2;
    const cp1y = p1.y + (p2.y - p0.y) * 0.2;
    const cp2x = p2.x - (p3.x - p1.x) * 0.2;
    const cp2y = p2.y - (p3.y - p1.y) * 0.2;

    d += ` C ${cp1x.toFixed(4)} ${cp1y.toFixed(4)}, ${cp2x.toFixed(4)} ${cp2y.toFixed(4)}, ${p2.x.toFixed(4)} ${p2.y.toFixed(4)}`;
  }
  d += ' L 1 1 Z';
  return d;
}

function splitTitle(title: string, isMobile = false): string[] {
  const words = title.trim().split(/\s+/);
  if (words.length <= 1) return [title];
  if (isMobile && words.length >= 3) {
    return [words[0], words.slice(1, -1).join(' '), words[words.length - 1]];
  }
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Fullscreen Video Reel Overlay
interface VideoOverlayProps {
  reelUrl: string;
  projectTitle: string;
  onClose: () => void;
}

function VideoOverlay({ reelUrl, projectTitle, onClose }: VideoOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleSound = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div ref={containerRef} className={styles.videoOverlay}>
      <header className={styles.videoHeader}>
        <button onClick={onClose} className={styles.videoBtn} type="button">
          CLOSE
        </button>
        <span className={styles.videoTitle}>{projectTitle} — Reel</span>
        <button onClick={toggleSound} className={styles.videoBtn} type="button">
          {isMuted ? 'SOUND' : 'MUTE'}
        </button>
      </header>

      <div className={styles.videoPlayerContainer}>
        <video
          ref={videoRef}
          src={reelUrl}
          autoPlay
          playsInline
          loop
          className={styles.videoElement}
          onTimeUpdate={() => {
            if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
          }}
          onLoadedMetadata={() => {
            if (videoRef.current) setDuration(videoRef.current.duration);
          }}
          onClick={togglePlay}
        />
      </div>

      <footer className={styles.videoFooter}>
        <button onClick={togglePlay} className={styles.videoBtn} type="button">
          {isPlaying ? 'PAUSE' : 'PLAY'}
        </button>
        <span className={styles.videoTimer}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
        <button onClick={toggleFullscreen} className={styles.videoBtn} type="button">
          MAXIMIZE
        </button>
      </footer>
    </div>
  );
}

export default function ProjectView() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { triggerTransition, finishTransition } = useWorkContext();

  const [imgError, setImgError] = useState(false);
  const [isReelOpen, setIsReelOpen] = useState(false);

  const projectIndex = projects.findIndex((p) => p.slug === slug);
  const project = projectIndex !== -1 ? projects[projectIndex] : null;
  const nextProject = projectIndex !== -1 ? projects[(projectIndex + 1) % projects.length] : null;

  // DOM Refs
  const pageRef = useRef<HTMLElement | null>(null);
  const whiteOverlayRef = useRef<HTMLDivElement | null>(null);

  const titleLinesRef = useRef<(HTMLSpanElement | null)[]>([]);
  const creditsRef = useRef<HTMLDivElement | null>(null);
  const metaBordersRef = useRef<(HTMLDivElement | null)[]>([]);
  const metaLabelsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const metaValuesRef = useRef<(HTMLSpanElement | null)[]>([]);
  const boxedLinksRef = useRef<HTMLDivElement | null>(null);

  // Hero clipPath & reveal refs
  const heroRevealContainerRef = useRef<HTMLDivElement | null>(null);
  const heroRevealImgRef = useRef<HTMLElement | null>(null);
  const clipPathRef = useRef<SVGPathElement | null>(null);

  // Pinned Quote section refs
  const quotePinRef = useRef<HTMLDivElement | null>(null);
  const quoteWordInnersRef = useRef<(HTMLSpanElement | null)[]>([]);

  // Summary section ref
  const summaryRef = useRef<HTMLElement | null>(null);

  // Next Project section refs
  const nextSectionRef = useRef<HTMLElement | null>(null);
  const nextLinesRef = useRef<(HTMLDivElement | null)[]>([]);
  const nextDiscProgressRef = useRef(0);
  const isNavigatingNextRef = useRef(false);

  // Scroll to top on slug change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  // Handle transition to next project
  const handleNavigateToNext = useCallback(() => {
    if (isNavigatingNextRef.current || !nextProject) return;
    isNavigatingNextRef.current = true;

    triggerTransition();

    if (whiteOverlayRef.current) {
      gsap.to(whiteOverlayRef.current, {
        opacity: 1,
        duration: 0.25,
        ease: 'power2.inOut',
        onComplete: () => {
          navigate(`/work/${nextProject.slug}`, { state: { fromNext: true } });
        },
      });
    } else {
      navigate(`/work/${nextProject.slug}`, { state: { fromNext: true } });
    }
  }, [nextProject, triggerTransition, navigate]);

  // Main GSAP & Lenis Setup
  useEffect(() => {
    if (!project || !nextProject) return;

    isNavigatingNextRef.current = false;

    // Enable normal scroll on html/body for Lenis
    document.documentElement.style.overflow = 'auto';
    document.documentElement.style.height = 'auto';
    document.body.style.overflow = 'auto';
    document.body.style.height = 'auto';

    const isMobile = window.innerWidth < 760;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Set initial dark tone on body
    document.body.classList.remove('tone-light', 'tone-dark');
    document.body.classList.add('tone-dark');

    // Fade white overlay out on mount if coming from transition
    if (whiteOverlayRef.current) {
      gsap.fromTo(
        whiteOverlayRef.current,
        { opacity: (location.state as { fromNext?: boolean } | null)?.fromNext ? 1 : 0 },
        {
          opacity: 0,
          duration: 0.25,
          ease: 'power2.out',
          onComplete: () => {
            finishTransition();
          },
        }
      );
    } else {
      finishTransition();
    }

    // Initialize Lenis
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
    });

    lenis.on('scroll', ScrollTrigger.update);
    const tickerCb = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tickerCb);
    gsap.ticker.lagSmoothing(0);

    // Initial ridgeline clip path
    const basePoints = generateBasePoints(project.slug);
    const initialClipD = buildClipPathD(basePoints, prefersReducedMotion ? 1 : 0);
    if (clipPathRef.current) {
      clipPathRef.current.setAttribute('d', initialClipD);
    }

    // 1. Header Intro Timeline (BUG FIX: gsap.set(validTitleLines, { yPercent: 100 }))
    const introTL = gsap.timeline({ defaults: { ease: 'power3.out' } });
    const validTitleLines = titleLinesRef.current.filter(Boolean);

    if (prefersReducedMotion) {
      gsap.set(validTitleLines, { yPercent: 0 });
      if (creditsRef.current) gsap.set(creditsRef.current, { opacity: 1, y: 0 });
      gsap.set(metaBordersRef.current.filter(Boolean), { scaleX: 1 });
      gsap.set(metaLabelsRef.current.filter(Boolean), { opacity: 1 });
      gsap.set(metaValuesRef.current.filter(Boolean), { opacity: 1 });
      if (boxedLinksRef.current) gsap.set(boxedLinksRef.current, { opacity: 1, y: 0 });
    } else {
      gsap.set(validTitleLines, { yPercent: 100 });
      introTL.to(
        validTitleLines,
        { yPercent: 0, duration: 0.9, stagger: 0.08 }
      );

      if (creditsRef.current) {
        introTL.fromTo(
          creditsRef.current,
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.6 },
          '-=0.5'
        );
      }

      introTL.fromTo(
        metaBordersRef.current.filter(Boolean),
        { scaleX: 0 },
        { scaleX: 1, duration: 0.8, stagger: 0.06, transformOrigin: 'left center' },
        '-=0.4'
      );

      const metaTexts = [
        ...metaLabelsRef.current.filter(Boolean),
        ...metaValuesRef.current.filter(Boolean),
      ];
      introTL.fromTo(
        metaTexts,
        { opacity: 0, y: 6 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.03 },
        '-=0.6'
      );

      if (boxedLinksRef.current) {
        introTL.fromTo(
          boxedLinksRef.current,
          { opacity: 0, y: 15 },
          { opacity: 1, y: 0, duration: 0.7 },
          '-=0.4'
        );
      }
    }

    // 2. Torn-edge reveal of hero image
    if (!prefersReducedMotion && heroRevealContainerRef.current) {
      ScrollTrigger.create({
        trigger: heroRevealContainerRef.current,
        start: 'top 85%',
        end: 'top 15%',
        scrub: true,
        onUpdate: (self) => {
          if (clipPathRef.current) {
            clipPathRef.current.setAttribute('d', buildClipPathD(basePoints, self.progress));
          }
        },
      });

      if (heroRevealImgRef.current) {
        gsap.fromTo(
          heroRevealImgRef.current,
          { scale: 1.0 },
          {
            scale: 1.08,
            ease: 'none',
            scrollTrigger: {
              trigger: heroRevealContainerRef.current,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
          }
        );
      }
    }

    // 3. Quote Pin Section (BUG FIX: gsap.set(quoteWords, { yPercent: 100 }))
    if (quotePinRef.current) {
      const quoteWords = quoteWordInnersRef.current.filter(Boolean);

      if (prefersReducedMotion) {
        gsap.set(quoteWords, { yPercent: 0 });
      } else {
        gsap.set(quoteWords, { yPercent: 100 });
        const pinDistance = isMobile ? '+=180%' : '+=250%';
        const quoteTL = gsap.timeline({
          scrollTrigger: {
            trigger: quotePinRef.current,
            pin: true,
            start: 'top top',
            end: pinDistance,
            scrub: 0.8,
          },
        });

        quoteWords.forEach((wordEl, idx) => {
          quoteTL.to(
            wordEl,
            { yPercent: 0, duration: 0.8, ease: 'power2.out' },
            idx * 0.75
          );
        });
      }
    }

    // 4. Summary: tween page background to #d6d3cf after the pin
    if (summaryRef.current && pageRef.current) {
      ScrollTrigger.create({
        trigger: summaryRef.current,
        start: 'top 75%',
        end: 'top 30%',
        onEnter: () => {
          gsap.to(pageRef.current, {
            backgroundColor: '#d6d3cf',
            color: '#111111',
            duration: 0.5,
            ease: 'power2.out',
          });
        },
        onLeaveBack: () => {
          gsap.to(pageRef.current, {
            backgroundColor: 'var(--bg)',
            color: 'var(--fg)',
            duration: 0.5,
            ease: 'power2.out',
          });
        },
      });
    }

    // 5. Next Project Section (Grey section, ~200vh pin & scrub)
    if (nextSectionRef.current) {
      const lines = nextLinesRef.current.filter(Boolean);

      const nextTL = gsap.timeline({
        scrollTrigger: {
          trigger: nextSectionRef.current,
          pin: true,
          start: 'top top',
          end: '+=200%',
          scrub: 1.0,
          onUpdate: (self) => {
            nextDiscProgressRef.current = self.progress;
            if (self.progress >= 0.98) {
              handleNavigateToNext();
            }
          },
        },
      });

      lines.forEach((lineEl, idx) => {
        const isOdd = idx % 2 === 0;
        nextTL.fromTo(
          lineEl,
          { xPercent: isOdd ? 25 : -25 },
          { xPercent: isOdd ? -25 : 25, ease: 'none' },
          0
        );
      });
    }

    // 6. Tone ScrollTriggers per section (tone-light / tone-dark on body)
    const toneSections = pageRef.current?.querySelectorAll<HTMLElement>('[data-tone]');
    toneSections?.forEach((sec) => {
      const tone = sec.getAttribute('data-tone');
      if (!tone) return;
      ScrollTrigger.create({
        trigger: sec,
        start: 'top 50%',
        end: 'bottom 50%',
        onEnter: () => {
          document.body.classList.remove('tone-light', 'tone-dark');
          document.body.classList.add(`tone-${tone}`);
        },
        onEnterBack: () => {
          document.body.classList.remove('tone-light', 'tone-dark');
          document.body.classList.add(`tone-${tone}`);
        },
      });
    });

    return () => {
      gsap.ticker.remove(tickerCb);
      lenis.destroy();
      ScrollTrigger.getAll().forEach((t) => t.kill());
      document.documentElement.style.overflow = '';
      document.documentElement.style.height = '';
      document.body.style.overflow = '';
      document.body.style.height = '';
      document.body.classList.remove('tone-light', 'tone-dark');
      if (pageRef.current) {
        pageRef.current.style.backgroundColor = '';
        pageRef.current.style.color = '';
      }
    };
  }, [project, nextProject, location.state, finishTransition, handleNavigateToNext]);

  if (projectIndex === -1 || !project || !nextProject) {
    return <Navigate to="/work" replace />;
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 760;
  const titleLines = splitTitle(project.title, isMobile);
  const nextTitleLines = splitTitle(nextProject.title, isMobile);
  const quoteWords = project.quote ? project.quote.split(/\s+/) : [];
  const clipId = `torn-edge-${project.slug}`;

  return (
    <article ref={pageRef} className={styles.project}>
      {/* White transition overlay */}
      <div ref={whiteOverlayRef} className={styles.whiteTransitionOverlay} />

      {/* SVG ClipPath Definition for top jagged edge */}
      <svg width="0" height="0" className={styles.clipSvg} aria-hidden="true">
        <defs>
          <clipPath id={clipId} clipPathUnits="objectBoundingBox">
            <path ref={clipPathRef} d="M 0 0 L 1 0 L 1 1 L 0 1 Z" />
          </clipPath>
        </defs>
      </svg>

      {/* Video Reel Overlay */}
      {isReelOpen && project.reel && (
        <VideoOverlay
          reelUrl={project.reel}
          projectTitle={project.title}
          onClose={() => setIsReelOpen(false)}
        />
      )}

      {/* 1. Header Section (First Viewport - 100svh) */}
      <header className={styles.header} data-tone="dark">
        <h1 className={styles.title}>
          {titleLines.map((line, i) => (
            <span key={i} className={styles.titleLineMask}>
              <span
                ref={(el) => {
                  titleLinesRef.current[i] = el;
                }}
                className={styles.titleLine}
              >
                {line}
              </span>
            </span>
          ))}
        </h1>

        {/* Credits Line */}
        {project.credits && project.credits.length > 0 && (
          <div ref={creditsRef} className={styles.creditsLine}>
            {project.credits.map((credit, i) => (
              <span key={i} className={styles.creditItem}>
                <span className={styles.creditLabel}>{credit.label}</span>
                <span className={styles.creditNames}>{credit.names.join(', ')}</span>
              </span>
            ))}
          </div>
        )}

        {/* Full-width Meta Rows */}
        {project.meta && project.meta.length > 0 && (
          <div className={styles.metaContainer}>
            {project.meta.map((item, i) => (
              <div key={i} className={styles.metaRow}>
                <div
                  ref={(el) => {
                    metaBordersRef.current[i] = el;
                  }}
                  className={styles.metaBorder}
                />
                <span
                  ref={(el) => {
                    metaLabelsRef.current[i] = el;
                  }}
                  className={styles.metaLabel}
                >
                  {item.label}
                </span>
                <span
                  ref={(el) => {
                    metaValuesRef.current[i] = el;
                  }}
                  className={styles.metaValue}
                >
                  {item.value}
                </span>
              </div>
            ))}
            <div
              ref={(el) => {
                metaBordersRef.current[project.meta.length] = el;
              }}
              className={styles.metaBorderBottom}
            />
          </div>
        )}

        {/* Boxed Links */}
        {project.links && project.links.length > 0 && (
          <div ref={boxedLinksRef} className={styles.boxedLinksOuter}>
            <div className={styles.boxedLinksBox}>
              <span className={`${styles.cornerCross} ${styles.crossTL}`}>+</span>
              <span className={`${styles.cornerCross} ${styles.crossTR}`}>+</span>
              <span className={`${styles.cornerCross} ${styles.crossBL}`}>+</span>
              <span className={`${styles.cornerCross} ${styles.crossBR}`}>+</span>
              <div className={styles.boxedLinksList}>
                {project.links.map((link, idx) => (
                  <a
                    key={idx}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.boxedLink}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Torn-edge Hero Image Reveal (peeking in at 100svh - 12vh) */}
      <section
        ref={heroRevealContainerRef}
        className={styles.heroRevealContainer}
        style={{ clipPath: `url(#${clipId})` }}
      >
        {!imgError && project.heroImage ? (
          <img
            ref={heroRevealImgRef as React.RefObject<HTMLImageElement>}
            src={project.heroImage}
            alt={project.title}
            onError={() => setImgError(true)}
            className={styles.heroImg}
          />
        ) : (
          <div
            ref={heroRevealImgRef as React.RefObject<HTMLDivElement>}
            className={styles.heroPlaceholder}
            style={{
              background: `radial-gradient(ellipse at 50% 35%, hsl(${project.hue}, 80%, 50%), hsl(${project.hue + 45}, 65%, 20%) 65%, #0d0e10 95%)`,
            }}
          >
            <div className={styles.heroPlaceholderTitle}>{project.title}</div>
          </div>
        )}
      </section>

      {/* 2. Pinned Hero Quote Section (250vh / 180vh mobile) */}
      <section ref={quotePinRef} className={styles.quotePinSection} data-tone="dark">
        {/* Full-screen hero background */}
        <div className={styles.quoteHeroBg}>
          {!imgError && project.heroImage ? (
            <img src={project.heroImage} alt="" className={styles.quoteHeroImg} />
          ) : (
            <div
              className={styles.quoteHeroPlaceholder}
              style={{
                background: `radial-gradient(ellipse at 50% 35%, hsl(${project.hue}, 70%, 45%), hsl(${project.hue + 45}, 55%, 15%) 70%, #060708 95%)`,
              }}
            />
          )}
          <div className={styles.quoteHeroOverlay} />
        </div>

        {/* 5 Faint Horizontal Lines (1px, white at 25% opacity) */}
        <div className={styles.quoteGridLines} aria-hidden="true">
          <div className={styles.quoteLine} style={{ top: '16%' }} />
          <div className={styles.quoteLine} style={{ top: '32%' }} />
          <div className={styles.quoteLine} style={{ top: '48%' }} />
          <div className={styles.quoteLine} style={{ top: '64%' }} />
          <div className={styles.quoteLine} style={{ top: '80%' }} />
        </div>

        {/* Quote Words (placed at preset alternate left/right positions, each on a line) */}
        <div className={styles.quoteWordsContainer}>
          {quoteWords.map((word, i) => {
            const linePositions = ['16%', '32%', '48%', '64%', '80%'];
            const lineTop = linePositions[i % 5];
            const isLeft = i % 2 === 0;

            return (
              <div
                key={i}
                className={`${styles.quoteWordPlacement} ${isLeft ? styles.wordLeft : styles.wordRight}`}
                style={{ top: lineTop }}
              >
                <span className={styles.quoteWordMask}>
                  <span
                    ref={(el) => {
                      quoteWordInnersRef.current[i] = el;
                    }}
                    className={styles.quoteWordInner}
                  >
                    {word}
                  </span>
                </span>
              </div>
            );
          })}
        </div>

        {/* Centered Boxed "WATCH REEL" Link */}
        {project.reel && (
          <div className={styles.watchReelCenter}>
            <div className={styles.boxedLinksBox}>
              <span className={`${styles.cornerCross} ${styles.crossTL}`}>+</span>
              <span className={`${styles.cornerCross} ${styles.crossTR}`}>+</span>
              <span className={`${styles.cornerCross} ${styles.crossBL}`}>+</span>
              <span className={`${styles.cornerCross} ${styles.crossBR}`}>+</span>
              <button
                type="button"
                onClick={() => setIsReelOpen(true)}
                className={`${styles.boxedLink} ${styles.watchReelBtn}`}
              >
                WATCH REEL
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 3. Summary & Recognition Section (Page background tweens to #d6d3cf) */}
      <section ref={summaryRef} className={styles.summarySection} data-tone="light">
        <div className={styles.summaryContainer}>
          <div className={styles.summaryLeft}>
            <p className={styles.summaryParagraph}>{project.summary}</p>
          </div>

          <div className={styles.summaryRight}>
            <ul className={styles.recognitionList}>
              {project.recognition.map((item, idx) => (
                <li key={idx} className={styles.recognitionItem}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 4. Next Project Section (Grey section, about 200vh) */}
      <section
        ref={nextSectionRef}
        className={styles.nextProjectSection}
        data-tone="light"
      >
        {/* 5 full-width horizontal lines (1px, #111 at 30% opacity) */}
        <div className={styles.nextGridLines} aria-hidden="true">
          <div className={styles.nextLine} style={{ top: '16%' }} />
          <div className={styles.nextLine} style={{ top: '32%' }} />
          <div className={styles.nextLine} style={{ top: '48%' }} />
          <div className={styles.nextLine} style={{ top: '64%' }} />
          <div className={styles.nextLine} style={{ top: '80%' }} />
        </div>

        {/* Next project title lines (sliding left/right on scrub) */}
        <div className={styles.nextTitlesContainer} onClick={handleNavigateToNext}>
          {nextTitleLines.map((line, i) => {
            const lineTops = ['16%', '32%', '48%', '64%', '80%'];
            const topPos = lineTops[i % 5];
            return (
              <div
                key={i}
                ref={(el) => {
                  nextLinesRef.current[i] = el;
                }}
                className={styles.nextTitleLine}
                style={{ top: topPos }}
              >
                {line}
              </div>
            );
          })}
        </div>

        {/* 3D Next-project Disc Canvas */}
        <div className={styles.nextDiscCanvasWrapper}>
          <Canvas
            dpr={[1, 2]}
            camera={{ fov: 35, position: [0, 0, 6] }}
            gl={{ alpha: true, antialias: true }}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'auto',
            }}
          >
            <ambientLight intensity={0.7} />
            <directionalLight position={[5, 8, 6]} intensity={0.8} />
            <directionalLight position={[-5, -4, -2]} intensity={0.25} />
            <Suspense fallback={null}>
              <Environment preset="studio" />
            </Suspense>
            <SingleDisc
              project={nextProject}
              progressRef={nextDiscProgressRef}
              onClick={handleNavigateToNext}
              outlineColor="#111111"
            />
          </Canvas>
        </div>

        {/* Portfolio of Karan S Achar mark */}
        <div className={styles.portfolioMark}>Portfolio of Karan S Achar</div>
      </section>
    </article>
  );
}
