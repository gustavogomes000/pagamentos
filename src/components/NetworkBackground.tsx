import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseAlpha: number;
  pulse: number;
  pulseSpeed: number;
  color: [number, number, number];
}

const PINK: [number, number, number] = [236, 72, 153];
const GOLD: [number, number, number] = [200, 170, 100];
const ROSE: [number, number, number] = [244, 114, 182];
const WARM: [number, number, number] = [180, 140, 70];

const PALETTE = [PINK, GOLD, ROSE, WARM, PINK, GOLD];

export default function NetworkBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let particles: Particle[] = [];
    let time = 0;
    const COUNT = 80;
    const MAX_DIST = 160;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const init = () => {
      resize();
      particles = Array.from({ length: COUNT }, () => {
        const color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
        return {
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          radius: Math.random() * 2.5 + 0.8,
          baseAlpha: Math.random() * 0.3 + 0.3,
          pulse: Math.random() * Math.PI * 2,
          pulseSpeed: Math.random() * 0.02 + 0.008,
          color,
        };
      });
    };

    const draw = () => {
      time++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Flowing gradient waves
      const wave1X = Math.sin(time * 0.003) * canvas.width * 0.3 + canvas.width * 0.3;
      const wave1Y = Math.cos(time * 0.002) * canvas.height * 0.2 + canvas.height * 0.3;
      const wave2X = Math.cos(time * 0.004) * canvas.width * 0.3 + canvas.width * 0.7;
      const wave2Y = Math.sin(time * 0.003) * canvas.height * 0.2 + canvas.height * 0.7;

      const g1 = ctx.createRadialGradient(wave1X, wave1Y, 0, wave1X, wave1Y, canvas.width * 0.5);
      g1.addColorStop(0, "rgba(236, 72, 153, 0.06)");
      g1.addColorStop(0.5, "rgba(200, 170, 100, 0.03)");
      g1.addColorStop(1, "transparent");
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const g2 = ctx.createRadialGradient(wave2X, wave2Y, 0, wave2X, wave2Y, canvas.width * 0.4);
      g2.addColorStop(0, "rgba(200, 170, 100, 0.05)");
      g2.addColorStop(0.5, "rgba(236, 72, 153, 0.025)");
      g2.addColorStop(1, "transparent");
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAX_DIST) {
            const alpha = (1 - dist / MAX_DIST) * 0.18;
            const [r, g, b] = particles[i].color;
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Particles with glow + pulse
      for (const p of particles) {
        p.pulse += p.pulseSpeed;
        const alpha = p.baseAlpha * (0.6 + 0.4 * Math.sin(p.pulse));
        const [r, g, b] = p.color;

        // Outer glow
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 6);
        glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha * 0.25})`);
        glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow;
        ctx.fillRect(p.x - p.radius * 6, p.y - p.radius * 6, p.radius * 12, p.radius * 12);

        // Core
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.fill();

        // Move
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      }

      animId = requestAnimationFrame(draw);
    };

    init();
    draw();
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
