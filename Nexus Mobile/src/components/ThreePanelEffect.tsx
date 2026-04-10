import React, { useCallback, useEffect, useRef, useState } from "react";

type ThreePanelEffectProps = {
  mode: "glass" | "glow";
  colorA: string;
  colorB: string;
  intensity: number;
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

export function ThreePanelEffect({
  mode,
  colorA,
  colorB,
  intensity,
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
  const resizeObsRef = useRef<ResizeObserver | null>(null);
  const resizeRafRef = useRef(0);
  const rafRef = useRef(0);
  const runningRef = useRef(false);
  const disposedRef = useRef(false);
  const lastFrameRef = useRef(0);
  const latestRef = useRef({ mode, colorA, colorB, intensity, active });

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
    runtime.uniforms.uGlowOnly.value = current.mode === "glow" ? 1 : 0;
  }, []);

  const tickRef = useRef<(timeMs: number) => void>(() => {});
  tickRef.current = (timeMs: number) => {
    if (disposedRef.current || !runningRef.current) return;
    if (timeMs - lastFrameRef.current >= 1000 / 45) {
      lastFrameRef.current = timeMs;
      renderNow(timeMs);
    }
    rafRef.current = window.requestAnimationFrame((next) => tickRef.current(next));
  };

  const syncLoopState = useCallback(() => {
    const runtime = runtimeRef.current;
    if (!runtime || disposedRef.current) {
      stopLoop();
      return;
    }
    const shouldAnimate =
      (latestRef.current.mode === "glow" || latestRef.current.active) &&
      document.visibilityState !== "hidden";
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

  useEffect(() => {
    latestRef.current = { mode, colorA, colorB, intensity, active };
    applyUniforms();
    syncLoopState();
  }, [active, applyUniforms, colorA, colorB, intensity, mode, syncLoopState]);

  useEffect(() => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas || typeof window === "undefined") return;

    disposedRef.current = false;
    const maxPixelRatio = (import.meta as any).env?.PROD ? 1.15 : 1.35;
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
            uGlowOnly: { value: mode === "glow" ? 1 : 0 },
          };

          const material = new THREE.ShaderMaterial({
            uniforms,
            transparent: true,
            depthWrite: false,
            dithering: true,
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
              if (uGlowOnly > 0.5) {
                float edge = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
                float ring = smoothstep(0.17, 0.03, edge);
                alpha = ring * (0.25 + 0.45 * pulse) * uIntensity * (0.72 + 0.28 * uActive);
                grad = mix(grad, vec3(1.0), 0.18);
              } else {
                float sheen = smoothstep(-0.2, 1.0, uv.x * 1.2 + uv.y * 0.6 + wave * 0.2);
                alpha = (0.075 + 0.11 * sheen + grain) * uIntensity * (0.78 + 0.22 * uActive);
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
            powerPreference: "high-performance",
          });
          renderer.setPixelRatio(
            Math.min(window.devicePixelRatio || 1, maxPixelRatio),
          );
          renderer.setClearColor(0x000000, 0);
          if ("outputColorSpace" in renderer && (THREE as any).SRGBColorSpace) {
            (renderer as any).outputColorSpace = (THREE as any).SRGBColorSpace;
          }

          const resize = () => {
            if (!parent) return;
            const w = Math.max(1, Math.floor(parent.clientWidth));
            const h = Math.max(1, Math.floor(parent.clientHeight));
            const nextPixelRatio = Math.min(
              window.devicePixelRatio || 1,
              maxPixelRatio,
            );
            if (renderer.getPixelRatio() !== nextPixelRatio) {
              renderer.setPixelRatio(nextPixelRatio);
            }
            renderer.setSize(w, h, false);
            renderNow(performance.now());
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

          const visibilityHandler = () => {
            syncLoopState();
          };
          document.addEventListener("visibilitychange", visibilityHandler);
          removeVisibilityListener = () => {
            document.removeEventListener("visibilitychange", visibilityHandler);
          };

          renderNow(0);
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
      geometry?.dispose?.();
      runtimeRef.current?.material?.dispose?.();
      runtimeRef.current?.renderer?.dispose?.();
      runtimeRef.current = null;
    };
  }, [applyUniforms, disabled, renderNow, stopLoop, syncLoopState]);

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
        zIndex: mode === "glow" ? -1 : 1,
        borderRadius: "inherit",
        mixBlendMode: mode === "glow" ? "screen" : "normal",
        transform: "translateZ(0)",
      }}
    />
  );
}
