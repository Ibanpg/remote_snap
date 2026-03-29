import { Link } from "react-router-dom";
import type { LeaderRow } from "../hooks/useLeaderboard";

function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2) return (p[0]![0] + p[1]![0]).toUpperCase();
  return (name.slice(0, 2) || "??").toUpperCase();
}

function rankStyle(i: number) {
  if (i === 0) return "from-amber-400 to-amber-600 shadow-amber-500/40";
  if (i === 1) return "from-slate-300 to-slate-500 shadow-slate-400/30";
  if (i === 2) return "from-amber-700 to-amber-900 shadow-amber-800/40";
  return "from-fuchsia-600 to-violet-700 shadow-fuchsia-500/25";
}

export function LeaderboardBoard({
  rows,
  compact,
  error,
}: {
  rows: LeaderRow[];
  compact?: boolean;
  error?: string | null;
}) {
  const showPodium = !compact && rows.length >= 3;
  const top = showPodium ? rows.slice(0, 3) : [];
  const listRows = compact ? rows : showPodium ? rows.slice(3) : rows;
  const listOffset = compact ? 0 : showPodium ? 3 : 0;

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</p>
      )}

      {showPodium && (
        <div className="grid grid-cols-3 items-end gap-2 pt-2">
          <div className="flex flex-col items-center">
            <div
              className={`mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-sm font-bold text-white ${rankStyle(1)}`}
            >
              {initials(top[1]?.display_name ?? "")}
            </div>
            <span className="text-center text-[10px] font-bold text-slate-300">2</span>
            <span className="max-w-full truncate text-center text-xs text-white/80">{top[1]?.display_name}</span>
            <span className="text-[10px] text-cyan-300/80">{top[1]?.vote_count ?? 0} votes</span>
          </div>
          <div className="flex flex-col items-center">
            <div
              className={`mb-2 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl bg-gradient-to-br text-base font-bold text-amber-950 ${rankStyle(0)}`}
            >
              {initials(top[0]?.display_name ?? "")}
            </div>
            <span className="text-center text-[10px] font-bold text-amber-200">1</span>
            <span className="max-w-full truncate text-center text-sm font-semibold text-white">{top[0]?.display_name}</span>
            <span className="text-xs font-bold text-cyan-300">{top[0]?.vote_count ?? 0} votes</span>
          </div>
          <div className="flex flex-col items-center">
            <div
              className={`mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-sm font-bold text-white ${rankStyle(2)}`}
            >
              {initials(top[2]?.display_name ?? "")}
            </div>
            <span className="text-center text-[10px] font-bold text-amber-900/90">3</span>
            <span className="max-w-full truncate text-center text-xs text-white/80">{top[2]?.display_name}</span>
            <span className="text-[10px] text-cyan-300/80">{top[2]?.vote_count ?? 0} votes</span>
          </div>
        </div>
      )}

      {listRows.length > 0 && (
        <ol className={`space-y-2 ${showPodium ? "border-t border-white/10 pt-4" : ""}`}>
          {listRows.map((row, idx) => {
            const rank = listOffset + idx + 1;
            const styleIdx = Math.min(rank - 1, 3);
            return (
              <li
                key={row.host_id}
                className="group flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2.5 transition hover:border-fuchsia-500/25 hover:bg-white/[0.07]"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-xs font-bold text-white ${rankStyle(styleIdx)}`}
                >
                  {rank}
                </span>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[10px] font-bold text-white/70">
                  {initials(row.display_name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white/95">{row.display_name}</p>
                  <p className="text-[10px] uppercase tracking-wider text-white/35">DJ</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-display text-lg font-bold text-cyan-300 tabular-nums">{row.vote_count}</p>
                  <p className="text-[9px] uppercase text-white/35">votes</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {rows.length === 0 && !error && (
        <p className="text-center text-sm text-white/40">No votes on the board yet — drop fire in a room.</p>
      )}

      {compact && (
        <Link to="/leaderboard" className="block text-center text-xs font-medium text-fuchsia-300/90 hover:text-fuchsia-200">
          Full rankings →
        </Link>
      )}
    </div>
  );
}
