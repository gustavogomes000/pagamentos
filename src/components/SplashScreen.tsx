import { useState, useEffect } from "react";
import LogoSarelli from "@/assets/Logo_Sarelli.png";

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter");

  useEffect(() => {
    const enterTimer = setTimeout(() => setPhase("hold"), 400);
    const holdTimer = setTimeout(() => setPhase("exit"), 1200);
    const exitTimer = setTimeout(() => onFinish(), 1600);

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
        background: "linear-gradient(180deg, #fef2f2 0%, #fdf2f8 40%, #fefefe 100%)",
        opacity: phase === "exit" ? 0 : 1,
        transition: "opacity 0.4s ease-out",
      }}
    >
      {/* Soft radial glow */}
      <div
        className="absolute"
        style={{
          width: 350,
          height: 350,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(236, 72, 153, 0.08) 0%, rgba(200, 170, 100, 0.05) 40%, transparent 70%)",
          opacity: phase === "enter" ? 0 : 1,
          transform: phase === "enter" ? "scale(0.5)" : "scale(1)",
          transition: "all 0.6s ease-out",
        }}
      />

      {/* Logo */}
      <div
        style={{
          opacity: phase === "enter" ? 0 : 1,
          transform: phase === "enter" ? "scale(0.5) translateY(20px)" : "scale(1) translateY(0)",
          transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <img
          src={LogoSarelli}
          alt="Dra. Fernanda Sarelli"
          className="h-36 w-auto object-contain drop-shadow-sm"
        />
      </div>

      {/* Subtitle */}
      <div
        className="mt-3 text-center"
        style={{
          opacity: phase === "enter" ? 0 : 1,
          transform: phase === "enter" ? "translateY(15px)" : "translateY(0)",
          transition: "all 0.4s ease-out 0.2s",
        }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-[0.2em]"
          style={{ color: "#c8aa64" }}
        >
          Painel de Pagamentos
        </p>
      </div>

      {/* Loading indicator */}
      <div
        className="mt-8"
        style={{
          opacity: phase === "enter" ? 0 : 0.6,
          transition: "opacity 0.4s ease-out 0.3s",
        }}
      >
        <div
          className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "rgba(236, 72, 153, 0.3)", borderTopColor: "#ec4899" }}
        />
      </div>
    </div>
  );
}
