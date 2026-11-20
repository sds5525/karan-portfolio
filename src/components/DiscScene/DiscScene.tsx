import { Suspense, useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { useNavigate } from 'react-router-dom';
import type { Project } from '../../data/projects';
import { useWorkContext } from '../Layout/Layout';
import type { TouchGestureState } from '../../hooks/useCarousel';
import { Disc3D } from './Disc3D';

interface DiscSceneProps {
  projects: Project[];
  posRef: React.MutableRefObject<number>;
  targetRef: React.MutableRefObject<number>;
  movedRef: React.MutableRefObject<boolean>;
  fromHome: boolean;
  captionRef?: React.RefObject<HTMLDivElement | null>;
  onActiveIndexChange: (index: number) => void;
  touchStateRef?: React.MutableRefObject<TouchGestureState>;
}

interface SceneContentProps extends DiscSceneProps {
  introStartRef: React.MutableRefObject<number>;
}

function SceneContent({
  projects,
  posRef,
  targetRef,
  movedRef,
  fromHome,
  captionRef,
  introStartRef,
  onActiveIndexChange,
  touchStateRef,
}: SceneContentProps) {
  const navigate = useNavigate();
  const { triggerTransition } = useWorkContext();
  const shownRef = useRef(fromHome ? -1 : Math.round(posRef.current));
  const [transitionTarget, setTransitionTarget] = useState<number | null>(null);
  const isTransitioningRef = useRef(false);

  useFrame((state) => {
    // Subtle parallax: camera position follows mouse by ±0.08 in x/y (lerp 0.05)
    const targetCamX = state.pointer.x * 0.08;
    const targetCamY = state.pointer.y * 0.08;
    state.camera.position.x += (targetCamX - state.camera.position.x) * 0.05;
    state.camera.position.y += (targetCamY - state.camera.position.y) * 0.05;
    state.camera.lookAt(0, 0, 0);

    if (transitionTarget !== null) return;

    // Lerp pos towards target
    posRef.current += (targetRef.current - posRef.current) * 0.11;

    const r = Math.round(posRef.current);
    if (r !== shownRef.current) {
      shownRef.current = r;
      const safeR = Math.max(0, Math.min(projects.length - 1, r));
      onActiveIndexChange(safeR);
    }

    // Distance-based fade for caption overlay (like old .note)
    const d = Math.abs(posRef.current - r);
    const distFade = Math.max(0, 1 - d * 2.2);

    let introFade = 1;
    if (fromHome && introStartRef.current > 0) {
      const elapsed = (performance.now() - introStartRef.current) / 1000;
      introFade = Math.min(1, Math.max(0, (elapsed - 0.4) / 0.6));
    }

    if (captionRef?.current) {
      captionRef.current.style.opacity = String(distFade * introFade);
    }
  });

  const handleSelect = useCallback(
    (slug: string, index: number) => {
      if (isTransitioningRef.current) return;
      isTransitioningRef.current = true;
      setTransitionTarget(index);
      triggerTransition();

      if (captionRef?.current) {
        captionRef.current.style.transition = 'opacity 0.25s ease';
        captionRef.current.style.opacity = '0';
      }

      // Navigate after 600ms (when disc reaches center and scales to dot)
      setTimeout(() => {
        navigate(`/work/${slug}`);
      }, 600);
    },
    [captionRef, navigate, triggerTransition]
  );

  useEffect(() => {
    if (touchStateRef?.current) {
      touchStateRef.current.onSelect = handleSelect;
    }
  }, [handleSelect, touchStateRef]);

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 8, 6]} intensity={0.8} />
      <directionalLight position={[-5, -4, -2]} intensity={0.25} />

      <Suspense fallback={null}>
        <Environment resolution={256}>
          <Lightformer form="rect" intensity={2} position={[0, 4, -6]} scale={[10, 3, 1]} />
          <Lightformer form="rect" intensity={1} position={[-6, 1, 0]} rotation-y={Math.PI / 2} scale={[8, 2, 1]} />
          <Lightformer form="rect" intensity={1} position={[6, 1, 0]} rotation-y={-Math.PI / 2} scale={[8, 2, 1]} />
          <Lightformer form="ring" intensity={0.6} position={[0, 0, 6]} scale={3} />
        </Environment>
      </Suspense>

      {projects.map((project, i) => (
        <Disc3D
          key={project.slug}
          index={i}
          project={project}
          posRef={posRef}
          targetRef={targetRef}
          movedRef={movedRef}
          fromHome={fromHome}
          introStartRef={introStartRef}
          transitionTarget={transitionTarget}
          outlineColor="#eceae6"
          touchStateRef={touchStateRef}
          onSelect={handleSelect}
        />
      ))}
    </>
  );
}

export function DiscScene(props: DiscSceneProps) {
  const introStartRef = useRef(props.fromHome ? performance.now() : 0);

  // If user interacts during intro, finish intro immediately
  useEffect(() => {
    if (!props.fromHome) return;

    const stopIntro = () => {
      if (introStartRef.current > 0) {
        introStartRef.current = -9999;
      }
    };

    window.addEventListener('wheel', stopIntro, { passive: true });
    window.addEventListener('pointerdown', stopIntro);
    window.addEventListener('keydown', stopIntro);

    return () => {
      window.removeEventListener('wheel', stopIntro);
      window.removeEventListener('pointerdown', stopIntro);
      window.removeEventListener('keydown', stopIntro);
    };
  }, [props.fromHome]);

  return (
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
        touchAction: 'none',
      }}
    >
      <SceneContent {...props} introStartRef={introStartRef} />
    </Canvas>
  );
}

