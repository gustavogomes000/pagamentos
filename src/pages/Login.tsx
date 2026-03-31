import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, LogIn, Lock, User } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import NetworkBackground from "@/components/NetworkBackground";
import LogoSarelli from "@/assets/Logo_Sarelli.png";

const EMAIL_DOMAIN = "@painel.sarelli.com";

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
      style={{ background: '#fefefe' }}
    >
      {/* Animated network background */}
      <NetworkBackground />

      {/* Soft gradient overlays */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 100% 60% at 50% 0%, rgba(200, 170, 100, 0.07) 0%, transparent 60%),
            radial-gradient(ellipse 80% 50% at 50% 100%, rgba(236, 72, 153, 0.05) 0%, transparent 50%),
            radial-gradient(ellipse 50% 50% at 50% 50%, rgba(255,255,255,0.6) 0%, transparent 100%)
          `,
          opacity: entered ? 1 : 0,
          transition: 'opacity 1s ease-out',
        }}
      />

      <div
        className="w-full max-w-sm space-y-5 relative z-10"
        style={{
          opacity: entered ? 1 : 0,
          transform: entered ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Logo — much bigger */}
        <div className="text-center space-y-2">
          <div
            className="mx-auto"
            style={{
              opacity: entered ? 1 : 0,
              transform: entered ? 'scale(1)' : 'scale(0.7)',
              transition: 'all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s',
            }}
          >
            <img
              src={LogoSarelli}
              alt="Dra. Fernanda Sarelli"
              className="mx-auto h-44 w-auto object-contain drop-shadow-sm"
              loading="eager"
            />
          </div>

          <div style={anim(0.2)}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em]"
              style={{ color: '#c8aa64' }}
            >
              Painel de Pagamentos
            </p>
          </div>
        </div>

        {/* Login form — frosted glass */}
        <form
          onSubmit={handleLogin}
          className="space-y-4 p-6 rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.18) 100%)',
            backdropFilter: 'blur(24px) saturate(1.6)',
            WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
            border: '1px solid rgba(255, 255, 255, 0.5)',
            borderTop: '1px solid rgba(255, 255, 255, 0.7)',
            borderLeft: '1px solid rgba(255, 255, 255, 0.6)',
            boxShadow: `
              0 8px 32px rgba(0, 0, 0, 0.08),
              0 2px 16px rgba(200, 170, 100, 0.08),
              inset 0 1px 0 rgba(255, 255, 255, 0.6),
              inset 0 -1px 0 rgba(200, 170, 100, 0.05)
            `,
            ...anim(0.3),
          }}
        >
          <div className="space-y-1.5" style={anim(0.35)}>
            <Label className="text-[11px] uppercase tracking-widest font-medium"
              style={{ color: '#888' }}
            >
              Usuário
            </Label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#aaa' }} />
              <Input
                type="text"
                placeholder="Ex: Administrador"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={{
                  background: 'rgba(255,255,255,0.7)',
                  borderColor: 'rgba(200,170,100,0.15)',
                  color: '#333',
                }}
                className="placeholder:text-gray-400 focus:border-pink-400 focus:ring-pink-200 h-11 pl-10 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5" style={anim(0.4)}>
            <Label className="text-[11px] uppercase tracking-widest font-medium"
              style={{ color: '#888' }}
            >
              Senha
            </Label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#aaa' }} />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  background: 'rgba(255,255,255,0.7)',
                  borderColor: 'rgba(200,170,100,0.15)',
                  color: '#333',
                }}
                className="placeholder:text-gray-400 focus:border-pink-400 focus:ring-pink-200 h-11 pl-10 pr-10 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: '#aaa' }}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2" style={anim(0.45)}>
            <Checkbox
              id="remember"
              checked={remember}
              onCheckedChange={(v) => setRemember(!!v)}
              className="border-gray-300 data-[state=checked]:bg-pink-500 data-[state=checked]:border-pink-500"
            />
            <label htmlFor="remember" className="text-xs cursor-pointer select-none" style={{ color: '#777' }}>
              Lembrar meus dados
            </label>
          </div>

          <div style={anim(0.5)}>
            <Button
              type="submit"
              disabled={loading}
              className="w-full font-semibold h-11 text-sm text-white transition-all active:scale-[0.98] hover:opacity-90"
              style={{
                background: 'linear-gradient(135deg, #ec4899, #c8aa64)',
                boxShadow: '0 4px 20px rgba(236, 72, 153, 0.25), 0 2px 8px rgba(200, 170, 100, 0.15)',
              }}
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

        <div className="text-center space-y-1" style={anim(0.6)}>
          <p className="text-[10px]" style={{ color: '#bbb' }}>
            Pré-candidata a Deputada Estadual — GO 2026
          </p>
          <a
            href="https://drafernandasarelli.com.br"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] transition-colors"
            style={{ color: '#ec4899' }}
          >
            drafernandasarelli.com.br
          </a>
        </div>
      </div>
    </div>
  );
}
