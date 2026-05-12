import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { UsuarioRow } from "@/lib/database.types";

export function useCurrentUser() {
  return useQuery<UsuarioRow | null>({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) return null;

      const { data } = await supabase
        .from("usuarios")
        .select("*")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (!data && user.email) {
        const { data: byEmail } = await supabase
          .from("usuarios")
          .select("*")
          .eq("email", user.email)
          .maybeSingle();
        return byEmail ?? null;
      }

      return data ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });
}