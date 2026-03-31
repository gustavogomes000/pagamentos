import { useState, useEffect } from "react";

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter");

  useEffect(() => {
    const enterTimer = setTimeout(() => setPhase("hold"), 400);
    const holdTimer = setTimeout(() => setPhase("exit"), 1000);
    const exitTimer = setTimeout(() => onFinish(), 1400);

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
        transition: "opacity 0.4s ease-out",
      }}
    >
      <div
        className="absolute"
        style={{
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: "radial-gradient(circle, hsl(340 82% 55% / 0.25) 0%, transparent 70%)",
          opacity: phase === "enter" ? 0 : 1,
          transform: phase === "enter" ? "scale(0.5)" : "scale(1)",
          transition: "all 0.5s ease-out",
        }}
      />

      <div
        style={{
          width: 100,
          height: 100,
          borderRadius: "50%",
          padding: 3,
          background: "linear-gradient(135deg, hsl(340 82% 55%), hsl(350 80% 60%))",
          opacity: phase === "enter" ? 0 : 1,
          transform: phase === "enter" ? "scale(0.3) rotate(-180deg)" : "scale(1) rotate(0deg)",
          transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <div
          className="w-full h-full rounded-full flex items-center justify-center"
          style={{ background: "#070510" }}
        >
          <span
            className="font-bold text-white tracking-tight"
            style={{ fontSize: 38 }}
          >
            FS
          </span>
        </div>
      </div>

      <div
        className="mt-5 text-center"
        style={{
          opacity: phase === "enter" ? 0 : 1,
          transform: phase === "enter" ? "translateY(15px)" : "translateY(0)",
          transition: "all 0.4s ease-out 0.2s",
        }}
      >
        <p className="text-white font-bold tracking-tight" style={{ fontSize: 17 }}>
          Dra. Fernanda Sarelli
        </p>
        <p
          className="uppercase tracking-[0.2em] font-medium mt-1"
          style={{ fontSize: 10, color: "hsl(340 82% 55%)" }}
        >
          Painel de Suplentes
        </p>
      </div>
    </div>
  );
}
