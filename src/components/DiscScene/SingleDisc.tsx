import React, { useMemo, useRef, useEffect } from 'react';
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

const PLACEHOLDER_POINTS: [number, number, number][] = Array.from(
  { length: 140 },
  (_, i) => [Math.cos((i / 139) * Math.PI * 2), Math.sin((i / 139) * Math.PI * 2), 0]
);

function fillStrokePositions(rBase: number, params: WobbleParams, out: Float32Array): void {
  const count = 140;
  const totalAngle = 1.08 * Math.PI * 2;
  const { p1, p2, cx, cy, rot } = params;

  for (let j = 0; j < count; j++) {
    const theta = (j / (count - 1)) * totalAngle + rot;
    const noise = 0.035 * Math.sin(2 * theta + p1) + 0.02 * Math.sin(5 * theta + p2);
    const r = rBase * (1 + noise);
    const x = cx + r * Math.cos(theta);
    const y = cy + r * Math.sin(theta);
    const idx = j * 3;
    out[idx] = x;
    out[idx + 1] = y;
    out[idx + 2] = 0.003;
  }
}

interface SingleDiscWobbleOutlineProps {
  activeRef: (() => boolean) | React.MutableRefObject<boolean>;
  outlineColor?: string;
}

function SingleDiscWobbleOutline({
  activeRef,
  outlineColor = '#111111',
}: SingleDiscWobbleOutlineProps) {
  const line1Ref = useRef<any>(null);
  const line2Ref = useRef<any>(null);

  const stateRef = useRef<'idle' | 'drawing' | 'boiling' | 'fading'>('idle');
  const hoverStartTimeRef = useRef(0);
  const hoverOutTimeRef = useRef(0);
  const lastBoilTimeRef = useRef(0);
  const params1Ref = useRef<WobbleParams>(randomParams(false));
  const params2Ref = useRef<WobbleParams>(randomParams(true));
  const flatPts1Ref = useRef<Float32Array>(new Float32Array(140 * 3));
  const flatPts2Ref = useRef<Float32Array>(new Float32Array(140 * 3));

  useFrame(() => {
    if (
      !line1Ref.current ||
      !line2Ref.current ||
      !line1Ref.current.geometry ||
      !line2Ref.current.geometry
    ) {
      return;
    }

    const now = performance.now();
    const active = typeof activeRef === 'function' ? activeRef() : activeRef.current;

    if (active) {
      if (stateRef.current === 'idle' || stateRef.current === 'fading') {
        stateRef.current = 'drawing';
        hoverStartTimeRef.current = now;
        lastBoilTimeRef.current = now;
        params1Ref.current = randomParams(false);
        params2Ref.current = randomParams(true);
        fillStrokePositions(1.06, params1Ref.current, flatPts1Ref.current);
        fillStrokePositions(1.12, params2Ref.current, flatPts2Ref.current);
        line1Ref.current.geometry.setPositions(flatPts1Ref.current);
        line2Ref.current.geometry.setPositions(flatPts2Ref.current);
      }

      // Boiling every 110 ms
      if (now - lastBoilTimeRef.current >= 110) {
        lastBoilTimeRef.current = now;
        params1Ref.current = randomParams(false);
        params2Ref.current = randomParams(true);
        fillStrokePositions(1.06, params1Ref.current, flatPts1Ref.current);
        fillStrokePositions(1.12, params2Ref.current, flatPts2Ref.current);
        line1Ref.current.geometry.setPositions(flatPts1Ref.current);
        line2Ref.current.geometry.setPositions(flatPts2Ref.current);
      }

      const elapsed = now - hoverStartTimeRef.current;
      const progress1 = Math.min(1, Math.max(0, elapsed / 300));
      const progress2 = Math.min(1, Math.max(0, (elapsed - 70) / 300));

      const visibleSegments1 = Math.floor(progress1 * 139);
      const visibleSegments2 = Math.floor(progress2 * 139);

      line1Ref.current.geometry.instanceCount = visibleSegments1;
      line2Ref.current.geometry.instanceCount = visibleSegments2;

      line1Ref.current.visible = visibleSegments1 > 0;
      line2Ref.current.visible = visibleSegments2 > 0;

      const mat1 = line1Ref.current.material;
      const mat2 = line2Ref.current.material;
      if (mat1) mat1.opacity = 0.9;
      if (mat2) mat2.opacity = 0.9;

      if (elapsed >= 370) {
        stateRef.current = 'boiling';
      }
    } else {
      if (stateRef.current === 'drawing' || stateRef.current === 'boiling') {
        stateRef.current = 'fading';
        hoverOutTimeRef.current = now;
      }

      if (stateRef.current === 'fading') {
        const elapsedOut = now - hoverOutTimeRef.current;
        if (elapsedOut >= 180) {
          stateRef.current = 'idle';
          line1Ref.current.visible = false;
          line2Ref.current.visible = false;
          line1Ref.current.geometry.instanceCount = 0;
          line2Ref.current.geometry.instanceCount = 0;
        } else {
          const op = 0.9 * (1 - elapsedOut / 180);
          const mat1 = line1Ref.current.material;
          const mat2 = line2Ref.current.material;
          if (mat1) mat1.opacity = op;
          if (mat2) mat2.opacity = op;
        }
      } else if (stateRef.current === 'idle') {
        line1Ref.current.visible = false;
        line2Ref.current.visible = false;
      }
    }
  });

  return (
    <group position={[0, 0, 0.003]}>
      <Line
        ref={line1Ref}
        points={PLACEHOLDER_POINTS}
        color={outlineColor}
        lineWidth={2.4}
        transparent
      />
      <Line
        ref={line2Ref}
        points={PLACEHOLDER_POINTS}
        color={outlineColor}
        lineWidth={2.4}
        transparent
      />
    </group>
  );
}

function createFaceGeometry(): RingGeometry {
  const geo = new RingGeometry(0.28, 0.965, 96);
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
  const innerLipGeometry = useMemo(() => new RingGeometry(0.14, 0.17, 96), []);
  const hubGeometry = useMemo(() => new RingGeometry(0.17, 0.28, 96), []);
  const edgeGeometry = useMemo(() => new CylinderGeometry(1, 1, 0.03, 96, 1, true), []);

  useEffect(() => {
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, []);

  useFrame(() => {
    if (!groupRef.current) return;

    const isMobile = window.innerWidth < 760;
    // Disc diameter = 62% of viewport width on desktop, 100% on mobile
    const diameter = isMobile ? viewport.width : viewport.width * 0.62;
    const R = diameter / 2;

    // Vertical scrub: from fully below bottom edge up to targetCenterY
    // Top of viewport = +viewport.height / 2, Bottom = -viewport.height / 2
    const startY = -viewport.height / 2 - R - 0.5;
    // On desktop: center sits at 78% of section height (from top)
    // On mobile: rising until about 45% of the disc is visible above the bottom edge
    const targetCenterY = isMobile
      ? -viewport.height / 2 - 0.1 * R * Math.cos(0.55)
      : (0.5 - 0.78) * viewport.height;

    const progress = Math.min(1, Math.max(0, progressRef.current));
    const riseProgress = Math.min(1, progress / 0.8);
    const targetY = startY + (targetCenterY - startY) * riseProgress;

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

        {/* Silver hub ring 0.14 -> 0.28: inner lip 0.14 -> 0.17 and main ring 0.17 -> 0.28 */}
        <mesh geometry={innerLipGeometry} position={[0, 0, 0.001]}>
          <meshStandardMaterial
            color="#e2e4e8"
            roughness={0.2}
            metalness={0.9}
            side={DoubleSide}
          />
        </mesh>
        <mesh geometry={hubGeometry} position={[0, 0, 0.001]}>
          <meshStandardMaterial
            color="#c9cbd0"
            roughness={0.3}
            metalness={0.9}
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
            color="#b9bcc2"
            roughness={0.2}
            metalness={0.6}
            transparent
            opacity={0.5}
            side={DoubleSide}
          />
        </mesh>

        {/* 2-stroke boiling wobble outline with drei <Line> */}
        <SingleDiscWobbleOutline
          activeRef={() => isHoveredRef.current}
          outlineColor={outlineColor}
        />
      </group>
    </group>
  );
}

