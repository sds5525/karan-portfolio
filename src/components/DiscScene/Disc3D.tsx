import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import gsap from 'gsap';
import {
  RingGeometry,
  CylinderGeometry,
  DoubleSide,
  type Group,
  type Mesh,
} from 'three';
import type { Project } from '../../data/projects';
import { getDiscTexture } from './discTexture';

interface Disc3DProps {
  index: number;
  project: Project;
  posRef: React.MutableRefObject<number>;
  targetRef: React.MutableRefObject<number>;
  movedRef: React.MutableRefObject<boolean>;
  fromHome: boolean;
  introStartRef: React.MutableRefObject<number>;
  transitionTarget: number | null;
  outlineColor?: string;
  onSelect: (slug: string, index: number) => void;
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

interface DiscWobbleOutlineProps {
  activeRef: (() => boolean) | React.MutableRefObject<boolean>;
  outlineColor?: string;
}

function DiscWobbleOutline({
  activeRef,
  outlineColor = '#eceae6',
}: DiscWobbleOutlineProps) {
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

      // Boiling: re-randomise every 110 ms
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

// Flat UV-mapped RingGeometry for CD printed face (0.17 to 0.965)
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

export function Disc3D({
  index,
  project,
  posRef,
  targetRef,
  movedRef,
  fromHome,
  introStartRef,
  transitionTarget,
  outlineColor = '#eceae6',
  onSelect,
}: Disc3DProps) {
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

  // Soft lerping position, scale, and rotation refs
  const curX = useRef(0);
  const curY = useRef(0);
  const curZ = useRef(0);
  const curScale = useRef(1);
  const curRotX = useRef(-0.55);
  const curRotY = useRef(-0.25);
  const curRotZ = useRef(0.35);
  const initializedRef = useRef(false);

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

  // Handle Carousel to Project transition
  useEffect(() => {
    if (transitionTarget === null || !groupRef.current) return;

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
  }, [transitionTarget, index]);

  useFrame((_state, delta) => {
    if (!groupRef.current) return;
    if (transitionTarget !== null) return;

    const pos = posRef.current;
    const d = index - pos;
    const a = Math.abs(d);

    const isHidden = a > 3.5;
    groupRef.current.visible = !isHidden;

    const isMobile = window.innerWidth < 760;
    const R = isMobile ? viewport.width * 0.3 : Math.min(1.15, viewport.width * 0.16);

    // Upward (concave) arc layout
    const targetX = isMobile ? R * d * 1.6 : R * (d * 1.95 + 0.15);
    let targetY = isMobile
      ? R * (0.9 * d + 0.12 * d * d)
      : R * (0.6 * d + 0.14 * d * d);
    const targetZ = R * 0.45 * Math.min(a, 2.5);
    const baseScale = 1 - 0.05 * Math.min(a, 3);
    const targetScale = R * baseScale;
    const targetRotX = -0.55;
    const targetRotY = -0.25 - d * 0.16;
    const targetRotZ = 0.35;

    if (isHidden) {
      curX.current = targetX;
      curY.current = targetY;
      curZ.current = targetZ;
      curScale.current = targetScale;
      curRotX.current = targetRotX;
      curRotY.current = targetRotY;
      curRotZ.current = targetRotZ;
      groupRef.current.position.set(targetX, targetY, targetZ);
      groupRef.current.scale.set(targetScale, targetScale, targetScale);
      groupRef.current.rotation.set(targetRotX, targetRotY, targetRotZ);
      if (isHoveredRef.current) {
        isHoveredRef.current = false;
      }
      return;
    }

    // Intro rise when coming from home
    if (fromHome && introStartRef.current > 0) {
      const elapsed = (performance.now() - introStartRef.current) / 1000;
      const discDelay = index * 0.08;
      const discTime = elapsed - discDelay;
      if (discTime <= 0) {
        targetY -= 3;
      } else if (discTime < 0.85) {
        const p = discTime / 0.85;
        const ease = 1 - Math.pow(1 - p, 3);
        targetY += (1 - ease) * -3;
      }
    }

    // First frame initialization
    if (!initializedRef.current) {
      initializedRef.current = true;
      curX.current = targetX;
      curY.current = fromHome ? targetY - 3 : targetY;
      curZ.current = targetZ;
      curScale.current = targetScale;
      curRotX.current = targetRotX;
      curRotY.current = targetRotY;
      curRotZ.current = targetRotZ;
    }

    // Soft lerping towards arc target each frame (factor 0.12)
    curX.current += (targetX - curX.current) * 0.12;
    curY.current += (targetY - curY.current) * 0.12;
    curZ.current += (targetZ - curZ.current) * 0.12;
    curScale.current += (targetScale - curScale.current) * 0.12;
    curRotX.current += (targetRotX - curRotX.current) * 0.12;
    curRotY.current += (targetRotY - curRotY.current) * 0.12;
    curRotZ.current += (targetRotZ - curRotZ.current) * 0.12;

    // Reset hover when no longer centred or dragging
    if ((a >= 0.45 || movedRef.current) && isHoveredRef.current) {
      isHoveredRef.current = false;
      targetTiltX.current = 0;
      targetTiltY.current = 0;
      document.body.style.cursor = 'auto';
    }

    const isHovered = isHoveredRef.current && a < 0.45 && !movedRef.current;
    const lerpRate = isHovered ? 0.15 : 0.08;

    hoverFactor.current += ((isHovered ? 1 : 0) - hoverFactor.current) * lerpRate;
    curTiltX.current += (targetTiltX.current - curTiltX.current) * lerpRate;
    curTiltY.current += (targetTiltY.current - curTiltY.current) * lerpRate;

    // Final position: bring forward z += 0.2R and scale × 1.04 when hovered
    const finalX = curX.current;
    const finalY = curY.current;
    const finalZ = curZ.current + 0.2 * R * hoverFactor.current;
    const finalScale = curScale.current * (1 + 0.04 * hoverFactor.current);
    const finalRotX = curRotX.current + curTiltX.current * hoverFactor.current;
    const finalRotY = curRotY.current + curTiltY.current * hoverFactor.current;
    const finalRotZ = curRotZ.current;

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
    if (!groupRef.current?.visible) return;
    const d = index - posRef.current;
    const a = Math.abs(d);
    if (a >= 0.45 || movedRef.current || transitionTarget !== null) {
      if (isHoveredRef.current) {
        handlePointerOut();
      }
      return;
    }
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
    if (!groupRef.current?.visible) return;
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
    if (!groupRef.current?.visible) return;
    e.stopPropagation();
    if (movedRef.current || transitionTarget !== null) return;
    const d = index - posRef.current;
    const a = Math.abs(d);
    if (a < 0.45) {
      onSelect(project.slug, index);
    } else {
      targetRef.current = index;
    }
  };

  const isOutlineActive = () => {
    const d = index - posRef.current;
    const a = Math.abs(d);
    return isHoveredRef.current && a < 0.45 && !movedRef.current && transitionTarget === null;
  };

  return (
    <group ref={groupRef}>
      {/* Artwork sub-group that drifts around its own axis */}
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
        <DiscWobbleOutline activeRef={isOutlineActive} outlineColor={outlineColor} />
      </group>
    </group>
  );
}
