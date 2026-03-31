import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, LogIn, Lock, User } from "lucide-react";
import { toast } from "@/hooks/use-toast";
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
      style={{ background: '#ffffff' }}
    >
      {/* Subtle decorative gold curves */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 90% 50% at 50% 0%, rgba(200, 170, 100, 0.08) 0%, transparent 60%),
            radial-gradient(ellipse 80% 40% at 50% 100%, rgba(236, 72, 153, 0.06) 0%, transparent 50%)
          `,
          opacity: entered ? 1 : 0,
          transition: 'opacity 1s ease-out',
        }}
      />

      <div
        className="w-full max-w-sm space-y-6 relative z-10"
        style={{
          opacity: entered ? 1 : 0,
          transform: entered ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Logo */}
        <div className="text-center space-y-3">
          <div
            className="mx-auto"
            style={{
              opacity: entered ? 1 : 0,
              transform: entered ? 'scale(1)' : 'scale(0.8)',
              transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s',
            }}
          >
            <img
              src={LogoSarelli}
              alt="Dra. Fernanda Sarelli"
              className="mx-auto h-24 w-auto object-contain"
              loading="eager"
            />
          </div>

          <div style={anim(0.2)}>
            <p className="text-xs font-semibold uppercase tracking-widest mt-1"
              style={{ color: '#c8aa64' }}
            >
              Painel de Pagamentos
            </p>
          </div>

          <p className="text-[11px] text-gray-400" style={anim(0.3)}>
            Acesso exclusivo da equipe
          </p>
        </div>

        {/* Login form — glass effect */}
        <form
          onSubmit={handleLogin}
          className="space-y-4 p-6 rounded-2xl border"
          style={{
            background: 'rgba(255, 255, 255, 0.6)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderColor: 'rgba(200, 170, 100, 0.25)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(200, 170, 100, 0.1)',
            ...anim(0.35),
          }}
        >
          <div className="space-y-1.5" style={anim(0.4)}>
            <Label className="text-[11px] uppercase tracking-widest text-gray-500 font-medium">
              Usuário
            </Label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Ex: Administrador"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="bg-white/80 border-gray-200 text-gray-800 placeholder:text-gray-400 focus:border-pink-400 focus:ring-pink-200 h-11 pl-10 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5" style={anim(0.5)}>
            <Label className="text-[11px] uppercase tracking-widest text-gray-500 font-medium">
              Senha
            </Label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-white/80 border-gray-200 text-gray-800 placeholder:text-gray-400 focus:border-pink-400 focus:ring-pink-200 h-11 pl-10 pr-10 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
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
              className="border-gray-300 data-[state=checked]:bg-pink-500 data-[state=checked]:border-pink-500"
            />
            <label htmlFor="remember" className="text-xs text-gray-500 cursor-pointer select-none">
              Lembrar meus dados
            </label>
          </div>

          <div style={anim(0.6)}>
            <Button
              type="submit"
              disabled={loading}
              className="w-full font-semibold h-11 text-sm text-white transition-all active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #ec4899, #c8aa64)',
                boxShadow: '0 4px 16px rgba(236, 72, 153, 0.25)',
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

        <div className="text-center space-y-1" style={anim(0.7)}>
          <p className="text-[10px] text-gray-400">
            Pré-candidata a Deputada Estadual — GO 2026
          </p>
          <a
            href="https://drafernandasarelli.com.br"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-pink-400 hover:text-pink-500 transition-colors"
          >
            drafernandasarelli.com.br
          </a>
        </div>
      </div>
    </div>
  );
}
