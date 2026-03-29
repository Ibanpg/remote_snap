import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LeaderboardBoard } from "../components/LeaderboardBoard";
import { useLeaderboard } from "../hooks/useLeaderboard";
import { supabase } from "../lib/supabase";

type SessionRow = {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  webrtc_room: string;
  status: string;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
};

type SessionWithHost = SessionRow & { host?: { display_name: string } | null };

export function LobbyPage() {
  const [sessions, setSessions] = useState<SessionWithHost[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const { rows: leaderboard, error: lbErr } = useLeaderboard(15, 20000);

  const refresh = useCallback(async () => {
    setLoadErr(null);
    const { data: sess, error: e1 } = await supabase
      .from("dj_sessions")
      .select("*")
      .in("status", ["live", "scheduled"])
      .order("created_at", { ascending: false });

    if (e1) {
      setLoadErr(e1.message);
      return;
    }

    const hostIds = [...new Set((sess ?? []).map((s) => s.host_id))];
    let hostMap = new Map<string, string>();
    if (hostIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id, display_name").in("id", hostIds);
      hostMap = new Map((profs ?? []).map((p) => [p.id, p.display_name]));
    }

    const merged: SessionWithHost[] = (sess ?? [])
      .map((s) => ({
        ...s,
        host: { display_name: hostMap.get(s.host_id) ?? "DJ" },
      }))
      .sort((a, b) => {
        if (a.status === b.status) {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        return a.status === "live" ? -1 : 1;
      });
    setSessions(merged);
  }, []);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 20000);
    return () => clearInterval(t);
  }, [refresh]);

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
      <section>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl font-bold text-white md:text-4xl">The floor</h2>
            <p className="mt-1 text-white/45">Step into a live set — votes push DJs up the board.</p>
            <p className="mt-2 text-xs text-white/35">
              New here?{" "}
              <Link className="text-fuchsia-400/90 underline hover:text-fuchsia-300" to="/how-it-works">
                How it works
              </Link>{" "}
              ·{" "}
              <Link className="text-fuchsia-400/90 underline hover:text-fuchsia-300" to="/about">
                About
              </Link>
            </p>
          </div>
          <Link to="/session/new" className="btn-neon text-sm">
            + Drop a new set
          </Link>
        </div>

        {loadErr && (
          <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {loadErr} — check <code className="text-white/80">VITE_SUPABASE_*</code> and run the SQL migration in{" "}
            <code className="text-white/80">supabase/migrations</code>.
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {sessions.length === 0 && !loadErr && (
            <div className="glass-panel col-span-full rounded-2xl p-10 text-center text-white/45">
              No sessions yet. Be the first to{" "}
              <Link className="text-fuchsia-300 underline" to="/session/new">
                start a set
              </Link>
              .
            </div>
          )}
          {sessions.map((s) => (
            <Link
              key={s.id}
              to={`/session/${s.id}`}
              className="group glass-panel relative overflow-hidden rounded-2xl p-6 transition hover:border-fuchsia-500/30 hover:shadow-[0_0_40px_-10px_rgba(236,72,153,0.35)]"
            >
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-fuchsia-600/20 blur-2xl transition group-hover:bg-fuchsia-500/30" />
              <div className="relative">
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      s.status === "live"
                        ? "animate-pulse-glow bg-rose-500/30 text-rose-100"
                        : "bg-white/10 text-white/60"
                    }`}
                  >
                    {s.status}
                  </span>
                </div>
                <h3 className="font-display text-xl font-bold text-white">{s.title}</h3>
                <p className="mt-1 text-sm text-white/50">{s.host?.display_name ?? "DJ"}</p>
                {s.description && <p className="mt-3 line-clamp-2 text-sm text-white/35">{s.description}</p>}
                <span className="mt-4 inline-block text-sm font-semibold text-fuchsia-300 group-hover:text-fuchsia-200">
                  Enter room →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="glass-panel-strong rounded-2xl p-6">
          <div className="mb-1 flex items-center justify-between gap-2">
            <h3 className="font-display text-lg font-bold text-gradient">Top DJs</h3>
            <Link to="/leaderboard" className="text-[10px] font-semibold uppercase tracking-wider text-fuchsia-400/80 hover:text-fuchsia-300">
              Full board
            </Link>
          </div>
          <p className="mb-4 text-xs text-white/40">Fire votes across all sets · one vote per guest per set</p>
          <LeaderboardBoard rows={leaderboard} compact error={lbErr} />
        </div>
      </aside>
    </div>
  );
}
