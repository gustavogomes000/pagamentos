import { useEffect, useCallback } from "react";
import { toast } from "sonner";

export default function VersionMonitor() {
  const checkForUpdates = useCallback(async () => {
    if (!("serviceWorker" in navigator)) return;
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const reg of regs) {
        await reg.update();
      }
    } catch (err) {
      console.error("SW Update check error", err);
    }
  }, []);

  useEffect(() => {
    // Check on coming back online
    const handleOnline = () => {
      checkForUpdates();
    };

    // Check on visibility change (user returns to app)
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        checkForUpdates();
      }
    };

    // Listen for SW controlling change (new version activated)
    const handleControllerChange = () => {
      toast.success("App atualizado! Recarregando...", { duration: 2000 });
      setTimeout(() => window.location.reload(), 1500);
    };

    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibility);
    navigator.serviceWorker?.addEventListener("controllerchange", handleControllerChange);

    // Periodic check every 2 hours
    const interval = setInterval(checkForUpdates, 2 * 60 * 60 * 1000);

    return () => {
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibility);
      navigator.serviceWorker?.removeEventListener("controllerchange", handleControllerChange);
      clearInterval(interval);
    };
  }, [checkForUpdates]);

  return null;
}
