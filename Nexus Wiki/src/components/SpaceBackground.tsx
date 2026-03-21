import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { memo, useEffect, useState, useRef } from "react";

export const SpaceBackground = memo(function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const [reducedMotion, setReducedMotion] = useState(false);

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

  const springConfig = { damping: 50, stiffness: 100 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  const xOffset1 = useTransform(
    smoothX,
    [0, typeof window !== "undefined" ? window.innerWidth : 1000],
    reducedMotion ? [-6, 6] : [-15, 15],
  );
  const yOffset1 = useTransform(
    smoothY,
    [0, typeof window !== "undefined" ? window.innerHeight : 1000],
    reducedMotion ? [-6, 6] : [-15, 15],
  );

  const xOffset2 = useTransform(
    smoothX,
    [0, typeof window !== "undefined" ? window.innerWidth : 1000],
    reducedMotion ? [-12, 12] : [-30, 30],
  );
  const yOffset2 = useTransform(
    smoothY,
    [0, typeof window !== "undefined" ? window.innerHeight : 1000],
    reducedMotion ? [-12, 12] : [-30, 30],
  );

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      mouseX.set(event.clientX);
      mouseY.set(event.clientY);
    };

    if (!reducedMotion) {
      window.addEventListener("mousemove", handleMouseMove, { passive: true });
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return () => {
        if (!reducedMotion) window.removeEventListener("mousemove", handleMouseMove);
      };
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return () => {
        if (!reducedMotion) window.removeEventListener("mousemove", handleMouseMove);
      };
    }

    let animationFrameId = 0;
    let isAnimating = false;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const setCanvasSize = () => {
      width = window.innerWidth;
      height = window.innerHeight;

      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    setCanvasSize();
    window.addEventListener("resize", setCanvasSize);

    const viewportFactor = Math.min(1.35, Math.max(0.7, (width * height) / 1_400_000));
    const baseStarCount = reducedMotion ? 180 : window.innerWidth < 900 ? 340 : 620;
    const numStars = Math.round(baseStarCount * viewportFactor);

    const colors = ["#ffffff", "#e2e8f0", "#94a3b8", "#38bdf8", "#818cf8", "#f472b6", "#a78bfa"];
    const stars: Array<{
      x: number;
      y: number;
      radius: number;
      vx: number;
      vy: number;
      alpha: number;
      dAlpha: number;
      color: string;
    }> = [];

    for (let index = 0; index < numStars; index += 1) {
      const drift = reducedMotion ? 0.018 : 0.05;
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * (reducedMotion ? 1.2 : 1.5) + 0.4,
        vx: (Math.random() - 0.5) * drift,
        vy: (Math.random() - 0.5) * drift,
        alpha: Math.random(),
        dAlpha: (Math.random() * 0.015 - 0.0075) * (reducedMotion ? 0.5 : 1),
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    const shootingStars: Array<{
      x: number;
      y: number;
      length: number;
      speed: number;
      angle: number;
      active: boolean;
      opacity: number;
    }> = [];

    if (!reducedMotion) {
      for (let index = 0; index < 2; index += 1) {
        shootingStars.push({ x: 0, y: 0, length: 0, speed: 0, angle: 0, active: false, opacity: 0 });
      }
    }

    const draw = () => {
      if (!isAnimating) return;

      ctx.clearRect(0, 0, width, height);

      stars.forEach((star) => {
        star.x += star.vx;
        star.y += star.vy;
        star.alpha += star.dAlpha;

        if (star.alpha <= 0.1 || star.alpha >= 1) star.dAlpha *= -1;
        if (star.x < 0) star.x = width;
        if (star.x > width) star.x = 0;
        if (star.y < 0) star.y = height;
        if (star.y > height) star.y = 0;

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = star.color;
        ctx.globalAlpha = Math.max(0, Math.min(1, star.alpha));
        ctx.fill();
      });

      ctx.globalAlpha = 1;

      if (!reducedMotion) {
        shootingStars.forEach((shootingStar) => {
          if (!shootingStar.active) {
            if (Math.random() < 0.0016) {
              shootingStar.active = true;
              shootingStar.x = Math.random() * width;
              shootingStar.y = Math.random() * (height / 2);
              shootingStar.length = Math.random() * 100 + 50;
              shootingStar.speed = Math.random() * 15 + 10;
              shootingStar.angle = Math.PI / 4 + (Math.random() * 0.2 - 0.1);
              shootingStar.opacity = 1;
            }
          } else {
            shootingStar.x += Math.cos(shootingStar.angle) * shootingStar.speed;
            shootingStar.y += Math.sin(shootingStar.angle) * shootingStar.speed;
            shootingStar.opacity -= 0.015;

            if (shootingStar.opacity <= 0 || shootingStar.x > width || shootingStar.y > height) {
              shootingStar.active = false;
            } else {
              const gradient = ctx.createLinearGradient(
                shootingStar.x,
                shootingStar.y,
                shootingStar.x - Math.cos(shootingStar.angle) * shootingStar.length,
                shootingStar.y - Math.sin(shootingStar.angle) * shootingStar.length,
              );
              gradient.addColorStop(0, `rgba(255, 255, 255, ${shootingStar.opacity})`);
              gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

              ctx.beginPath();
              ctx.moveTo(shootingStar.x, shootingStar.y);
              ctx.lineTo(
                shootingStar.x - Math.cos(shootingStar.angle) * shootingStar.length,
                shootingStar.y - Math.sin(shootingStar.angle) * shootingStar.length,
              );
              ctx.strokeStyle = gradient;
              ctx.lineWidth = 2;
              ctx.stroke();
            }
          }
        });
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    const startAnimation = () => {
      if (isAnimating) return;
      isAnimating = true;
      animationFrameId = requestAnimationFrame(draw);
    };

    const stopAnimation = () => {
      isAnimating = false;
      cancelAnimationFrame(animationFrameId);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stopAnimation();
      } else {
        startAnimation();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    startAnimation();

    return () => {
      stopAnimation();
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("resize", setCanvasSize);
      if (!reducedMotion) window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [mouseX, mouseY, reducedMotion]);

  const cursorX = useSpring(mouseX, { damping: 25, stiffness: 120 });
  const cursorY = useSpring(mouseY, { damping: 25, stiffness: 120 });

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black opacity-90" />

      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-0" />

      {!reducedMotion ? (
        <>
          <motion.div
            className="absolute w-[40rem] h-[40rem] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none mix-blend-screen z-0"
            style={{
              x: useTransform(cursorX, (value) => value - 320),
              y: useTransform(cursorY, (value) => value - 320),
              willChange: "transform",
            }}
          />
          <motion.div
            className="absolute w-[20rem] h-[20rem] rounded-full bg-cyan-400/10 blur-[80px] pointer-events-none mix-blend-screen z-0"
            style={{
              x: useTransform(cursorX, (value) => value - 160),
              y: useTransform(cursorY, (value) => value - 160),
              willChange: "transform",
            }}
          />
        </>
      ) : null}

      {!reducedMotion ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 150, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[120vw] md:w-[80vw] md:h-[80vw] pointer-events-none opacity-20 mix-blend-screen"
          style={{ willChange: "transform" }}
        >
          <div className="absolute inset-0 bg-[conic-gradient(from_0deg_at_50%_50%,transparent_0deg,#4f46e5_45deg,transparent_90deg,#06b6d4_225deg,transparent_270deg)] rounded-full blur-[80px]" />
          <div className="absolute inset-[20%] bg-[conic-gradient(from_180deg_at_50%_50%,transparent_0deg,#c026d3_45deg,transparent_90deg,#3b82f6_225deg,transparent_270deg)] rounded-full blur-[60px] opacity-50" />
        </motion.div>
      ) : null}

      <motion.div style={{ x: xOffset1, y: yOffset1, willChange: "transform" }} className="absolute inset-0">
        <motion.div
          animate={reducedMotion ? { opacity: [0.1, 0.16, 0.1] } : { scale: [1, 1.2, 1], opacity: [0.15, 0.3, 0.15], rotate: [0, 90, 0] }}
          transition={{ duration: reducedMotion ? 30 : 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-indigo-900/40 blur-[120px]"
          style={{ willChange: "transform, opacity" }}
        />
        <motion.div
          animate={
            reducedMotion
              ? { opacity: [0.08, 0.16, 0.08] }
              : { scale: [1, 1.5, 1], opacity: [0.1, 0.25, 0.1], rotate: [0, -90, 0] }
          }
          transition={{ duration: reducedMotion ? 34 : 25, repeat: Infinity, ease: "linear" }}
          className="absolute top-[30%] -right-[10%] w-[50%] h-[70%] rounded-full bg-fuchsia-900/30 blur-[120px]"
          style={{ willChange: "transform, opacity" }}
        />
      </motion.div>

      <motion.div style={{ x: xOffset2, y: yOffset2, willChange: "transform" }} className="absolute inset-0">
        <motion.div
          animate={
            reducedMotion
              ? { opacity: [0.1, 0.18, 0.1] }
              : { scale: [1, 1.3, 1], opacity: [0.15, 0.3, 0.15], y: [0, 50, 0] }
          }
          transition={{ duration: reducedMotion ? 22 : 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-[20%] left-[20%] w-[60%] h-[50%] rounded-full bg-cyan-900/30 blur-[120px]"
          style={{ willChange: "transform, opacity" }}
        />
      </motion.div>

      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
    </div>
  );
});
