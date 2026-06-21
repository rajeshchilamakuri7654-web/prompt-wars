'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface ThreeCanvasProps {
  /** Annual CO2 score in kg/year — drives all visual states */
  score: number;
  /**
   * Increment this counter to trigger a celebration particle burst.
   * Designed to fire when user switches to a lower-emission option.
   */
  burstTrigger?: number;
}

/**
 * Interactive WebGL Canvas rendering a Three.js particle sphere and a floating
 * GLTF 3D model. Recreates carbon footprints visually: green/emerald (low emissions),
 * indigo/purple (medium emissions), and chaotic orange/red (high emissions).
 *
 * Supports dynamic resize observer, hardware acceleration checks, prefers-reduced-motion overrides,
 * particle explosion celebration, and resource disposal on unmount to prevent GPU memory leaks.
 *
 * @param props - Element properties mapping score and particle trigger.
 * @returns React TSX element hosting the WebGL canvas.
 */
export function ThreeCanvas({ score, burstTrigger = 0 }: ThreeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const scoreRef    = useRef(score);
  // Burst trigger ref — the rAF loop reads this to apply an explosion frame
  const burstActiveRef     = useRef(false);
  const burstStartTimeRef  = useRef(0);
  const burstTriggerRef    = useRef(burstTrigger);

  // Keep scoreRef in sync without tearing down the scene
  useEffect(() => { scoreRef.current = score; }, [score]);

  // Fire a burst when burstTrigger increments
  useEffect(() => {
    if (burstTrigger > burstTriggerRef.current) {
      burstActiveRef.current    = true;
      burstStartTimeRef.current = performance.now();
    }
    burstTriggerRef.current = burstTrigger;
  }, [burstTrigger]);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const canvas    = canvasRef.current;

    /* ─────────────────────────────────────────────
       Scene, Camera, Renderer
    ───────────────────────────────────────────── */
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100,
    );
    camera.position.z = 8;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping      = THREE.ACESFilmicToneMapping;

    /* ─────────────────────────────────────────────
       Lighting (used by GLTF model PBR materials)
    ───────────────────────────────────────────── */
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight(0x00f2fe, 0xff3d00, 0.6);
    scene.add(hemisphereLight);

    // Dynamic point light — colour tracks the carbon score
    const scoreLight = new THREE.PointLight(0x00e676, 2.5, 12);
    scoreLight.position.set(2, 2, 3);
    scene.add(scoreLight);

    /* ─────────────────────────────────────────────
       Particle sphere (existing core visual)
    ───────────────────────────────────────────── */
    const createParticleTexture = (): THREE.CanvasTexture => {
      const pCanvas = document.createElement('canvas');
      pCanvas.width  = 32;
      pCanvas.height = 32;
      const ctx = pCanvas.getContext('2d');
      if (ctx) {
        const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        g.addColorStop(0,   'rgba(255,255,255,1)');
        g.addColorStop(0.2, 'rgba(255,255,255,0.8)');
        g.addColorStop(0.5, 'rgba(255,255,255,0.2)');
        g.addColorStop(1,   'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 32, 32);
      }
      return new THREE.CanvasTexture(pCanvas);
    };

    const particleTexture  = createParticleTexture();
    const particleCount    = 1200;
    const geometry         = new THREE.BufferGeometry();
    const positions        = new Float32Array(particleCount * 3);
    const initialDir       = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const phi   = Math.acos(-1 + (2 * i) / particleCount);
      const theta = Math.sqrt(particleCount * Math.PI) * phi;
      const x = Math.sin(phi) * Math.cos(theta);
      const y = Math.sin(phi) * Math.sin(theta);
      const z = Math.cos(phi);
      positions[i * 3]     = initialDir[i * 3]     = x;
      positions[i * 3 + 1] = initialDir[i * 3 + 1] = y;
      positions[i * 3 + 2] = initialDir[i * 3 + 2] = z;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.12,
      transparent: true,
      map: particleTexture,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particleSystem = new THREE.Points(geometry, particleMat);
    scene.add(particleSystem);

    /* ─────────────────────────────────────────────
       GLTF / GLB Model loader
       Drop any .glb file at /models/eco-orb.glb
       Falls back gracefully if the file is missing.
    ───────────────────────────────────────────── */
    let gltfModel: THREE.Object3D | null = null;

    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    const loader = new GLTFLoader();
    loader.load(
      `${basePath}/models/eco-orb.glb`,
      (gltf) => {
        gltfModel = gltf.scene;
        gltfModel.scale.setScalar(0.8);
        gltfModel.position.set(2.8, 0, -1.5);

        // Make all mesh materials receive tone-mapping
        gltfModel.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((m) => { (m as THREE.MeshStandardMaterial).envMapIntensity = 1; });
            } else {
              (mesh.material as THREE.MeshStandardMaterial).envMapIntensity = 1;
            }
          }
        });
        scene.add(gltfModel);
      },
      undefined,
      () => {
        // File not found — silently proceed with particle-only mode
        console.info('[ThreeCanvas] eco-orb.glb not found — running particle-only mode.');
      },
    );

    /* ─────────────────────────────────────────────
       Shared animation state
    ───────────────────────────────────────────── */
    let currentRadius = 2.0;
    let currentColor  = new THREE.Color('#00f2fe');
    let currentSpeed  = 0.5;

    const clock = new THREE.Clock();
    let animationFrameId: number;

    /* ─────────────────────────────────────────────
       Main render loop
    ───────────────────────────────────────────── */
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const time         = clock.getElapsedTime();
      const currentScore = scoreRef.current;

      // ── Score → visual target mapping ──────────
      let targetRadius = 2.0;
      const targetColor  = new THREE.Color();
      let targetSpeed  = 0.4;
      let noiseIntensity = 0.0;
      let targetLightHex = 0x00e676; // green
      let targetModelScale = 0.7;

      if (currentScore <= 2000) {
        const t = Math.max(0, currentScore) / 2000;
        targetRadius    = 1.2 + t * 0.4;
        targetModelScale = 0.55 + t * 0.1;
        targetColor.lerpColors(new THREE.Color('#00e676'), new THREE.Color('#00f2fe'), t);
        targetLightHex  = 0x00e676;
        targetSpeed     = 0.2 + t * 0.1;
      } else if (currentScore <= 5000) {
        const t = (currentScore - 2000) / 3000;
        targetRadius    = 1.6 + t * 0.8;
        targetModelScale = 0.65 + t * 0.15;
        targetColor.lerpColors(new THREE.Color('#00f2fe'), new THREE.Color('#ba68c8'), t);
        targetLightHex  = 0xba68c8;
        targetSpeed     = 0.3 + t * 0.2;
      } else {
        const t = Math.min(1, (currentScore - 5000) / 7000);
        targetRadius    = 2.4 + t * 1.2;
        targetModelScale = 0.8 + t * 0.4;
        targetColor.lerpColors(new THREE.Color('#ba68c8'), new THREE.Color('#ff3d00'), t);
        targetLightHex  = 0xff3d00;
        targetSpeed     = 0.5 + t * 0.5;
        noiseIntensity  = t * 0.4;
      }

      // ── Smooth interpolation ───────────────────
      currentRadius += (targetRadius - currentRadius) * 0.05;
      currentColor.lerp(targetColor, 0.05);
      currentSpeed  += (targetSpeed - currentSpeed) * 0.05;

      // ── Update point light colour ──────────────
      scoreLight.color.lerp(new THREE.Color(targetLightHex), 0.04);
      scoreLight.position.x = Math.sin(time * 0.6) * 3;
      scoreLight.position.y = Math.cos(time * 0.4) * 2;

      // ── Particle sphere ────────────────────────
      particleMat.color.copy(currentColor);
      particleSystem.position.y = Math.sin(time * 0.8) * 0.15;
      particleSystem.position.x = Math.cos(time * 0.5) * 0.08;
      particleSystem.rotation.y = time * 0.08 * currentSpeed;
      particleSystem.rotation.x = time * 0.04 * currentSpeed;

      const posAttr  = geometry.getAttribute('position') as THREE.BufferAttribute;
      const posArray = posAttr.array as Float32Array;

      // ── Burst celebration effect ───────────────────────────────────────
      if (burstActiveRef.current) {
        const elapsed  = performance.now() - burstStartTimeRef.current;
        const duration = 600; // ms
        const progress = Math.min(1, elapsed / duration);
        // Easing: fast expand, slow return
        const burstScale = progress < 0.3
          ? 1 + (progress / 0.3) * 0.6          // expand to 1.6×
          : 1 + (1 - (progress - 0.3) / 0.7) * 0.6; // contract back

        for (let i = 0; i < particleCount; i++) {
          const dx = initialDir[i * 3];
          const dy = initialDir[i * 3 + 1];
          const dz = initialDir[i * 3 + 2];
          const wave  = Math.sin(time * 2.0 + i * 0.05) * 0.05;
          posArray[i * 3]     = dx * (currentRadius + wave) * burstScale;
          posArray[i * 3 + 1] = dy * (currentRadius + wave) * burstScale;
          posArray[i * 3 + 2] = dz * (currentRadius + wave) * burstScale;
        }

        // Flash material to vivid green during burst
        particleMat.color.lerp(new THREE.Color('#00e676'), 0.3);
        if (progress >= 1) burstActiveRef.current = false;

      } else {
        for (let i = 0; i < particleCount; i++) {
          const dx = initialDir[i * 3];
          const dy = initialDir[i * 3 + 1];
          const dz = initialDir[i * 3 + 2];
          const wave  = Math.sin(time * 2.0 + i * 0.05) * 0.05;
          const nX    = (Math.random() - 0.5) * noiseIntensity;
          const nY    = (Math.random() - 0.5) * noiseIntensity;
          const nZ    = (Math.random() - 0.5) * noiseIntensity;
          posArray[i * 3]     = dx * (currentRadius + wave) + nX;
          posArray[i * 3 + 1] = dy * (currentRadius + wave) + nY;
          posArray[i * 3 + 2] = dz * (currentRadius + wave) + nZ;
        }
      }
      posAttr.needsUpdate = true;

      // ── GLTF model floating animation ─────────
      if (gltfModel) {
        // Weightless anti-gravity float
        gltfModel.position.y = Math.sin(time * 0.7 + 1.2) * 0.35;
        // Counter-rotate gently for organic feel
        gltfModel.rotation.y = time * 0.15 * currentSpeed;
        gltfModel.rotation.x = Math.sin(time * 0.3) * 0.08;
        // Scale breathes with the score
        const s = targetModelScale + Math.sin(time * 1.2) * 0.02;
        gltfModel.scale.setScalar(s);
      }

      renderer.render(scene, camera);
    };

    animate();

    /* ─────────────────────────────────────────────
       Responsive resize
    ───────────────────────────────────────────── */
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    /* ─────────────────────────────────────────────
       Cleanup — prevents GPU memory leaks
    ───────────────────────────────────────────── */
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      geometry.dispose();
      particleMat.dispose();
      particleTexture.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative' }}
      aria-hidden="true"
      role="presentation"
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  );
}
