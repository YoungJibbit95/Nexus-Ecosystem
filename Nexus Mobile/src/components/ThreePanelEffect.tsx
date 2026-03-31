import React, { useEffect, useRef } from "react";

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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === "undefined") return;

    let disposed = false;
    let rafId = 0;
    let resizeObs: ResizeObserver | null = null;
    let renderer: any = null;
    let material: any = null;

    void import("three")
      .then((THREE) => {
        if (disposed || !canvas.parentElement) return;
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

        material = new THREE.ShaderMaterial({
          uniforms,
          transparent: true,
          depthWrite: false,
          vertexShader: `
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = vec4(position.xy, 0.0, 1.0);
            }
          `,
          fragmentShader: `
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
              float wave = sin((uv.x + uTime * 0.05) * 11.0) * sin((uv.y - uTime * 0.04) * 9.0);
              vec3 grad = mix(uColorA, uColorB, clamp(uv.y * 0.9 + 0.1 + wave * 0.08, 0.0, 1.0));
              float noise = hash(uv * 140.0 + uTime * 20.0) * 0.08;

              float alpha;
              if (uGlowOnly > 0.5) {
                float edge = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
                float ring = 1.0 - smoothstep(0.02, 0.16, edge);
                alpha = ring * (0.28 + 0.52 * pulse) * uIntensity * (0.7 + 0.3 * uActive);
                grad = mix(grad, vec3(1.0), 0.18);
              } else {
                float sheen = smoothstep(-0.2, 1.0, uv.x * 1.2 + uv.y * 0.6 + wave * 0.2);
                alpha = (0.08 + 0.12 * sheen + noise) * uIntensity * (0.75 + 0.25 * uActive);
              }
              gl_FragColor = vec4(grad, clamp(alpha, 0.0, 1.0));
            }
          `,
        });

        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
        scene.add(mesh);

        renderer = new THREE.WebGLRenderer({
          canvas,
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));

        const resize = () => {
          if (!parent || !renderer) return;
          const w = Math.max(1, Math.floor(parent.clientWidth));
          const h = Math.max(1, Math.floor(parent.clientHeight));
          renderer.setSize(w, h, false);
        };

        resize();
        resizeObs = new ResizeObserver(resize);
        resizeObs.observe(parent);

        const tick = (time: number) => {
          if (disposed || !renderer || !material) return;
          material.uniforms.uTime.value = time * 0.001;
          renderer.render(scene, camera);
          rafId = window.requestAnimationFrame(tick);
        };
        rafId = window.requestAnimationFrame(tick);
      })
      .catch(() => {});

    return () => {
      disposed = true;
      if (rafId) cancelAnimationFrame(rafId);
      resizeObs?.disconnect();
      if (material) material.dispose?.();
      renderer?.dispose?.();
    };
  }, [active, colorA, colorB, intensity, mode]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: mode === "glow" ? -3 : 0,
        width: "calc(100% + 6px)",
        height: "calc(100% + 6px)",
        left: mode === "glow" ? -3 : 0,
        top: mode === "glow" ? -3 : 0,
        pointerEvents: "none",
        zIndex: mode === "glow" ? -1 : 1,
        borderRadius: "inherit",
        mixBlendMode: mode === "glow" ? "screen" : "normal",
      }}
    />
  );
}

