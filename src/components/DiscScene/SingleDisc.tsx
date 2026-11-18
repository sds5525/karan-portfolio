import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import {
  RingGeometry,
  CylinderGeometry,
  DoubleSide,
  type Group,
  type Mesh,
} from 'three';
import type { Project } from '../../data/projects';
import { getDiscTexture } from './discTexture';

interface SingleDiscProps {
  project: Project;
  progressRef: React.MutableRefObject<number>;
  onClick: () => void;
  outlineColor?: string;
}

interface WobbleParams {
  p1: number;
  p2: number;
  cx: number;
  cy: number;
  rot: number;
}

function randomParams(hasRotation: boolean): WobbleParams {
  return {
    p1: Math.random() * Math.PI * 2,
    p2: Math.random() * Math.PI * 2,
    cx: (Math.random() - 0.5) * 0.06,
    cy: (Math.random() - 0.5) * 0.06,
    rot: hasRotation ? Math.random() * Math.PI * 2 : 0,
  };
}

function computeStrokePoints(rBase: number, params: WobbleParams): [number, number, number][] {
  const pts: [number, number, number][] = [];
  const count = 140;
  const totalAngle = 1.08 * Math.PI * 2;
  const { p1, p2, cx, cy, rot } = params;

  for (let j = 0; j < count; j++) {
    const theta = (j / (count - 1)) * totalAngle + rot;
    const noise = 0.035 * Math.sin(2 * theta + p1) + 0.02 * Math.sin(5 * theta + p2);
    const r = rBase * (1 + noise);
    const x = cx + r * Math.cos(theta);
    const y = cy + r * Math.sin(theta);
    pts.push([x, y, 0.003]);
  }
  return pts;
}

function SingleDiscWobbleOutline({
  active,
  outlineColor = '#111111',
}: {
  active: boolean;
  outlineColor?: string;
}) {
  const [pts1, setPts1] = useState<[number, number, number][]>([]);
  const [pts2, setPts2] = useState<[number, number, number][]>([]);
  const [opacity, setOpacity] = useState(0);

  const stateRef = useRef<'idle' | 'drawing' | 'boiling' | 'fading'>('idle');
  const hoverStartTimeRef = useRef(0);
  const hoverOutTimeRef = useRef(0);
  const lastBoilTimeRef = useRef(0);
  const params1Ref = useRef<WobbleParams>(randomParams(false));
  const params2Ref = useRef<WobbleParams>(randomParams(true));
  const fullPts1Ref = useRef<[number, number, number][]>([]);
  const fullPts2Ref = useRef<[number, number, number][]>([]);

  useFrame(() => {
    const now = performance.now();

    if (active) {
      if (stateRef.current === 'idle' || stateRef.current === 'fading') {
        stateRef.current = 'drawing';
        hoverStartTimeRef.current = now;
        lastBoilTimeRef.current = now;
        params1Ref.current = randomParams(false);
        params2Ref.current = randomParams(true);
        fullPts1Ref.current = computeStrokePoints(1.06, params1Ref.current);
        fullPts2Ref.current = computeStrokePoints(1.12, params2Ref.current);
      }

      // Boiling every 110 ms
      if (now - lastBoilTimeRef.current >= 110) {
        lastBoilTimeRef.current = now;
        params1Ref.current = randomParams(false);
        params2Ref.current = randomParams(true);
        fullPts1Ref.current = computeStrokePoints(1.06, params1Ref.current);
        fullPts2Ref.current = computeStrokePoints(1.12, params2Ref.current);
      }

      const elapsed = now - hoverStartTimeRef.current;
      const progress1 = Math.min(1, Math.max(0, elapsed / 300));
      const progress2 = Math.min(1, Math.max(0, (elapsed - 70) / 300));

      const count1 = Math.max(2, Math.floor(progress1 * 140));
      const count2 = Math.max(2, Math.floor(progress2 * 140));

      setPts1(fullPts1Ref.current.slice(0, count1));
      if (progress2 > 0) {
        setPts2(fullPts2Ref.current.slice(0, count2));
      } else {
        setPts2([]);
      }
      setOpacity(0.9);
    } else {
      if (stateRef.current === 'drawing' || stateRef.current === 'boiling') {
        stateRef.current = 'fading';
        hoverOutTimeRef.current = now;
      }

      if (stateRef.current === 'fading') {
        const elapsedOut = now - hoverOutTimeRef.current;
        if (elapsedOut >= 180) {
          stateRef.current = 'idle';
          setPts1([]);
          setPts2([]);
          setOpacity(0);
        } else {
          setOpacity(0.9 * (1 - elapsedOut / 180));
        }
      }
    }
  });

  if (opacity <= 0.001) return null;

  return (
    <group position={[0, 0, 0.003]}>
      {pts1.length >= 2 && (
        <Line
          points={pts1}
          color={outlineColor}
          lineWidth={2.4}
          transparent
          opacity={opacity}
        />
      )}
      {pts2.length >= 2 && (
        <Line
          points={pts2}
          color={outlineColor}
          lineWidth={2.4}
          transparent
          opacity={opacity}
        />
      )}
    </group>
  );
}

function createFaceGeometry(): RingGeometry {
  const geo = new RingGeometry(0.17, 0.965, 96);
  const pos = geo.attributes.position;
  const uvs = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    uvs.setXY(i, x * 0.5 + 0.5, y * 0.5 + 0.5);
  }
  uvs.needsUpdate = true;
  return geo;
}

export function SingleDisc({
  project,
  progressRef,
  onClick,
  outlineColor = '#111111',
}: SingleDiscProps) {
  const { viewport } = useThree();
  const groupRef = useRef<Group>(null);
  const artworkRef = useRef<Group>(null);
  const faceMeshRef = useRef<Mesh>(null);
  const rimMeshRef = useRef<Mesh>(null);

  const isHoveredRef = useRef(false);
  const targetTiltX = useRef(0);
  const targetTiltY = useRef(0);
  const curTiltX = useRef(0);
  const curTiltY = useRef(0);
  const hoverFactor = useRef(0);
  const curY = useRef(-10);

  const texture = useMemo(() => getDiscTexture(project), [project]);
  const faceGeometry = useMemo(() => createFaceGeometry(), []);
  const rimGeometry = useMemo(() => new RingGeometry(0.965, 1.0, 96), []);
  const hubGeometry = useMemo(() => new RingGeometry(0.12, 0.2, 96), []);
  const edgeGeometry = useMemo(() => new CylinderGeometry(1, 1, 0.015, 96, 1, true), []);

  useEffect(() => {
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, []);

  useFrame((_state, delta) => {
    if (!groupRef.current) return;

    const isMobile = window.innerWidth < 760;
    // Disc diameter = 62% of viewport width on desktop, 90% on mobile
    const diameter = isMobile ? viewport.width * 0.9 : viewport.width * 0.62;
    const R = diameter / 2;

    // Vertical scrub: from fully below bottom edge up to where center sits at 78% of section height
    // Top of viewport = +viewport.height / 2, Bottom = -viewport.height / 2
    const startY = -viewport.height / 2 - R - 0.2;
    // 78% of section height from top:
    const targetCenterY = (0.5 - 0.78) * viewport.height;

    const progress = Math.min(1, Math.max(0, progressRef.current));
    const targetY = startY + (targetCenterY - startY) * progress;

    curY.current += (targetY - curY.current) * 0.15;

    // Hover lerp
    const isHovered = isHoveredRef.current;
    const lerpRate = isHovered ? 0.15 : 0.08;
    hoverFactor.current += ((isHovered ? 1 : 0) - hoverFactor.current) * lerpRate;
    curTiltX.current += (targetTiltX.current - curTiltX.current) * lerpRate;
    curTiltY.current += (targetTiltY.current - curTiltY.current) * lerpRate;

    const baseRotX = -0.55;
    const baseRotY = -0.25;
    const baseRotZ = 0.35;

    const finalX = 0;
    const finalY = curY.current;
    const finalZ = hoverFactor.current * 0.2 * R;
    const finalScale = R * (1 + 0.04 * hoverFactor.current);
    const finalRotX = baseRotX + curTiltX.current * hoverFactor.current;
    const finalRotY = baseRotY + curTiltY.current * hoverFactor.current;
    const finalRotZ = baseRotZ;

    groupRef.current.position.set(finalX, finalY, finalZ);
    groupRef.current.scale.set(finalScale, finalScale, finalScale);
    groupRef.current.rotation.set(finalRotX, finalRotY, finalRotZ);

    if (artworkRef.current) {
      const still = matchMedia('(prefers-reduced-motion:reduce)').matches;
      if (!still) {
        artworkRef.current.rotation.z += 0.08 * delta;
      }
    }
  });

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (groupRef.current) {
      const local = groupRef.current.worldToLocal(e.point.clone());
      targetTiltX.current = -local.y * 0.22;
      targetTiltY.current = local.x * 0.22;
    }
    if (!isHoveredRef.current) {
      isHoveredRef.current = true;
      document.body.style.cursor = 'pointer';
    }
  };

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    document.body.style.cursor = 'pointer';
    handlePointerMove(e);
  };

  const handlePointerOut = () => {
    document.body.style.cursor = 'auto';
    isHoveredRef.current = false;
    targetTiltX.current = 0;
    targetTiltY.current = 0;
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onClick();
  };

  return (
    <group ref={groupRef}>
      <group ref={artworkRef}>
        {/* Printed face (0.17 to 0.965) */}
        <mesh
          ref={faceMeshRef}
          geometry={faceGeometry}
          onClick={handleClick}
          onPointerOver={handlePointerOver}
          onPointerMove={handlePointerMove}
          onPointerOut={handlePointerOut}
        >
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
            roughness={0.25}
            metalness={1}
            side={DoubleSide}
          />
        </mesh>

        {/* Thinner see-through clear outer rim (0.965 to 1.0, opacity 0.35) */}
        <mesh
          ref={rimMeshRef}
          geometry={rimGeometry}
          position={[0, 0, 0.001]}
          onClick={handleClick}
          onPointerOver={handlePointerOver}
          onPointerMove={handlePointerMove}
          onPointerOut={handlePointerOut}
        >
          <meshPhysicalMaterial
            roughness={0.15}
            clearcoat={1}
            iridescence={0.4}
            transparent
            opacity={0.35}
            side={DoubleSide}
          />
        </mesh>

        {/* Outer edge cylinder (opacity 0.5) */}
        <mesh geometry={edgeGeometry} rotation={[Math.PI / 2, 0, 0]}>
          <meshPhysicalMaterial
            roughness={0.2}
            transparent
            opacity={0.5}
            side={DoubleSide}
          />
        </mesh>

        {/* 2-stroke boiling wobble outline with drei <Line> */}
        <SingleDiscWobbleOutline
          active={isHoveredRef.current}
          outlineColor={outlineColor}
        />
      </group>
    </group>
  );
}

