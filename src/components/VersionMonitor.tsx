import { useEffect } from "react";

export default function VersionMonitor() {
  const version = import.meta.env.VITE_APP_VERSION || "DEV";

  useEffect(() => {
    // Monitor de atualização silenciosa - Auto update loop
    const checkUpdate = async () => {
      if ("serviceWorker" in navigator) {
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (const reg of regs) {
            await reg.update();
          }
        } catch (err) {
          console.error("SW Update check error", err);
        }
      }
    };

    // Checa a cada 5 horas para atualizar, além do autoUpdate do VitePWA
    const interval = setInterval(checkUpdate, 5 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        bottom: "4px",
        right: "4px",
        fontSize: "10px",
        color: "rgba(255,255,255,0.4)",
        zIndex: 99999,
        pointerEvents: "none",
        fontFamily: "monospace",
        fontWeight: 600,
        textShadow: "0px 1px 2px rgba(0,0,0,0.8)"
      }}
      title="Monitor de Versão (Atualização Automática)"
    >
      v.{version}
    </div>
  );
}
