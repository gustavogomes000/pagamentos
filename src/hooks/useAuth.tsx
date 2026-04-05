import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t0 = performance.now();
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) console.error("[Auth] getSession error:", error.message);
      setUser(session?.user ?? null);
      setLoading(false);
      console.log(`[Auth] getSession completed in ${(performance.now() - t0).toFixed(0)}ms`, session ? "authenticated" : "no session");
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = () => supabase.auth.signOut();

  return { user, loading, signOut };
}
