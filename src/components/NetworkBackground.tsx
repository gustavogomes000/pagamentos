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
  layer: number; // 0=back, 1=mid, 2=front for depth
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
const PALETTE = [PINK, GOLD, ROSE, PINK, GOLD];

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

    const NODE_COUNT = 70;
    const DUST_COUNT = 40;
    const MAX_DIST = 160;

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
        const layer = Math.random();
        const depth = layer < 0.3 ? 0 : layer < 0.7 ? 1 : 2;
        const speedScale = [0.15, 0.3, 0.5][depth];
        const sizeScale = [1.0, 1.8, 2.8][depth];
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * speedScale,
          vy: (Math.random() - 0.5) * speedScale,
          radius: (Math.random() * 1.5 + 0.8) * sizeScale,
          baseAlpha: [0.25, 0.45, 0.7][depth],
          phase: Math.random() * Math.PI * 2,
          breathSpeed: 0.008 + Math.random() * 0.02,
          color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
          layer: depth,
        };
      });

      dust = Array.from({ length: DUST_COUNT }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12,
        radius: Math.random() * 1.2 + 0.3,
        alpha: 0.15 + Math.random() * 0.35,
        drift: Math.random() * Math.PI * 2,
        phase: Math.random() * Math.PI * 2,
      }));
    };

    const draw = (time: number) => {
      const t = time * 0.001; // seconds
      ctx.clearRect(0, 0, w, h);

      // Ambient gradient blobs
      const cx1 = Math.sin(t * 0.25) * w * 0.3 + w * 0.35;
      const cy1 = Math.cos(t * 0.2) * h * 0.25 + h * 0.35;
      const cx2 = Math.cos(t * 0.3) * w * 0.25 + w * 0.65;
      const cy2 = Math.sin(t * 0.25) * h * 0.2 + h * 0.6;

      const g1 = ctx.createRadialGradient(cx1, cy1, 0, cx1, cy1, w * 0.45);
      g1.addColorStop(0, "rgba(236, 72, 153, 0.10)");
      g1.addColorStop(0.6, "rgba(244, 114, 182, 0.04)");
      g1.addColorStop(1, "transparent");
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, w, h);

      const g2 = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, w * 0.4);
      g2.addColorStop(0, "rgba(200, 170, 100, 0.08)");
      g2.addColorStop(0.5, "rgba(200, 170, 100, 0.03)");
      g2.addColorStop(1, "transparent");
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, w, h);

      // Move particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        // Soft bounce
        if (p.x < -20) p.vx = Math.abs(p.vx);
        else if (p.x > w + 20) p.vx = -Math.abs(p.vx);
        if (p.y < -20) p.vy = Math.abs(p.vy);
        else if (p.y > h + 20) p.vy = -Math.abs(p.vy);
      }

      // Draw connections (only same or adjacent layers)
      ctx.lineWidth = 0.6;
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
          const lineAlpha = fade * fade * 0.25; // quadratic falloff for smooth fade
          const [r, g, b2] = a.color;
          ctx.strokeStyle = `rgba(${r},${g},${b2},${lineAlpha})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      // Draw nodes with async breathing glow
      for (const p of particles) {
        p.phase += p.breathSpeed;
        const breath = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(p.phase));
        const a = p.baseAlpha * breath;
        const [r, g, b] = p.color;

        // Outer glow
        const glowR = p.radius * 6;
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
        glow.addColorStop(0, `rgba(${r},${g},${b},${a * 0.3})`);
        glow.addColorStop(0.5, `rgba(${r},${g},${b},${a * 0.08})`);
        glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow;
        ctx.fillRect(p.x - glowR, p.y - glowR, glowR * 2, glowR * 2);

        // Core
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${a * 0.85})`;
        ctx.fill();

        // White highlight
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${a * 0.4})`;
        ctx.fill();
      }

      // Floating dust particles
      for (const d of dust) {
        d.phase += 0.01;
        d.x += d.vx + Math.sin(d.drift + t * 0.5) * 0.05;
        d.y += d.vy + Math.cos(d.drift + t * 0.4) * 0.05;
        if (d.x < -10) d.x = w + 10;
        else if (d.x > w + 10) d.x = -10;
        if (d.y < -10) d.y = h + 10;
        else if (d.y > h + 10) d.y = -10;

        const da = d.alpha * (0.5 + 0.5 * Math.sin(d.phase));
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
