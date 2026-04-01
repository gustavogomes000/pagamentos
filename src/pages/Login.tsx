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
import FotoDra from "@/assets/foto_dra.png";

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

  return (
    <div className="min-h-[100dvh] flex overflow-hidden relative">
      {/* Left side — decorative (hidden on mobile) */}
      <div
        className="hidden lg:flex lg:w-[45%] relative items-center justify-center"
        style={{
          background: 'linear-gradient(160deg, #1a0a14 0%, #2d0f20 40%, #0f0a1a 100%)',
        }}
      >
        {/* Decorative circles */}
        <div
          className="absolute top-[-10%] right-[-20%] w-[500px] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(236,72,153,0.15) 0%, transparent 70%)',
            opacity: entered ? 1 : 0,
            transition: 'opacity 1.5s ease-out 0.3s',
          }}
        />
        <div
          className="absolute bottom-[-15%] left-[-10%] w-[400px] h-[400px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(200,170,100,0.1) 0%, transparent 70%)',
            opacity: entered ? 1 : 0,
            transition: 'opacity 1.5s ease-out 0.5s',
          }}
        />

        <div
          className="relative z-10 text-center px-12"
          style={{
            opacity: entered ? 1 : 0,
            transform: entered ? 'translateX(0)' : 'translateX(-30px)',
            transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s',
          }}
        >
          <div
            className="rounded-full overflow-hidden mx-auto w-[140px] h-[140px] mb-8"
            style={{
              border: '3px solid rgba(236,72,153,0.5)',
              boxShadow: '0 0 40px rgba(236,72,153,0.2)',
            }}
          >
            <img
              src={FotoDra}
              alt="Dra. Fernanda Sarelli"
              className="w-full h-full object-cover object-top"
              style={{ objectPosition: '50% 15%' }}
              loading="eager"
            />
          </div>
          <img
            src={LogoSarelli}
            alt="Sarelli"
            className="mx-auto h-40 w-auto object-contain mb-6"
            style={{ filter: 'brightness(1.1)' }}
            loading="eager"
          />
          <p
            className="text-xs font-semibold uppercase tracking-[0.25em]"
            style={{ color: 'rgba(200,170,100,0.7)' }}
          >
            Gestão Política Inteligente
          </p>
        </div>
      </div>

      {/* Right side — login form */}
      <div
        className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 relative overflow-y-auto"
        style={{
          background: 'linear-gradient(180deg, #fefefe 0%, #fdf8fc 50%, #fef9f0 100%)',
        }}
      >
        {/* Subtle bg accents */}
        <div
          className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(236,72,153,0.04) 0%, transparent 70%)',
          }}
        />

        <div className="w-full max-w-[380px] space-y-6">
          {/* Mobile header — photo + logo (visible only on < lg) */}
          <div
            className="flex flex-col items-center lg:hidden"
            style={{
              opacity: entered ? 1 : 0,
              transform: entered ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.1s',
            }}
          >
            <div
              className="rounded-full overflow-hidden w-[80px] h-[80px] sm:w-[100px] sm:h-[100px]"
              style={{
                border: '3px solid #ec4899',
                boxShadow: '0 4px 20px rgba(236,72,153,0.25)',
              }}
            >
              <img
                src={FotoDra}
                alt="Dra. Fernanda Sarelli"
                className="w-full h-full object-cover object-top"
                style={{ objectPosition: '50% 15%' }}
                loading="eager"
              />
            </div>
            <img
              src={LogoSarelli}
              alt="Sarelli"
              className="mx-auto h-28 sm:h-36 w-auto object-contain -mt-4 drop-shadow-sm"
              loading="eager"
            />
          </div>

          {/* Welcome text */}
          <div
            className="space-y-1"
            style={{
              opacity: entered ? 1 : 0,
              transform: entered ? 'translateY(0)' : 'translateY(15px)',
              transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s',
            }}
          >
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: '#1a1a1a' }}>
              Bem-vindo(a)
            </h1>
            <p className="text-sm" style={{ color: '#888' }}>
              Acesse o painel com suas credenciais
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleLogin}
            className="space-y-5"
            style={{
              opacity: entered ? 1 : 0,
              transform: entered ? 'translateY(0)' : 'translateY(15px)',
              transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.3s',
            }}
          >
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#666' }}>
                Usuário
              </Label>
              <div className="relative">
                <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#c8aa64' }} />
                <Input
                  type="text"
                  placeholder="Digite seu usuário"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="h-[52px] pl-11 pr-4 text-sm rounded-2xl border-2 placeholder:text-gray-300 focus:ring-2 focus:ring-pink-200 transition-all"
                  style={{
                    background: '#fff',
                    borderColor: '#eee',
                    color: '#333',
                  }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#666' }}>
                Senha
              </Label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#c8aa64' }} />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-[52px] pl-11 pr-11 text-sm rounded-2xl border-2 placeholder:text-gray-300 focus:ring-2 focus:ring-pink-200 transition-all"
                  style={{
                    background: '#fff',
                    borderColor: '#eee',
                    color: '#333',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors hover:opacity-70"
                  style={{ color: '#bbb' }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Checkbox
                id="remember"
                checked={remember}
                onCheckedChange={(v) => setRemember(!!v)}
                className="border-gray-300 data-[state=checked]:bg-pink-500 data-[state=checked]:border-pink-500 rounded-md"
              />
              <label htmlFor="remember" className="text-xs cursor-pointer select-none" style={{ color: '#999' }}>
                Lembrar meus dados
              </label>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full font-bold h-[52px] text-sm text-white transition-all active:scale-[0.97] hover:brightness-110 rounded-2xl shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #ec4899 0%, #db2777 50%, #be185d 100%)',
                boxShadow: '0 6px 25px rgba(236,72,153,0.35), 0 2px 10px rgba(0,0,0,0.06)',
              }}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entrando...
                </div>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn size={18} />
                  Entrar
                </span>
              )}
            </Button>
          </form>

          {/* Footer */}
          <div
            className="text-center pt-4 space-y-1.5"
            style={{
              opacity: entered ? 1 : 0,
              transition: 'opacity 0.6s ease-out 0.5s',
            }}
          >
            <div className="flex items-center gap-3 justify-center mb-3">
              <div className="h-px flex-1 max-w-[60px]" style={{ background: '#e5e5e5' }} />
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.2em]"
                style={{ color: '#c8aa64' }}
              >
                Painel de Gestão
              </p>
              <div className="h-px flex-1 max-w-[60px]" style={{ background: '#e5e5e5' }} />
            </div>
            <p className="text-[10px]" style={{ color: '#bbb' }}>
              Pré-candidata a Deputada Estadual — GO 2026
            </p>
            <a
              href="https://drafernandasarelli.com.br"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] hover:underline transition-colors inline-block"
              style={{ color: '#ec4899' }}
            >
              drafernandasarelli.com.br
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
