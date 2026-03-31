import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, LogIn, Lock, User } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const EMAIL_DOMAIN = "@painel.sarelli.com";

const DOCTOR_PHOTO =
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699400706d955b03c8c19827/16e72069d_WhatsAppImage2026-02-17at023641.jpeg";

export default function Login() {
  const [username, setUsername] = useState(() => localStorage.getItem("saved_user") || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(() => !!localStorage.getItem("saved_user"));
  const [entered, setEntered] = useState(false);
  const navigate = useNavigate();

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
      if (remember) {
        localStorage.setItem("saved_user", username);
      } else {
        localStorage.removeItem("saved_user");
      }
      localStorage.removeItem("saved_pass");
      navigate("/");
    }
  };

  const anim = (delay: number) => ({
    opacity: entered ? 1 : 0,
    transform: entered
      ? 'translateY(0) scale(1)'
      : 'translateY(30px) scale(0.95)',
    transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
  });

  return (
    <div
      className="min-h-[100dvh] flex flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{ background: '#070510' }}
    >
      {/* Lightweight animated gradient background */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 50% 120%, hsl(340 82% 35% / 0.4) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 20% 80%, hsl(280 60% 30% / 0.3) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 80% 20%, hsl(350 70% 25% / 0.25) 0%, transparent 50%)
          `,
          opacity: entered ? 1 : 0,
          transition: 'opacity 1s ease-out',
        }}
      />

      {/* Animated light streaks (CSS only) */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 2,
              height: '40%',
              left: `${15 + i * 18}%`,
              top: '-10%',
              background: `linear-gradient(to bottom, transparent, hsl(340 82% 55% / ${0.08 + i * 0.03}), transparent)`,
              animation: `loginStreak ${3 + i * 0.5}s ease-in-out ${i * 0.4}s infinite`,
              opacity: entered ? 1 : 0,
              transition: `opacity 1s ease-out ${0.5 + i * 0.1}s`,
            }}
          />
        ))}
      </div>

      <div className="absolute inset-0 z-[1] pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(7,5,16,0.5) 100%)' }} />

      <div
        className="w-full max-w-sm space-y-6 relative z-10"
        style={{
          opacity: entered ? 1 : 0,
          transform: entered ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Photo + Identity */}
        <div className="text-center space-y-3">
          <div
            className="relative mx-auto w-28 h-28"
            style={{
              opacity: entered ? 1 : 0,
              transform: entered ? 'scale(1)' : 'scale(0.5)',
              transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s',
            }}
          >
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
            <div
              className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500"
              style={{
                borderColor: '#070510',
                borderWidth: 2,
                opacity: entered ? 1 : 0,
                transform: entered ? 'scale(1)' : 'scale(0)',
                transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s',
              }}
            />
          </div>

          <div style={anim(0.2)}>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Dra. Fernanda Sarelli
            </h1>
            <p className="text-xs font-medium text-primary uppercase tracking-widest mt-1">
              Painel de Suplentes
            </p>
          </div>

          <p className="text-[11px] text-white/40" style={anim(0.3)}>
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
            ...anim(0.35),
          }}
        >
          <div className="space-y-1.5" style={anim(0.4)}>
            <Label className="text-[11px] uppercase tracking-widest text-white/50 font-medium">
              Usuário
            </Label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
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

          <div className="space-y-1.5" style={anim(0.5)}>
            <Label className="text-[11px] uppercase tracking-widest text-white/50 font-medium">
              Senha
            </Label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
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

          <div className="flex items-center gap-2" style={anim(0.55)}>
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

          <div style={anim(0.6)}>
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

        <div className="text-center space-y-1" style={anim(0.7)}>
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

      <style>{`
        @keyframes loginStreak {
          0%, 100% { transform: translateY(-100%); opacity: 0; }
          30% { opacity: 1; }
          70% { opacity: 1; }
          100% { transform: translateY(250%); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
