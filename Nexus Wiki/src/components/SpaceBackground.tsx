import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { useEffect, useRef, memo } from "react";

export const SpaceBackground = memo(function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 50, stiffness: 100 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  const xOffset1 = useTransform(smoothX, [0, typeof window !== 'undefined' ? window.innerWidth : 1000], [-15, 15]);
  const yOffset1 = useTransform(smoothY, [0, typeof window !== 'undefined' ? window.innerHeight : 1000], [-15, 15]);
  
  const xOffset2 = useTransform(smoothX, [0, typeof window !== 'undefined' ? window.innerWidth : 1000], [-30, 30]);
  const yOffset2 = useTransform(smoothY, [0, typeof window !== 'undefined' ? window.innerHeight : 1000], [-30, 30]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener("mousemove", handleMouseMove);

    // Canvas Setup for High Performance Stars
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const setCanvasSize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);

    // Star properties
    const numStars = 800;
    const stars: { x: number; y: number; radius: number; vx: number; vy: number; alpha: number; dAlpha: number; color: string }[] = [];
    const colors = ['#ffffff', '#e2e8f0', '#94a3b8', '#38bdf8', '#818cf8', '#f472b6', '#a78bfa'];

    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.5 + 0.5,
        vx: (Math.random() - 0.5) * 0.05,
        vy: (Math.random() - 0.5) * 0.05,
        alpha: Math.random(),
        dAlpha: (Math.random() * 0.015) - 0.0075,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    // Shooting stars
    const shootingStars: { x: number; y: number; length: number; speed: number; angle: number; active: boolean; opacity: number }[] = [];
    for (let i = 0; i < 3; i++) {
      shootingStars.push({ x: 0, y: 0, length: 0, speed: 0, angle: 0, active: false, opacity: 0 });
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw stars
      stars.forEach(star => {
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

      // Draw shooting stars
      shootingStars.forEach(ss => {
        if (!ss.active) {
          if (Math.random() < 0.002) { // Rare occurrence
            ss.active = true;
            ss.x = Math.random() * width;
            ss.y = Math.random() * (height / 2); // Start in top half
            ss.length = Math.random() * 100 + 50;
            ss.speed = Math.random() * 15 + 10;
            ss.angle = Math.PI / 4 + (Math.random() * 0.2 - 0.1); // Angle downwards right
            ss.opacity = 1;
          }
        } else {
          ss.x += Math.cos(ss.angle) * ss.speed;
          ss.y += Math.sin(ss.angle) * ss.speed;
          ss.opacity -= 0.015;

          if (ss.opacity <= 0 || ss.x > width || ss.y > height) {
            ss.active = false;
          } else {
            const gradient = ctx.createLinearGradient(ss.x, ss.y, ss.x - Math.cos(ss.angle) * ss.length, ss.y - Math.sin(ss.angle) * ss.length);
            gradient.addColorStop(0, `rgba(255, 255, 255, ${ss.opacity})`);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.beginPath();
            ctx.moveTo(ss.x, ss.y);
            ctx.lineTo(ss.x - Math.cos(ss.angle) * ss.length, ss.y - Math.sin(ss.angle) * ss.length);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener('resize', setCanvasSize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [mouseX, mouseY]);

  const cursorX = useSpring(mouseX, { damping: 25, stiffness: 120 });
  const cursorY = useSpring(mouseY, { damping: 25, stiffness: 120 });

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-slate-950">
      {/* Deep Space Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black opacity-90" />

      {/* High Performance Canvas Stars */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-0" />

      {/* Interactive Cursor Comet */}
      <motion.div
        className="absolute w-[40rem] h-[40rem] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none mix-blend-screen z-0"
        style={{
          x: useTransform(cursorX, x => x - 320),
          y: useTransform(cursorY, y => y - 320),
          willChange: "transform"
        }}
      />
      <motion.div
        className="absolute w-[20rem] h-[20rem] rounded-full bg-cyan-400/10 blur-[80px] pointer-events-none mix-blend-screen z-0"
        style={{
          x: useTransform(cursorX, x => x - 160),
          y: useTransform(cursorY, y => y - 160),
          willChange: "transform"
        }}
      />

      {/* Slow Spinning Galaxy Core */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 150, repeat: Infinity, ease: "linear" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[120vw] md:w-[80vw] md:h-[80vw] pointer-events-none opacity-20 mix-blend-screen"
        style={{ willChange: "transform" }}
      >
        <div className="absolute inset-0 bg-[conic-gradient(from_0deg_at_50%_50%,transparent_0deg,#4f46e5_45deg,transparent_90deg,#06b6d4_225deg,transparent_270deg)] rounded-full blur-[80px]" />
        <div className="absolute inset-[20%] bg-[conic-gradient(from_180deg_at_50%_50%,transparent_0deg,#c026d3_45deg,transparent_90deg,#3b82f6_225deg,transparent_270deg)] rounded-full blur-[60px] opacity-50" />
      </motion.div>

      {/* Animated Nebulas with Parallax */}
      <motion.div
        style={{ x: xOffset1, y: yOffset1, willChange: "transform" }}
        className="absolute inset-0"
      >
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.15, 0.3, 0.15],
            rotate: [0, 90, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-indigo-900/40 blur-[120px]"
          style={{ willChange: "transform, opacity" }}
        />
        <motion.div
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.1, 0.25, 0.1],
            rotate: [0, -90, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute top-[30%] -right-[10%] w-[50%] h-[70%] rounded-full bg-fuchsia-900/30 blur-[120px]"
          style={{ willChange: "transform, opacity" }}
        />
      </motion.div>

      <motion.div
        style={{ x: xOffset2, y: yOffset2, willChange: "transform" }}
        className="absolute inset-0"
      >
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.15, 0.3, 0.15],
            y: [0, 50, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-[20%] left-[20%] w-[60%] h-[50%] rounded-full bg-cyan-900/30 blur-[120px]"
          style={{ willChange: "transform, opacity" }}
        />
      </motion.div>
      
      {/* Grid Overlay for structure */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
    </div>
  );
});
