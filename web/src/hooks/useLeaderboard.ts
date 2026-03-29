import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export type LeaderRow = { host_id: string; display_name: string; vote_count: number };

export function useLeaderboard(limit = 25, refreshMs = 25000) {
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    const { data, error: e } = await supabase.rpc("leaderboard_djs", { limit_n: limit });
    if (e) {
      setError(e.message);
      return;
    }
    setRows((data as LeaderRow[]) ?? []);
  }, [limit]);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), refreshMs);
    return () => clearInterval(t);
  }, [refresh, refreshMs]);

  return { rows, error, refresh };
}
