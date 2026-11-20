import React, { useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';

interface PointSceneProps {
  positions: Float32Array;
  intro: boolean;
  settleTriggerRef?: React.MutableRefObject<(() => void) | null>;
  onLeaveComplete: () => void;
  leaveRef: React.MutableRefObject<(() => void) | null>;
  pointerPosRef?: React.MutableRefObject<{ x: number; y: number }>;
}

const vertexShader = /* glsl */ `
  uniform float uDpr;
  uniform float uAlphaMul;
  uniform float uIntro;
  uniform float uLeave;
  uniform vec2 uMouse;
  uniform float uAspect;

  varying float vAlpha;
  varying float vPointSize;

  // Zero-trig hash for float ID
  float hash1(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
  }

  vec4 hash4(float id) {
    return vec4(
      hash1(id + 1.0),
      hash1(id + 17.13),
      hash1(id + 53.71),
      hash1(id + 91.37)
    );
  }

  void main() {
    vec4 rnd = hash4(float(gl_VertexID));

    // Gentle settle: each point starts at real position plus random offset (up to 0.15 units)
    vec3 offset = (rnd.xyz * 2.0 - 1.0) * 0.15;
    vec3 startPos = position + offset;

    float delay = rnd.z;

    // Eases into place over 1.2 s (uIntro 0 -> 1, same delay-hash idea)
    float tIntro = clamp((uIntro - delay * 0.4) / 0.6, 0.0, 1.0);
    vec3 curPos = mix(startPos, position, tIntro);

    // 2. Leave transition: points drift upward by (uLeave - delay * 0.5) * 6.0 units
    float tLeave = max(0.0, uLeave - delay * 0.5);
    curPos.y += tLeave * 6.0;

    // ModelView transformation
    vec4 mvPosition = modelViewMatrix * vec4(curPos, 1.0);
    float distZ = max(0.001, -mvPosition.z);

    // Point size: compute in CSS px, then convert, with a low cap:
    float css = clamp(2.2 / distZ, 0.8, 1.4);
    gl_PointSize = max(1.0, css * uDpr);
    vPointSize = gl_PointSize;

    // Colour alpha: clamp(1.6 / dist, 0.25, 1.0) * uAlphaMul
    float baseAlpha = clamp(1.6 / distZ, 0.25, 1.0) * uAlphaMul;
    float leaveFade = clamp(1.0 - tLeave * 2.0, 0.0, 1.0) * clamp(1.0 - uLeave, 0.0, 1.0);
    vAlpha = baseAlpha * leaveFade;

    // Clip space position
    vec4 clipPos = projectionMatrix * mvPosition;

    // 3. Mouse repel: within 0.12 (aspect-corrected) of pointer, push outward by (1 - dist / 0.12) * 0.03
    if (uMouse.x > -500.0 && clipPos.w > 0.0) {
      vec2 ndc = clipPos.xy / clipPos.w;
      vec2 diff = ndc - uMouse;
      vec2 aspectDiff = vec2(diff.x * uAspect, diff.y);
      float dist = length(aspectDiff);
      if (dist < 0.12 && dist > 0.0001) {
        vec2 repelDir = aspectDiff / dist;
        float repelAmount = (1.0 - dist / 0.12) * 0.03;
        vec2 ndcOffset = vec2(repelDir.x / uAspect, repelDir.y) * repelAmount;
        clipPos.xy += ndcOffset * clipPos.w;
      }
    }

    gl_Position = clipPos;
  }
`;

const fragmentShader = /* glsl */ `
  varying float vAlpha;
  varying float vPointSize;

  void main() {
    // Only cut the point round when it's big enough to matter.
    // Skip the circle discard when gl_PointSize < 3.0 and draw a hard-edged square/pixel instead. No soft falloff.
    if (vPointSize >= 3.0) {
      vec2 coord = gl_PointCoord - vec2(0.5);
      if (length(coord) > 0.5) discard;
    }
    gl_FragColor = vec4(1.0, 1.0, 1.0, vAlpha);
  }
`;

function PointsContent({
  positions,
  intro,
  settleTriggerRef,
  onLeaveComplete,
  leaveRef,
  pointerPosRef,
}: PointSceneProps) {
  const { size } = useThree();
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const startTimeRef = useRef(performance.now());
  const parallaxRef = useRef({ x: 0, y: 0 });
  const mouseNDCRef = useRef({ x: -999, y: -999 });
  const isLeavingRef = useRef(false);

  // BufferGeometry setup
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const isMobileOrLowEnd =
      window.innerWidth < 700 ||
      (typeof navigator !== 'undefined' &&
        navigator.hardwareConcurrency !== undefined &&
        navigator.hardwareConcurrency <= 4);

    const count = isMobileOrLowEnd ? 250000 : 600000;
    geo.setDrawRange(0, count);
    return geo;
  }, [positions]);

  // Uniforms
  const uniforms = useMemo(
    () => ({
      uDpr: { value: Math.min(window.devicePixelRatio || 1, 2) },
      uAlphaMul: { value: size.width < 760 ? 0.62 : 0.55 },
      uIntro: { value: intro ? 0.0 : 1.0 },
      uLeave: { value: 0.0 },
      uMouse: { value: new THREE.Vector2(-999, -999) },
      uAspect: { value: size.width / size.height },
    }),
    [intro, size]
  );

  // Expose settle animation trigger
  useEffect(() => {
    if (settleTriggerRef) {
      settleTriggerRef.current = () => {
        if (!materialRef.current) return;
        materialRef.current.uniforms.uIntro.value = 0.0;
        gsap.to(materialRef.current.uniforms.uIntro, {
          value: 1.0,
          duration: 1.2,
          ease: 'power3.out',
        });
      };
    }
    return () => {
      if (settleTriggerRef) {
        settleTriggerRef.current = null;
      }
    };
  }, [settleTriggerRef]);

  // Leave trigger
  useEffect(() => {
    leaveRef.current = () => {
      if (isLeavingRef.current || !materialRef.current) return;
      isLeavingRef.current = true;
      gsap.to(materialRef.current.uniforms.uLeave, {
        value: 1.0,
        duration: 1.4,
        ease: 'power2.in',
        onComplete: onLeaveComplete,
      });
    };

    return () => {
      leaveRef.current = null;
    };
  }, [leaveRef, onLeaveComplete]);

  // Frame loop: Camera orbit, parallax, mouse repel smoothing
  useFrame((state) => {
    const elapsed = performance.now() - startTimeRef.current;
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Portrait screens (width / height < 1): orbit radius 7.6 (desktop 4.6), height 1.15 (desktop 0.75), lookAt (0, 0.5, 0)
    const isPortrait = state.size.width / state.size.height < 1.0;
    const isMobile = state.size.width < 760;

    const orbitRadius = isPortrait ? 7.6 : 4.6;
    const orbitHeight = isPortrait ? 1.15 : 0.75;
    const lookAtY = isPortrait ? 0.5 : 0.45;

    // ang = 0.4 + elapsed * 0.00004 rad/ms (fixed at 0.4 for reduced motion)
    const ang = still ? 0.4 : 0.4 + elapsed * 0.00004;
    const baseX = Math.sin(ang) * orbitRadius;
    const baseY = orbitHeight;
    const baseZ = Math.cos(ang) * orbitRadius;

    // Mouse parallax: offset camera ±0.25 in x and ±0.12 in y towards pointer (lerp 0.04)
    const targetCamX = state.pointer.x * 0.25;
    const targetCamY = state.pointer.y * 0.12;
    parallaxRef.current.x += (targetCamX - parallaxRef.current.x) * 0.04;
    parallaxRef.current.y += (targetCamY - parallaxRef.current.y) * 0.04;

    state.camera.position.set(
      baseX + parallaxRef.current.x,
      baseY + parallaxRef.current.y,
      baseZ
    );
    state.camera.lookAt(0, lookAtY, 0);

    // Smooth uMouse in JS (lerp 0.15) so it feels liquid
    const targetX = pointerPosRef?.current?.x ?? state.pointer.x;
    const targetY = pointerPosRef?.current?.y ?? state.pointer.y;

    if (targetX < -500) {
      mouseNDCRef.current.x += (-999 - mouseNDCRef.current.x) * 0.15;
      mouseNDCRef.current.y += (-999 - mouseNDCRef.current.y) * 0.15;
    } else {
      mouseNDCRef.current.x += (targetX - mouseNDCRef.current.x) * 0.15;
      mouseNDCRef.current.y += (targetY - mouseNDCRef.current.y) * 0.15;
    }

    if (materialRef.current) {
      materialRef.current.uniforms.uMouse.value.set(
        mouseNDCRef.current.x,
        mouseNDCRef.current.y
      );
      materialRef.current.uniforms.uAspect.value = state.size.width / state.size.height;
      materialRef.current.uniforms.uDpr.value = Math.min(window.devicePixelRatio || 1, 2);
      materialRef.current.uniforms.uAlphaMul.value = isMobile ? 0.62 : 0.55;
    }
  });

  return (
    <points geometry={geometry}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
      />
    </points>
  );
}

export function PointScene(props: PointSceneProps) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{
        fov: 50,
        position: [Math.sin(0.4) * 4.6, 0.75, Math.cos(0.4) * 4.6],
      }}
      gl={{ alpha: false, antialias: false }}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        background: '#000',
        pointerEvents: 'none',
      }}
    >
      <PointsContent {...props} />
    </Canvas>
  );
}
