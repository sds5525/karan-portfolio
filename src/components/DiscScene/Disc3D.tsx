import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import gsap from 'gsap';
import {
  RingGeometry,
  CylinderGeometry,
  DoubleSide,
  BufferGeometry,
  BufferAttribute,
  LineBasicMaterial,
  LineLoop,
  type Group,
} from 'three';
import type { Project } from '../../data/projects';
import { getDiscTexture } from './discTexture';

interface Disc3DProps {
  index: number;
  project: Project;
  posRef: React.MutableRefObject<number>;
  movedRef: React.MutableRefObject<boolean>;
  fromHome: boolean;
  introStartRef: React.MutableRefObject<number>;
  transitionTarget: number | null;
  onSelect: (slug: string, index: number) => void;
}

interface OutlineLoop {
  baseR: number;
  geometry: BufferGeometry;
  material: LineBasicMaterial;
  line: LineLoop;
  f1: number;
  f2: number;
  p1: number;
  p2: number;
  cx: number;
  cy: number;
}

// Flat UV-mapped RingGeometry for CD printed face
function createFaceGeometry(): RingGeometry {
  const geo = new RingGeometry(0.17, 0.94, 96);
  const pos = geo.attributes.position;
  const uvs = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    // Map Cartesian coords [-1, 1] to UV [0, 1]
    uvs.setXY(i, x * 0.5 + 0.5, y * 0.5 + 0.5);
  }
  uvs.needsUpdate = true;
  return geo;
}

function updateLoopPoints(loop: OutlineLoop) {
  const posAttr = loop.geometry.attributes.position;
  const array = posAttr.array as Float32Array;
  const baseR = loop.baseR;
  const amp = 0.025 * baseR;
  const { cx, cy, f1, f2, p1, p2 } = loop;

  for (let j = 0; j < 120; j++) {
    const theta = (j / 120) * Math.PI * 2;
    const noise = (Math.sin(f1 * theta + p1) + Math.sin(f2 * theta + p2)) * 0.5 * amp;
    const r = baseR + noise;
    const idx = j * 3;
    array[idx] = cx + r * Math.cos(theta);
    array[idx + 1] = cy + r * Math.sin(theta);
    array[idx + 2] = 0.002;
  }
  posAttr.needsUpdate = true;
}

function randomizeBoil(loop: OutlineLoop) {
  loop.f1 = 2 + Math.floor(Math.random() * 4);
  loop.f2 = 2 + Math.floor(Math.random() * 4);
  loop.p1 = Math.random() * Math.PI * 2;
  loop.p2 = Math.random() * Math.PI * 2;
  loop.cx = (Math.random() - 0.5) * 0.03;
  loop.cy = (Math.random() - 0.5) * 0.03;
  updateLoopPoints(loop);
}

export function Disc3D({
  index,
  project,
  posRef,
  movedRef,
  fromHome,
  introStartRef,
  transitionTarget,
  onSelect,
}: Disc3DProps) {
  const { viewport } = useThree();
  const groupRef = useRef<Group>(null);
  const artworkRef = useRef<Group>(null);
  const outlinesGroupRef = useRef<Group>(null);

  const hoverStateRef = useRef<'idle' | 'hovering' | 'fading'>('idle');
  const hoverStartTimeRef = useRef(0);
  const hoverOutTimeRef = useRef(0);
  const lastBoilTimeRef = useRef(0);

  const texture = useMemo(() => getDiscTexture(project), [project]);
  const faceGeometry = useMemo(() => createFaceGeometry(), []);
  const rimGeometry = useMemo(() => new RingGeometry(0.94, 1.0, 96), []);
  const hubGeometry = useMemo(() => new RingGeometry(0.12, 0.2, 96), []);
  const edgeGeometry = useMemo(() => new CylinderGeometry(1, 1, 0.015, 96, 1, true), []);

  const discRadius = Math.min(1.35, viewport.width * 0.22);

  // Pre-allocate the 3 wobble outline loops
  const loops = useMemo<OutlineLoop[]>(() => {
    const baseRadii = [1.03, 1.07, 1.11];
    return baseRadii.map((baseR) => {
      const geo = new BufferGeometry();
      const posArray = new Float32Array(120 * 3);
      geo.setAttribute('position', new BufferAttribute(posArray, 3));
      geo.setDrawRange(0, 0);

      const mat = new LineBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      });

      const line = new LineLoop(geo, mat);
      line.visible = false;

      const loop: OutlineLoop = {
        baseR,
        geometry: geo,
        material: mat,
        line,
        f1: 2 + Math.floor(Math.random() * 4),
        f2: 2 + Math.floor(Math.random() * 4),
        p1: Math.random() * Math.PI * 2,
        p2: Math.random() * Math.PI * 2,
        cx: (Math.random() - 0.5) * 0.03,
        cy: (Math.random() - 0.5) * 0.03,
      };

      updateLoopPoints(loop);
      return loop;
    });
  }, []);

  // Mount lines to outlinesGroup
  useEffect(() => {
    const parent = outlinesGroupRef.current;
    if (!parent) return;

    loops.forEach((loop) => parent.add(loop.line));

    return () => {
      loops.forEach((loop) => {
        parent.remove(loop.line);
        loop.geometry.dispose();
        loop.material.dispose();
      });
    };
  }, [loops]);

  useEffect(() => {
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, []);

  // Handle Carousel to Project transition
  useEffect(() => {
    if (transitionTarget === null || !groupRef.current) return;

    // Hide wobble outlines immediately
    loops.forEach((loop) => {
      loop.line.visible = false;
      loop.geometry.setDrawRange(0, 0);
    });

    if (transitionTarget === index) {
      // Clicked disc moves to screen centre and scales down to a 12px dot (600ms, power3.inOut)
      gsap.to(groupRef.current.position, {
        x: 0,
        y: 0,
        z: 0,
        duration: 0.6,
        ease: 'power3.inOut',
      });
      gsap.to(groupRef.current.rotation, {
        x: 0,
        y: 0,
        z: 0,
        duration: 0.6,
        ease: 'power3.inOut',
      });
      gsap.to(groupRef.current.scale, {
        x: 0.025,
        y: 0.025,
        z: 0.025,
        duration: 0.6,
        ease: 'power3.inOut',
      });
    } else {
      // Other discs fade and drop (300ms)
      gsap.to(groupRef.current.position, {
        y: groupRef.current.position.y - 2.0,
        duration: 0.3,
        ease: 'power2.in',
      });
      groupRef.current.traverse((child: any) => {
        if (child.material) {
          child.material.transparent = true;
          gsap.to(child.material, {
            opacity: 0,
            duration: 0.3,
            ease: 'power2.in',
          });
        }
      });
    }
  }, [transitionTarget, index, loops]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    if (transitionTarget !== null) return;

    const pos = posRef.current;
    const d = index - pos;

    if (Math.abs(d) > 3.5) {
      groupRef.current.visible = false;
      return;
    }
    groupRef.current.visible = true;

    const isMobile = state.size.width < 760;
    const targetX = isMobile ? d * 1.1 : d * 1.55 + 0.25;
    const targetY = isMobile ? d * 0.75 : d * 0.62 - 0.05 * d * d - 0.15;
    const targetZ = -Math.abs(d) * 0.9;

    let introEased = 1;
    if (fromHome && introStartRef.current > 0) {
      const now = performance.now();
      const elapsed = (now - introStartRef.current) / 1000;
      const discDelay = index * 0.08;
      const discTime = elapsed - discDelay;
      if (discTime <= 0) {
        introEased = 0;
      } else if (discTime >= 0.85) {
        introEased = 1;
      } else {
        const p = discTime / 0.85;
        introEased = 1 - Math.pow(1 - p, 3);
      }
    }

    const yOffset = (1 - introEased) * -3;
    groupRef.current.position.set(targetX, targetY + yOffset, targetZ);

    const rotX = -0.62;
    const rotY = -0.18 - d * 0.06;
    const rotZ = 0.32 + d * 0.05;
    groupRef.current.rotation.set(rotX, rotY, rotZ);

    if (artworkRef.current) {
      const still = matchMedia('(prefers-reduced-motion:reduce)').matches;
      if (!still) {
        artworkRef.current.rotation.z += 0.08 * delta;
        if (introEased < 1) {
          artworkRef.current.rotation.z += (1 - introEased) * delta * 6;
        }
      }
    }

    // Wobble outline animation and boiling effect
    const now = performance.now();

    // Never show the outline while dragging
    if (movedRef.current && hoverStateRef.current !== 'idle') {
      hoverStateRef.current = 'idle';
      loops.forEach((loop) => {
        loop.line.visible = false;
        loop.geometry.setDrawRange(0, 0);
      });
      return;
    }

    const hoverState = hoverStateRef.current;
    if (hoverState === 'idle') {
      loops.forEach((loop) => {
        loop.line.visible = false;
      });
      return;
    }

    // Boiling: re-randomise phases and offsets every 110 ms
    if (now - lastBoilTimeRef.current >= 110) {
      lastBoilTimeRef.current = now;
      loops.forEach(randomizeBoil);
    }

    if (hoverState === 'hovering') {
      const elapsed = now - hoverStartTimeRef.current;
      loops.forEach((loop, k) => {
        loop.line.visible = true;
        loop.material.opacity = 0.9;
        const stagger = k * 60;
        const loopElapsed = elapsed - stagger;
        if (loopElapsed <= 0) {
          loop.geometry.setDrawRange(0, 0);
        } else if (loopElapsed >= 280) {
          loop.geometry.setDrawRange(0, 120);
        } else {
          const count = Math.floor((loopElapsed / 280) * 120);
          loop.geometry.setDrawRange(0, count);
        }
      });
    } else if (hoverState === 'fading') {
      const elapsedOut = now - hoverOutTimeRef.current;
      if (elapsedOut >= 180) {
        hoverStateRef.current = 'idle';
        loops.forEach((loop) => {
          loop.line.visible = false;
          loop.geometry.setDrawRange(0, 0);
          loop.material.opacity = 0;
        });
      } else {
        const fade = 1 - elapsedOut / 180;
        const currentOpacity = 0.9 * fade;
        loops.forEach((loop) => {
          loop.line.visible = true;
          loop.material.opacity = currentOpacity;
        });
      }
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (!movedRef.current && transitionTarget === null) {
      onSelect(project.slug, index);
    }
  };

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (movedRef.current) return;
    document.body.style.cursor = 'pointer';
    hoverStateRef.current = 'hovering';
    hoverStartTimeRef.current = performance.now();
    lastBoilTimeRef.current = performance.now();
    loops.forEach(randomizeBoil);
  };

  const handlePointerOut = () => {
    document.body.style.cursor = 'auto';
    if (hoverStateRef.current === 'hovering') {
      hoverStateRef.current = 'fading';
      hoverOutTimeRef.current = performance.now();
    }
  };

  return (
    <group
      ref={groupRef}
      scale={[discRadius, discRadius, discRadius]}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* Artwork sub-group that drifts around its own axis */}
      <group ref={artworkRef}>
        {/* Printed face */}
        <mesh geometry={faceGeometry}>
          <meshStandardMaterial
            map={texture}
            roughness={0.35}
            metalness={0.15}
            side={DoubleSide}
          />
        </mesh>

        {/* Silver hub (0.12 - 0.2, hole < 0.12 transparent) */}
        <mesh geometry={hubGeometry} position={[0, 0, 0.001]}>
          <meshStandardMaterial
            color="#d4d4d8"
            metalness={1}
            roughness={0.25}
            side={DoubleSide}
          />
        </mesh>
      </group>

      {/* Clear outer rim (0.94 - 1.0) */}
      <mesh geometry={rimGeometry}>
        <meshPhysicalMaterial
          color="#e5e5e5"
          roughness={0.15}
          clearcoat={1}
          iridescence={0.4}
          transparent
          opacity={0.6}
          side={DoubleSide}
        />
      </mesh>

      {/* Thin edge (radius 1, height 0.015) */}
      <mesh geometry={edgeGeometry} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial
          color="#d4d4d8"
          roughness={0.3}
          metalness={0.4}
          transparent
          opacity={0.7}
          side={DoubleSide}
        />
      </mesh>

      {/* Wobble outline loops container in disc plane */}
      <group ref={outlinesGroupRef} />
    </group>
  );
}
