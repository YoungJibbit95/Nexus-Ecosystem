export type DevToolsFsFileType = "html" | "css" | "js";

export type DevToolsFsFile = {
  id: string;
  name: string;
  type: DevToolsFsFileType;
  content: string;
};

export type DevToolsViewport = "desktop" | "tablet" | "mobile";

export const DEFAULT_DEVTOOLS_WEB_FILES: DevToolsFsFile[] = [
  {
    id: "index",
    name: "index.html",
    type: "html",
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Project</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <nav class="navbar">
    <div class="logo">Brand</div>
    <div class="nav-links">
      <a href="#">Home</a>
      <a href="#">About</a>
      <a href="#">Work</a>
    </div>
    <button class="btn-primary">Get Started</button>
  </nav>

  <section class="hero">
    <div class="hero-content">
      <h1 class="hero-title">Build <span class="accent">Beautiful</span> Products</h1>
      <p class="hero-sub">A modern design system built for Nexus DevTools.</p>
      <div class="hero-actions">
        <button class="btn-primary">Start Building</button>
        <button class="btn-ghost">View Docs -></button>
      </div>
    </div>
    <div class="hero-visual">
      <div class="card glow">
        <div class="card-icon">Rocket</div>
        <div class="card-title">Launch Ready</div>
        <div class="card-desc">Ship fast with confidence</div>
      </div>
    </div>
  </section>
  <script src="app.js"></script>
</body>
</html>`,
  },
  {
    id: "style",
    name: "style.css",
    type: "css",
    content: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --accent: #007AFF;
  --accent2: #5E5CE6;
  --bg: #0a0a14;
  --surface: rgba(255,255,255,0.07);
  --border: rgba(255,255,255,0.1);
  --text: #ffffff;
  --text-muted: rgba(255,255,255,0.55);
  --radius: 14px;
  --blur: 20px;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: system-ui, -apple-system, sans-serif;
  min-height: 100vh;
}

.navbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 40px;
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(var(--blur));
  border-bottom: 1px solid var(--border);
  position: sticky; top: 0; z-index: 100;
}
.logo { font-size: 18px; font-weight: 900; background: linear-gradient(135deg,var(--accent),var(--accent2)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.nav-links { display: flex; gap: 28px; }
.nav-links a { color: var(--text-muted); text-decoration: none; font-size: 14px; font-weight: 500; transition: color 0.2s; }
.nav-links a:hover { color: var(--text); }

.hero { display: flex; align-items: center; justify-content: space-between; padding: 80px 40px; min-height: 80vh; gap: 40px; }
.hero-title { font-size: 3.5rem; font-weight: 900; line-height: 1.1; letter-spacing: -0.03em; margin-bottom: 16px; }
.accent { background: linear-gradient(135deg,var(--accent),var(--accent2)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.hero-sub { color: var(--text-muted); font-size: 1.1rem; line-height: 1.6; margin-bottom: 32px; max-width: 420px; }
.hero-actions { display: flex; gap: 12px; }

.btn-primary { padding: 12px 24px; border-radius: 10px; background: var(--accent); color: white; font-weight: 700; font-size: 14px; border: none; cursor: pointer; box-shadow: 0 4px 16px rgba(0,122,255,0.4); transition: all 0.2s; }
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,122,255,0.5); }
.btn-ghost { padding: 12px 24px; border-radius: 10px; background: transparent; color: var(--text); font-weight: 600; font-size: 14px; border: 1px solid var(--border); cursor: pointer; transition: all 0.2s; }
.btn-ghost:hover { background: var(--surface); }

.card { padding: 28px; border-radius: var(--radius); background: var(--surface); border: 1px solid var(--border); backdrop-filter: blur(var(--blur)); max-width: 280px; }
.card.glow { box-shadow: 0 0 40px rgba(0,122,255,0.15), 0 16px 40px rgba(0,0,0,0.3); }
.card-icon { font-size: 20px; margin-bottom: 12px; }
.card-title { font-size: 18px; font-weight: 700; margin-bottom: 6px; }
.card-desc { color: var(--text-muted); font-size: 13px; line-height: 1.5; }`,
  },
  {
    id: "app",
    name: "app.js",
    type: "js",
    content: `document.addEventListener('DOMContentLoaded', () => {
  console.log('App loaded!');

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      e.preventDefault();
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  document.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', function(e) {
      const ripple = document.createElement('span');
      const rect = this.getBoundingClientRect();
      ripple.style.cssText = \`
        position: absolute; border-radius: 50%;
        width: 100px; height: 100px;
        background: rgba(255,255,255,0.3);
        transform: scale(0); animation: ripple 0.5s ease-out;
        left: \${e.clientX - rect.left - 50}px;
        top: \${e.clientY - rect.top - 50}px;
        pointer-events: none;
      \`;
      this.style.position = 'relative';
      this.style.overflow = 'hidden';
      this.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove());
    });
  });
});`,
  },
];
