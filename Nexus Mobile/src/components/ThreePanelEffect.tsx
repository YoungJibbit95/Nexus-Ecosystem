import React, { useCallback, useEffect, useRef, useState } from "react";

type ThreePanelEffectProps = {
  mode: "glass" | "glow" | "liquid";
  quality?: "fidelity" | "performance";
  colorA: string;
  colorB: string;
  intensity: number;
  depth?: number;
  reflection?: boolean;
  active: boolean;
};

const hexToRgb01 = (hex: string) => {
  const value = String(hex || "").replace("#", "").trim();
  const fallback = [0.45, 0.55, 1];
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return fallback;
  return [
    parseInt(value.slice(0, 2), 16) / 255,
    parseInt(value.slice(2, 4), 16) / 255,
    parseInt(value.slice(4, 6), 16) / 255,
  ];
};

const ACTIVE_WEBGL_IDS = new Set<number>();
let NEXT_WEBGL_ID = 1;
const CONTEXT_LIMIT_LIQUID = 10;
const CONTEXT_LIMIT_DEFAULT = 14;

const acquireWebGlSlot = (
  mode: "glass" | "glow" | "liquid",
  quality: "fidelity" | "performance",
) => {
  const limit =
    mode === "liquid"
      ? quality === "fidelity"
        ? Math.max(4, CONTEXT_LIMIT_LIQUID - 2)
        : CONTEXT_LIMIT_LIQUID
      : CONTEXT_LIMIT_DEFAULT;
  if (ACTIVE_WEBGL_IDS.size >= limit) return null;
  const id = NEXT_WEBGL_ID++;
  ACTIVE_WEBGL_IDS.add(id);
  return id;
};

const releaseWebGlSlot = (id: number | null) => {
  if (id === null) return;
  ACTIVE_WEBGL_IDS.delete(id);
};

export function ThreePanelEffect({
  mode,
  quality = "performance",
  colorA,
  colorB,
  intensity,
  depth = 1.0,
  reflection = false,
  active,
}: ThreePanelEffectProps) {
  const [disabled, setDisabled] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runtimeRef = useRef<{
    renderer: any;
    scene: any;
    camera: any;
    material: any;
    uniforms: any;
  } | null>(null);
  const instanceIdRef = useRef<number | null>(null);
  const resizeObsRef = useRef<ResizeObserver | null>(null);
  const visibilityObsRef = useRef<IntersectionObserver | null>(null);
  const resizeRafRef = useRef(0);
  const rafRef = useRef(0);
  const runningRef = useRef(false);
  const disposedRef = useRef(false);
  const viewportVisibleRef = useRef(true);
  const lastFrameRef = useRef(0);
  const liquidBurstUntilRef = useRef(0);
  const latestRef = useRef({ mode, quality, colorA, colorB, intensity, depth, reflection, active });

  const startLiquidBurst = useCallback((durationMs: number) => {
    const now = performance.now();
    liquidBurstUntilRef.current = Math.max(liquidBurstUntilRef.current, now + durationMs);
  }, []);

  const renderNow = useCallback((timeMs: number) => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    runtime.uniforms.uTime.value = timeMs * 0.001;
    runtime.renderer.render(runtime.scene, runtime.camera);
  }, []);

  const stopLoop = useCallback(() => {
    runningRef.current = false;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  }, []);

  const applyUniforms = useCallback(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    const current = latestRef.current;
    runtime.uniforms.uColorA.value.setRGB(...hexToRgb01(current.colorA));
    runtime.uniforms.uColorB.value.setRGB(...hexToRgb01(current.colorB));
    runtime.uniforms.uIntensity.value = Math.max(0.1, Math.min(2.2, current.intensity));
    runtime.uniforms.uActive.value = current.active ? 1 : 0.55;
    runtime.uniforms.uDepth.value = current.depth ?? 1.0;
    runtime.uniforms.uReflection.value = current.reflection ? 1 : 0;
    runtime.uniforms.uGlowOnly.value = current.mode === "glow" ? 1 : 0;
    runtime.uniforms.uMode.value = current.mode === "glow" ? 1 : current.mode === "liquid" ? 2 : 0;
    runtime.uniforms.uRefraction.value = current.mode === "liquid" ? 1 : 0;
    runtime.uniforms.uChromatic.value =
      current.mode === "liquid"
        ? current.quality === "fidelity"
          ? 0.9
          : 0.72
        : 0;
  }, []);

  const syncLoopState = useCallback(() => {
    const runtime = runtimeRef.current;
    if (!runtime || disposedRef.current) {
      stopLoop();
      return;
    }

    const current = latestRef.current;
    const now = performance.now();
    const liquidWindowActive =
      current.mode === "liquid" &&
      !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches &&
      (current.quality === "fidelity" || now < liquidBurstUntilRef.current);

    const shouldAnimate =
      viewportVisibleRef.current &&
      document.visibilityState !== "hidden" &&
      (current.mode === "glow" || (current.mode === "glass" && current.active) || liquidWindowActive);

    if (shouldAnimate && !runningRef.current) {
      runningRef.current = true;
      lastFrameRef.current = 0;
      rafRef.current = window.requestAnimationFrame((timeMs) => tickRef.current(timeMs));
      return;
    }

    if (!shouldAnimate && runningRef.current) {
      stopLoop();
      renderNow(performance.now());
    }
  }, [renderNow, stopLoop]);

  const tickRef = useRef<(timeMs: number) => void>(() => {});
  tickRef.current = (timeMs: number) => {
    if (disposedRef.current || !runningRef.current) return;

    const current = latestRef.current;
    if (
      current.mode === "liquid" &&
      current.quality !== "fidelity" &&
      timeMs >= liquidBurstUntilRef.current
    ) {
      stopLoop();
      renderNow(timeMs);
      return;
    }

    const targetFps =
      current.mode === "liquid"
        ? current.quality === "fidelity"
          ? current.active
            ? 48
            : 36
          : current.active
            ? 34
            : 24
        : current.mode === "glow"
          ? 45
          : 36;

    if (timeMs - lastFrameRef.current >= 1000 / targetFps) {
      lastFrameRef.current = timeMs;
      renderNow(timeMs);
    }

    rafRef.current = window.requestAnimationFrame((next) => tickRef.current(next));
  };

  useEffect(() => {
    latestRef.current = { mode, quality, colorA, colorB, intensity, depth, reflection, active };
    if (mode === "liquid") {
      startLiquidBurst(quality === "fidelity" ? 1200 : active ? 480 : 120);
    }
    applyUniforms();
    if (!runningRef.current) {
      renderNow(performance.now());
    }
    syncLoopState();
  }, [active, applyUniforms, colorA, colorB, intensity, depth, reflection, mode, quality, renderNow, startLiquidBurst, syncLoopState]);

  useEffect(() => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas || typeof window === "undefined" || runtimeRef.current) return;

    const acquiredId = acquireWebGlSlot(mode, quality);
    if (acquiredId === null) {
      return;
    }

    instanceIdRef.current = acquiredId;
    disposedRef.current = false;

    let removeVisibilityListener: (() => void) | null = null;
    let geometry: any = null;

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      stopLoop();
      setDisabled(true);
    };

    canvas.addEventListener("webglcontextlost", handleContextLost, {
      passive: false,
    });

    void import("three")
      .then((THREE) => {
        try {
          if (disposedRef.current || !canvas.parentElement) return;
          const parent = canvas.parentElement;
          const scene = new THREE.Scene();
          const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
          camera.position.z = 1;

          const uniforms = {
            uTime: { value: 0 },
            uColorA: { value: new THREE.Color(...hexToRgb01(colorA)) },
            uColorB: { value: new THREE.Color(...hexToRgb01(colorB)) },
            uIntensity: { value: Math.max(0.1, Math.min(2.2, intensity)) },
            uActive: { value: active ? 1 : 0.55 },
            uDepth: { value: depth ?? 1.0 },
            uReflection: { value: reflection ? 1 : 0 },
            uGlowOnly: { value: mode === "glow" ? 1 : 0 },
            uMode: { value: mode === "glow" ? 1 : mode === "liquid" ? 2 : 0 },
            uRefraction: { value: mode === "liquid" ? 1 : 0 },
            uChromatic: {
              value:
                mode === "liquid"
                  ? quality === "fidelity"
                    ? 0.9
                    : 0.72
                  : 0,
            },
          };

          const material = new THREE.ShaderMaterial({
            uniforms,
            transparent: true,
            depthWrite: false,
            dithering: false,
            vertexShader: `
              varying vec2 vUv;
              void main() {
                vUv = uv;
                gl_Position = vec4(position.xy, 0.0, 1.0);
              }
            `,
            fragmentShader: `
              precision highp float;
              varying vec2 vUv;
              uniform float uTime;
              uniform vec3 uColorA;
              uniform vec3 uColorB;
              uniform float uIntensity;
              uniform float uActive;
              uniform float uGlowOnly;
              uniform float uDepth;
              uniform float uReflection;
              uniform float uMode;
              uniform float uRefraction;
              uniform float uChromatic;

              float hash(vec2 p) {
                return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
              }

              void main() {
                vec2 uv = vUv;
                float pulse = 0.5 + 0.5 * sin(uTime * 0.85);
                float wave = sin((uv.x + uTime * 0.035) * 7.0) * sin((uv.y - uTime * 0.03) * 5.0);
                vec3 grad = mix(uColorA, uColorB, clamp(uv.y * 0.88 + 0.12 + wave * 0.06, 0.0, 1.0));
                float grain = hash(uv * 110.0) * 0.03 + hash(gl_FragCoord.xy * 0.5) * 0.02;

                float alpha;
                if (uMode > 1.5) {
                  float t = uTime * 0.32;
                  float waveA = sin((uv.x + t) * 9.0) * cos((uv.y - t * 0.8) * 8.0);
                  float waveB = sin((uv.y * 11.0 - t * 1.2) + cos(uv.x * 7.0 + t * 0.5));
                  float liquid = (waveA + waveB) * 0.5;
                  vec2 distortion = vec2(
                    sin((uv.y + t) * 12.0) + cos((uv.x - t) * 10.0),
                    cos((uv.x + t * 0.8) * 11.0) - sin((uv.y - t) * 9.0)
                  ) * (0.0042 * uRefraction * (0.8 + 0.2 * uActive));
                  float edge = 1.0 - min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y)) * 2.0;
                  float rim = smoothstep(0.2, 0.98, edge);
                  vec3 base = mix(uColorA, uColorB, clamp(uv.y + liquid * 0.08 + distortion.y * 8.0, 0.0, 1.0));
                  vec3 splitA = mix(base, uColorA, 0.24 + 0.3 * rim);
                  vec3 splitB = mix(base, uColorB, 0.24 + 0.3 * (1.0 - rim));
                  vec3 shifted = mix(splitA, splitB, clamp(0.5 + distortion.x * 24.0, 0.0, 1.0));
                  grad = mix(base, shifted, clamp(uChromatic, 0.0, 1.0));
                  float highlight = smoothstep(0.18, 1.0, sin((uv.x + uv.y + t * 0.35) * 8.0) * 0.5 + 0.5);
                  float sheen = 0.12 + 0.2 * highlight;
                  alpha = (0.14 + sheen + rim * 0.16) * uIntensity * (0.74 + 0.26 * uActive);
                } else if (uGlowOnly > 0.5) {
                  float edge = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
                  float ring = smoothstep(0.17, 0.03, edge);
                  alpha = ring * (0.25 + 0.45 * pulse) * uIntensity * (0.72 + 0.28 * uActive);
                  grad = mix(grad, vec3(1.0), 0.18);
                } else {
                  // Elegant Glass Mode (uMode == 0) — Clean, polished, no noise
                  // Base glass color gradient
                  vec3 glassBase = mix(uColorA, uColorB, clamp(uv.y, 0.0, 1.0));
                  
                  // Stable reflection line (no moving sweep drift across panels).
                  float sweepCoord = uv.x + uv.y * 0.5;
                  float sweepLine1 = smoothstep(0.06, 0.0, abs(fract(sweepCoord) - 0.5));
                  float sweepLine2 = smoothstep(0.15, 0.0, abs(fract(sweepCoord + 0.2) - 0.5));
                  float sheen = (sweepLine1 * 0.35 + sweepLine2 * 0.12) * uDepth * uReflection;
                  
                  // Clean, soft inner glow
                  float edgeX = min(uv.x, 1.0 - uv.x);
                  float edgeY = min(uv.y, 1.0 - uv.y);
                  float edge = min(edgeX, edgeY) * 2.0;
                  float innerRim = smoothstep(0.4, 0.0, edge) * 0.12 * uDepth;
                  
                  // Combine lighting passes
                  float frosting = grain * 0.6 * uDepth;
                  float lightAdd = sheen + innerRim + frosting;
                  
                  grad = glassBase + lightAdd;
                  
                  // Base alpha provides the tint, lightAdd boosts opacity to simulate solids/reflections
                  float baseAlpha = 0.06 * uDepth;
                  alpha = (baseAlpha + lightAdd * 0.75) * uIntensity * (0.55 + 0.45 * uActive);
                }
                gl_FragColor = vec4(grad, clamp(alpha, 0.0, 1.0));
              }
            `,
          });

          geometry = new THREE.PlaneGeometry(2, 2);
          const mesh = new THREE.Mesh(geometry, material);
          scene.add(mesh);

          const renderer = new THREE.WebGLRenderer({
            canvas,
            alpha: true,
            antialias: false,
            premultipliedAlpha: false,
            powerPreference:
              mode === "liquid" && quality === "fidelity"
                ? "high-performance"
                : "default",
          });
          renderer.setClearColor(0x000000, 0);
          if ("outputColorSpace" in renderer && (THREE as any).SRGBColorSpace) {
            (renderer as any).outputColorSpace = (THREE as any).SRGBColorSpace;
          }

          const resize = () => {
            if (!parent) return;
            const w = Math.max(1, Math.floor(parent.clientWidth));
            const h = Math.max(1, Math.floor(parent.clientHeight));

            const maxPixelRatio =
              mode === "liquid"
                ? (import.meta as any).env?.PROD
                  ? quality === "fidelity"
                    ? 1.06
                    : 0.92
                  : quality === "fidelity"
                    ? 1.2
                    : 1.05
                : (import.meta as any).env?.PROD
                  ? 1.15
                  : 1.35;

            const maxPixels =
              mode === "liquid"
                ? (import.meta as any).env?.PROD
                  ? quality === "fidelity"
                    ? 300000
                    : 170000
                  : quality === "fidelity"
                    ? 420000
                    : 240000
                : (import.meta as any).env?.PROD
                  ? 280000
                  : 380000;

            const basePixelRatio = Math.min(window.devicePixelRatio || 1, maxPixelRatio);
            const estimatedPixels = w * h * basePixelRatio * basePixelRatio;
            const budgetScale =
              estimatedPixels > maxPixels ? Math.sqrt(maxPixels / estimatedPixels) : 1;
            const nextPixelRatio = Math.max(
              mode === "liquid"
                ? quality === "fidelity"
                  ? 0.74
                  : 0.62
                : 0.72,
              basePixelRatio * budgetScale,
            );

            if (Math.abs(renderer.getPixelRatio() - nextPixelRatio) > 0.01) {
              renderer.setPixelRatio(nextPixelRatio);
            }
            renderer.setSize(w, h, false);

            if (mode === "liquid") {
              startLiquidBurst(quality === "fidelity" ? 700 : 140);
            }
            renderNow(performance.now());
            syncLoopState();
          };

          const scheduleResize = () => {
            if (resizeRafRef.current) return;
            resizeRafRef.current = window.requestAnimationFrame(() => {
              resizeRafRef.current = 0;
              resize();
            });
          };

          runtimeRef.current = { renderer, scene, camera, material, uniforms };
          applyUniforms();
          scheduleResize();
          resizeObsRef.current = new ResizeObserver(scheduleResize);
          resizeObsRef.current.observe(parent);

          visibilityObsRef.current = new IntersectionObserver(
            (entries) => {
              viewportVisibleRef.current = entries.some((entry) => entry.isIntersecting);
              syncLoopState();
            },
            { threshold: 0.02 },
          );
          visibilityObsRef.current.observe(parent);

          const visibilityHandler = () => {
            syncLoopState();
          };
          document.addEventListener("visibilitychange", visibilityHandler);
          removeVisibilityListener = () => {
            document.removeEventListener("visibilitychange", visibilityHandler);
          };

          renderNow(0);
          if (mode === "liquid") {
            startLiquidBurst(quality === "fidelity" ? 1300 : 220);
          }
          syncLoopState();
        } catch {
          setDisabled(true);
        }
      })
      .catch(() => {
        setDisabled(true);
      });

    return () => {
      disposedRef.current = true;
      stopLoop();
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      removeVisibilityListener?.();
      if (resizeRafRef.current) {
        cancelAnimationFrame(resizeRafRef.current);
        resizeRafRef.current = 0;
      }
      resizeObsRef.current?.disconnect();
      resizeObsRef.current = null;
      visibilityObsRef.current?.disconnect();
      visibilityObsRef.current = null;
      geometry?.dispose?.();
      runtimeRef.current?.material?.dispose?.();
      runtimeRef.current?.renderer?.dispose?.();
      runtimeRef.current = null;
      releaseWebGlSlot(instanceIdRef.current);
      instanceIdRef.current = null;
    };
  }, [active, applyUniforms, disabled, mode, quality, renderNow, startLiquidBurst, stopLoop, syncLoopState]);

  if (disabled) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: mode === "glow" ? -3 : 0,
        width: mode === "glow" ? "calc(100% + 6px)" : "100%",
        height: mode === "glow" ? "calc(100% + 6px)" : "100%",
        left: mode === "glow" ? -3 : 0,
        top: mode === "glow" ? -3 : 0,
        pointerEvents: "none",
        zIndex: mode === "glow" ? -1 : mode === "liquid" ? 2 : 1,
        borderRadius: "inherit",
        mixBlendMode: mode === "glow" ? "screen" : mode === "liquid" ? "screen" : "normal",
        transform: "translateZ(0)",
      }}
    />
  );
}
