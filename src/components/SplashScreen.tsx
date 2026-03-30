import { useState, useEffect } from "react";

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter");

  useEffect(() => {
    // Enter animation completes → hold
    const enterTimer = setTimeout(() => setPhase("hold"), 800);
    // Hold → start exit
    const holdTimer = setTimeout(() => setPhase("exit"), 2000);
    // Exit animation completes → finish
    const exitTimer = setTimeout(() => onFinish(), 2600);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(holdTimer);
      clearTimeout(exitTimer);
    };
  }, [onFinish]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{
        background: "linear-gradient(135deg, #070510 0%, #1a0a1a 50%, #070510 100%)",
        opacity: phase === "exit" ? 0 : 1,
        transition: "opacity 0.6s ease-out",
      }}
    >
      {/* Radial glow behind logo */}
      <div
        className="absolute"
        style={{
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: "radial-gradient(circle, hsl(340 82% 55% / 0.25) 0%, transparent 70%)",
          opacity: phase === "enter" ? 0 : 1,
          transform: phase === "enter" ? "scale(0.5)" : "scale(1)",
          transition: "all 1s ease-out",
        }}
      />

      {/* Animated ring */}
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: "50%",
          padding: 3,
          background: "linear-gradient(135deg, hsl(340 82% 55%), hsl(350 80% 60%))",
          opacity: phase === "enter" ? 0 : 1,
          transform: phase === "enter" ? "scale(0.3) rotate(-180deg)" : "scale(1) rotate(0deg)",
          transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <div
          className="w-full h-full rounded-full flex items-center justify-center"
          style={{ background: "#070510" }}
        >
          <span
            className="font-bold text-white tracking-tight"
            style={{
              fontSize: 44,
              opacity: phase === "enter" ? 0 : 1,
              transform: phase === "enter" ? "translateY(10px)" : "translateY(0)",
              transition: "all 0.6s ease-out 0.3s",
            }}
          >
            FS
          </span>
        </div>
      </div>

      {/* Title */}
      <div
        className="mt-6 text-center"
        style={{
          opacity: phase === "enter" ? 0 : 1,
          transform: phase === "enter" ? "translateY(20px)" : "translateY(0)",
          transition: "all 0.6s ease-out 0.5s",
        }}
      >
        <p
          className="text-white font-bold tracking-tight"
          style={{ fontSize: 18 }}
        >
          Dra. Fernanda Sarelli
        </p>
        <p
          className="uppercase tracking-[0.2em] font-medium mt-1"
          style={{ fontSize: 10, color: "hsl(340 82% 55%)" }}
        >
          Painel de Suplentes
        </p>
      </div>

      {/* Loading dots */}
      <div
        className="flex gap-1.5 mt-8"
        style={{
          opacity: phase === "enter" ? 0 : 1,
          transition: "opacity 0.4s ease-out 0.7s",
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-full"
            style={{
              width: 6,
              height: 6,
              background: "hsl(340 82% 55%)",
              animation: `splashPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes splashPulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
