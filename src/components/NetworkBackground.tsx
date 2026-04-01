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

    const NODE_COUNT = 120;
    const DUST_COUNT = 50;
    const MAX_DIST = 200;

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
        const depth = layerRand < 0.25 ? 0 : layerRand < 0.6 ? 1 : 2;
        const speedScale = [0.18, 0.35, 0.55][depth];
        const sizeScale = [0.8, 1.6, 2.6][depth];
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * speedScale,
          vy: (Math.random() - 0.5) * speedScale,
          radius: (Math.random() * 1.5 + 0.8) * sizeScale,
          baseAlpha: [0.3, 0.55, 0.8][depth],
          phase: Math.random() * Math.PI * 2,
          breathSpeed: 0.006 + Math.random() * 0.018,
          color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
          layer: depth,
        };
      });

      dust = Array.from({ length: DUST_COUNT }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.1,
        vy: (Math.random() - 0.5) * 0.1,
        radius: Math.random() * 1.0 + 0.3,
        alpha: 0.2 + Math.random() * 0.3,
        drift: Math.random() * Math.PI * 2,
        phase: Math.random() * Math.PI * 2,
      }));
    };

    const draw = (time: number) => {
      const t = time * 0.001;
      ctx.clearRect(0, 0, w, h);

      // Ambient blobs
      const cx1 = Math.sin(t * 0.2) * w * 0.3 + w * 0.35;
      const cy1 = Math.cos(t * 0.15) * h * 0.25 + h * 0.35;
      const cx2 = Math.cos(t * 0.25) * w * 0.25 + w * 0.65;
      const cy2 = Math.sin(t * 0.2) * h * 0.2 + h * 0.6;
      const cx3 = Math.sin(t * 0.18 + 2) * w * 0.2 + w * 0.5;
      const cy3 = Math.cos(t * 0.12 + 1) * h * 0.3 + h * 0.25;

      const g1 = ctx.createRadialGradient(cx1, cy1, 0, cx1, cy1, w * 0.5);
      g1.addColorStop(0, "rgba(236, 72, 153, 0.12)");
      g1.addColorStop(0.5, "rgba(244, 114, 182, 0.05)");
      g1.addColorStop(1, "transparent");
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, w, h);

      const g2 = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, w * 0.45);
      g2.addColorStop(0, "rgba(200, 170, 100, 0.10)");
      g2.addColorStop(0.5, "rgba(200, 170, 100, 0.04)");
      g2.addColorStop(1, "transparent");
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, w, h);

      const g3 = ctx.createRadialGradient(cx3, cy3, 0, cx3, cy3, w * 0.4);
      g3.addColorStop(0, "rgba(244, 114, 182, 0.08)");
      g3.addColorStop(0.6, "rgba(236, 72, 153, 0.03)");
      g3.addColorStop(1, "transparent");
      ctx.fillStyle = g3;
      ctx.fillRect(0, 0, w, h);

      // Move particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -30) p.vx = Math.abs(p.vx);
        else if (p.x > w + 30) p.vx = -Math.abs(p.vx);
        if (p.y < -30) p.vy = Math.abs(p.vy);
        else if (p.y > h + 30) p.vy = -Math.abs(p.vy);
      }

      // Draw connections — thicker, more visible
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          if (Math.abs(a.layer - b.layer) > 1) continue;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distSq = dx * dx + dy * dy;
          const maxD = MAX_DIST;
          if (distSq > maxD * maxD) continue;
          const dist = Math.sqrt(distSq);
          const fade = 1 - dist / maxD;
          const lineAlpha = fade * fade * 0.4;
          const avgLayer = (a.layer + b.layer) / 2;
          const lineW = [0.4, 0.8, 1.2][Math.round(avgLayer)];
          const [r, gg, bb] = a.color;
          ctx.strokeStyle = `rgba(${r},${gg},${bb},${lineAlpha})`;
          ctx.lineWidth = lineW;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      // Draw nodes
      for (const p of particles) {
        p.phase += p.breathSpeed;
        const breath = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(p.phase));
        const a = p.baseAlpha * breath;
        const [r, g, b] = p.color;

        // Outer glow
        const glowR = p.radius * 7;
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
        glow.addColorStop(0, `rgba(${r},${g},${b},${a * 0.35})`);
        glow.addColorStop(0.4, `rgba(${r},${g},${b},${a * 0.1})`);
        glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow;
        ctx.fillRect(p.x - glowR, p.y - glowR, glowR * 2, glowR * 2);

        // Core
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${a * 0.9})`;
        ctx.fill();

        // White center
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${a * 0.5})`;
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
