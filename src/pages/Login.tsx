import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, LogIn, Lock, User } from "lucide-react";
import Hyperspeed from "@/components/Hyperspeed";
import { toast } from "@/hooks/use-toast";

const EMAIL_DOMAIN = "@painel.sarelli.com";

const DOCTOR_PHOTO =
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699400706d955b03c8c19827/16e72069d_WhatsAppImage2026-02-17at023641.jpeg";

// Ultra-immersive Hyperspeed preset — deep tunnel feel
const hyperspeedPreset = {
  onSpeedUp: () => {},
  onSlowDown: () => {},
  distortion: 'turbulentDistortion',
  length: 1200,
  roadWidth: 22,
  islandWidth: 5,
  lanesPerRoad: 4,
  fov: 120,
  fovSpeedUp: 160,
  speedUp: 3,
  carLightsFade: 0.3,
  totalSideLightSticks: 60,
  lightPairsPerRoadWay: 120,
  shoulderLinesWidthPercentage: 0.04,
  brokenLinesWidthPercentage: 0.12,
  brokenLinesLengthPercentage: 0.6,
  lightStickWidth: [0.1, 0.6],
  lightStickHeight: [1.5, 2.2],
  movingAwaySpeed: [80, 140],
  movingCloserSpeed: [-160, -260],
  carLightsLength: [1200 * 0.05, 1200 * 0.16],
  carLightsRadius: [0.04, 0.16],
  carWidthPercentage: [0.25, 0.55],
  carShiftX: [-1.0, 1.0],
  carFloorSeparation: [0, 6],
  colors: {
    roadColor: 0x060410,
    islandColor: 0x080610,
    background: 0x050410,
    shoulderLines: 0x220e22,
    brokenLines: 0x220e22,
    leftCars: [0xec4899, 0xf9a8d4, 0xbe185d, 0xfda4af, 0xd946ef],
    rightCars: [0xf43f5e, 0xff6b9d, 0xc026d3, 0xe879f9, 0xa855f7],
    sticks: 0xf472b6,
  }
};

export default function Login() {
  const [username, setUsername] = useState(() => localStorage.getItem("saved_user") || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(() => !!localStorage.getItem("saved_user"));
  const [entered, setEntered] = useState(false);
  const navigate = useNavigate();

  // Memoize to prevent re-renders
  const preset = useMemo(() => hyperspeedPreset, []);

  // Trigger entrance animation after mount
  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    let email = username.includes("@")
      ? username
      : username.toLowerCase().replace(/\s+/g, "") + "@sistema.local";
      
    let { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    // Fallback para usuários antigos
    if (error && !username.includes("@")) {
      const emailLegacy = username.toLowerCase().replace(/\s+/g, "") + EMAIL_DOMAIN;
      const legacyAttempt = await supabase.auth.signInWithPassword({ email: emailLegacy, password });
      error = legacyAttempt.error;
    }
    setLoading(false);
    if (error) {
      toast({
        title: "Erro no login",
        description: "Usuário ou senha incorretos",
        variant: "destructive",
      });
    } else {
      // Salva apenas o usuário (nunca a senha) para conveniência de preenchimento
      if (remember) {
        localStorage.setItem("saved_user", username);
      } else {
        localStorage.removeItem("saved_user");
      }
      // Garante remoção de qualquer senha que possa ter ficado de versão anterior
      localStorage.removeItem("saved_pass");
      navigate("/");
    }
  };

  // Shared transition helper — each element flies in from deep Z-space
  const anim = (delay: number) => ({
    opacity: entered ? 1 : 0,
    transform: entered
      ? 'perspective(1200px) translateY(0) translateZ(0) rotateX(0deg) scale(1)'
      : 'perspective(1200px) translateY(60px) translateZ(-200px) rotateX(12deg) scale(0.85)',
    transition: `all 0.9s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
  });

  return (
    <div
      className="min-h-[100dvh] flex flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: '#070510',
        perspective: '1200px',
        perspectiveOrigin: '50% 40%',
      }}
    >
      {/* Hyperspeed background with deep 3D tunnel entrance */}
      <div
        className="absolute inset-[-20%]"
        style={{
          transformStyle: 'preserve-3d',
          transformOrigin: '50% 60%',
          opacity: entered ? 1 : 0,
          transform: entered
            ? 'perspective(800px) translateZ(0) rotateX(0deg) scale(1)'
            : 'perspective(800px) translateZ(-900px) rotateX(25deg) scale(1.6)',
          transition: 'all 1.8s cubic-bezier(0.16, 1, 0.3, 1) 0s',
          filter: entered ? 'blur(0px) brightness(1)' : 'blur(4px) brightness(0.3)',
        }}
      >
        <Hyperspeed effectOptions={preset} />
      </div>

      {/* Subtle vignette for readability */}
      <div className="absolute inset-0 z-[1] pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(7,5,16,0.5) 100%)' }} />

      {/* Whole card container — flies in from deep behind screen */}
      <div
        className="w-full max-w-sm space-y-6 relative z-10"
        style={{
          transformStyle: 'preserve-3d',
          opacity: entered ? 1 : 0,
          transform: entered
            ? 'perspective(1200px) translateZ(0) rotateX(0deg)'
            : 'perspective(1200px) translateZ(-400px) rotateX(8deg)',
          transition: 'all 1.1s cubic-bezier(0.16, 1, 0.3, 1) 0s',
        }}
      >
        {/* Photo + Identity */}
        <div className="text-center space-y-3">
          {/* Photo with zoom-in spin */}
          <div
            className="relative mx-auto w-28 h-28"
            style={{
              opacity: entered ? 1 : 0,
              transform: entered ? 'scale(1) rotate(0deg)' : 'scale(0.3) rotate(-180deg)',
              transition: 'all 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s',
            }}
          >
            {/* Pink ring */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-rose-400 p-[3px]">
              <div className="w-full h-full rounded-full overflow-hidden" style={{ background: '#070510' }}>
                <img
                  src={DOCTOR_PHOTO}
                  alt="Dra. Fernanda Sarelli"
                  className="w-full h-full object-cover"
                  loading="eager"
                />
              </div>
            </div>
            {/* Online indicator */}
            <div
              className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500"
              style={{
                borderColor: '#070510',
                borderWidth: 2,
                opacity: entered ? 1 : 0,
                transform: entered ? 'scale(1)' : 'scale(0)',
                transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.8s',
              }}
            />
          </div>

          <div style={anim(0.35)}>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Dra. Fernanda Sarelli
            </h1>
            <p className="text-xs font-medium text-primary uppercase tracking-widest mt-1">
              Painel de Suplentes
            </p>
          </div>

          <p className="text-[11px] text-white/40" style={anim(0.5)}>
            Acesso exclusivo da equipe
          </p>
        </div>

        {/* Login form */}
        <form
          onSubmit={handleLogin}
          className="space-y-4 backdrop-blur-xl p-6 rounded-2xl border border-white/[0.08]"
          style={{
            background: 'rgba(0,0,0,0.6)',
            boxShadow: '0 8px 32px hsl(340 82% 55% / 0.15)',
            ...anim(0.55),
          }}
        >
          <div className="space-y-1.5" style={anim(0.65)}>
            <Label className="text-[11px] uppercase tracking-widest text-white/50 font-medium">
              Usuário
            </Label>
            <div className="relative">
              <User
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
              />
              <Input
                type="text"
                placeholder="Ex: Administrador"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="bg-white/[0.06] border-white/[0.1] text-white placeholder:text-white/25 focus:border-primary/50 focus:ring-primary/20 h-11 pl-10 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5" style={anim(0.75)}>
            <Label className="text-[11px] uppercase tracking-widest text-white/50 font-medium">
              Senha
            </Label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
              />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-white/[0.06] border-white/[0.1] text-white placeholder:text-white/25 focus:border-primary/50 focus:ring-primary/20 h-11 pl-10 pr-10 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Lembrar credenciais */}
          <div className="flex items-center gap-2" style={anim(0.85)}>
            <Checkbox
              id="remember"
              checked={remember}
              onCheckedChange={(v) => setRemember(!!v)}
              className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <label htmlFor="remember" className="text-xs text-white/50 cursor-pointer select-none">
              Lembrar meus dados
            </label>
          </div>

          <div style={anim(0.95)}>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary to-rose-400 hover:from-primary/90 hover:to-rose-500 text-primary-foreground font-semibold h-11 text-sm shadow-[0_4px_16px_hsl(340_82%_55%/0.3)] transition-all active:scale-[0.98]"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entrando...
                </div>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn size={16} />
                  Entrar
                </span>
              )}
            </Button>
          </div>
        </form>

        {/* Footer */}
        <div className="text-center space-y-1" style={anim(1.1)}>
          <p className="text-[10px] text-white/25">
            Pré-candidata a Deputada Estadual — GO 2026
          </p>
          <a
            href="https://drafernandasarelli.com.br"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-primary/50 hover:text-primary transition-colors"
          >
            drafernandasarelli.com.br
          </a>
        </div>
      </div>
    </div>
  );
}
