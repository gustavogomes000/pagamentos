import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseAlpha: number;
  phase: number;
  breathSpeed: number;
  color: [number, number, number];
  layer: number;
}

interface FloatingDust {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  drift: number;
  phase: number;
}

const PINK: [number, number, number] = [236, 72, 153];
const GOLD: [number, number, number] = [200, 170, 100];
const ROSE: [number, number, number] = [244, 114, 182];
const LIGHT_PINK: [number, number, number] = [251, 182, 206];
const PALETTE = [PINK, GOLD, ROSE, PINK, GOLD, LIGHT_PINK];

export default function NetworkBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animId: number;
    let particles: Particle[] = [];
    let dust: FloatingDust[] = [];
    let w = 0, h = 0;

    const NODE_COUNT = 160;
    const DUST_COUNT = 60;
    const MAX_DIST = 220;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const init = () => {
      resize();
      particles = Array.from({ length: NODE_COUNT }, () => {
        const layerRand = Math.random();
        const depth = layerRand < 0.2 ? 0 : layerRand < 0.55 ? 1 : 2;
        const speedScale = [0.12, 0.28, 0.48][depth];
        const sizeScale = [0.7, 1.5, 2.8][depth];
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * speedScale,
          vy: (Math.random() - 0.5) * speedScale,
          radius: (Math.random() * 1.5 + 0.8) * sizeScale,
          baseAlpha: [0.25, 0.5, 0.85][depth],
          phase: Math.random() * Math.PI * 2,
          breathSpeed: 0.005 + Math.random() * 0.02,
          color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
          layer: depth,
        };
      });

      dust = Array.from({ length: DUST_COUNT }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.08,
        vy: (Math.random() - 0.5) * 0.08,
        radius: Math.random() * 1.2 + 0.3,
        alpha: 0.15 + Math.random() * 0.35,
        drift: Math.random() * Math.PI * 2,
        phase: Math.random() * Math.PI * 2,
      }));
    };

    const draw = (time: number) => {
      const t = time * 0.001;
      ctx.clearRect(0, 0, w, h);

      // Ambient gradient blobs — 4 of them for richer backdrop
      const blobs = [
        { cx: Math.sin(t * 0.2) * w * 0.3 + w * 0.3, cy: Math.cos(t * 0.15) * h * 0.25 + h * 0.3, r: w * 0.5, c: "236,72,153", a: 0.13 },
        { cx: Math.cos(t * 0.25) * w * 0.25 + w * 0.7, cy: Math.sin(t * 0.2) * h * 0.2 + h * 0.6, r: w * 0.45, c: "200,170,100", a: 0.1 },
        { cx: Math.sin(t * 0.18 + 2) * w * 0.2 + w * 0.5, cy: Math.cos(t * 0.12 + 1) * h * 0.3 + h * 0.2, r: w * 0.4, c: "244,114,182", a: 0.09 },
        { cx: Math.cos(t * 0.15 + 3) * w * 0.2 + w * 0.2, cy: Math.sin(t * 0.1 + 2) * h * 0.2 + h * 0.7, r: w * 0.35, c: "251,182,206", a: 0.08 },
      ];
      for (const bl of blobs) {
        const g = ctx.createRadialGradient(bl.cx, bl.cy, 0, bl.cx, bl.cy, bl.r);
        g.addColorStop(0, `rgba(${bl.c},${bl.a})`);
        g.addColorStop(0.5, `rgba(${bl.c},${bl.a * 0.35})`);
        g.addColorStop(1, "transparent");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }

      // Move particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -30) p.vx = Math.abs(p.vx);
        else if (p.x > w + 30) p.vx = -Math.abs(p.vx);
        if (p.y < -30) p.vy = Math.abs(p.vy);
        else if (p.y > h + 30) p.vy = -Math.abs(p.vy);
      }

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          if (Math.abs(a.layer - b.layer) > 1) continue;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distSq = dx * dx + dy * dy;
          if (distSq > MAX_DIST * MAX_DIST) continue;
          const dist = Math.sqrt(distSq);
          const fade = 1 - dist / MAX_DIST;
          const lineAlpha = fade * fade * 0.5;
          const avgLayer = (a.layer + b.layer) / 2;
          const lineW = [0.3, 0.7, 1.3][Math.round(avgLayer)];
          const [r, gg, bb] = a.color;
          ctx.strokeStyle = `rgba(${r},${gg},${bb},${lineAlpha})`;
          ctx.lineWidth = lineW;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      // Draw nodes with glow
      for (const p of particles) {
        p.phase += p.breathSpeed;
        const breath = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(p.phase));
        const a = p.baseAlpha * breath;
        const [r, g, b] = p.color;

        // Outer glow
        const glowR = p.radius * 8;
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
        glow.addColorStop(0, `rgba(${r},${g},${b},${a * 0.4})`);
        glow.addColorStop(0.35, `rgba(${r},${g},${b},${a * 0.12})`);
        glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow;
        ctx.fillRect(p.x - glowR, p.y - glowR, glowR * 2, glowR * 2);

        // Core
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${a * 0.95})`;
        ctx.fill();

        // White center
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${a * 0.55})`;
        ctx.fill();
      }

      // Floating dust
      for (const d of dust) {
        d.phase += 0.008;
        d.x += d.vx + Math.sin(d.drift + t * 0.4) * 0.04;
        d.y += d.vy + Math.cos(d.drift + t * 0.35) * 0.04;
        if (d.x < -10) d.x = w + 10;
        else if (d.x > w + 10) d.x = -10;
        if (d.y < -10) d.y = h + 10;
        else if (d.y > h + 10) d.y = -10;

        const da = d.alpha * (0.4 + 0.6 * Math.sin(d.phase));
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(236,72,153,${da})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    };

    init();
    animId = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
