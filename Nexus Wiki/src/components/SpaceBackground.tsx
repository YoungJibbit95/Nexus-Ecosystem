import { motion } from "motion/react";
import { lazy, memo, Suspense, useEffect, useState } from "react";

const FloatingLines = lazy(() => import("./FloatingLines"));

export const SpaceBackground = memo(function SpaceBackground() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [showLines, setShowLines] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }

    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    type IdleWindow = Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    const idleWindow = window as IdleWindow;
    let timeoutId = 0;
    let idleId = 0;

    const enable = () => setShowLines(true);
    if (reducedMotion) {
      enable();
      return;
    }

    if (typeof idleWindow.requestIdleCallback === "function") {
      idleId = idleWindow.requestIdleCallback(enable, { timeout: 360 });
      return () => {
        if (idleId && typeof idleWindow.cancelIdleCallback === "function") {
          idleWindow.cancelIdleCallback(idleId);
        }
      };
    }

    timeoutId = window.setTimeout(enable, 180);
    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [reducedMotion]);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(15,23,42,0.9)_0%,_rgba(2,6,23,0.95)_55%,_rgba(2,6,23,1)_100%)]" />

      <div className="absolute inset-0 opacity-[0.78] [mask-image:radial-gradient(ellipse_95%_88%_at_50%_50%,black_66%,transparent_100%)]">
        {showLines ? (
          <Suspense fallback={null}>
            <FloatingLines
              enabledWaves={["top", "middle", "bottom"]}
              lineCount={reducedMotion ? [3, 4, 3] : [4, 5, 4]}
              lineDistance={reducedMotion ? [4, 5, 4] : [5, 6, 5]}
              bendRadius={5.6}
              bendStrength={-0.58}
              interactive={!reducedMotion}
              parallax={!reducedMotion}
              parallaxStrength={0.12}
              animationSpeed={reducedMotion ? 0.45 : 0.82}
              linesGradient={["#67e8f9", "#22d3ee", "#818cf8", "#6366f1", "#a78bfa"]}
              mixBlendMode="screen"
              className="absolute inset-0"
            />
          </Suspense>
        ) : null}
      </div>

      <motion.div
        animate={reducedMotion ? undefined : { rotate: 360 }}
        transition={reducedMotion ? undefined : { duration: 110, repeat: Infinity, ease: "linear" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] h-[92vw] max-w-[1200px] max-h-[1200px] opacity-25"
      >
        <div className="absolute inset-[11%] rounded-full border border-cyan-300/10" />
        <div className="absolute inset-[19%] rounded-full border border-indigo-300/10" />
      </motion.div>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_22%,rgba(34,211,238,0.09),transparent_38%),radial-gradient(circle_at_78%_18%,rgba(129,140,248,0.1),transparent_42%),radial-gradient(circle_at_52%_90%,rgba(56,189,248,0.08),transparent_42%)]" />

      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:34px_34px] [mask-image:radial-gradient(ellipse_88%_60%_at_50%_2%,#000_62%,transparent_100%)] opacity-35" />
    </div>
  );
});
