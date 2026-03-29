import { Link } from "react-router-dom";
import { LeaderboardBoard } from "../components/LeaderboardBoard";
import { useLeaderboard } from "../hooks/useLeaderboard";

export function LeaderboardPage() {
  const { rows, error } = useLeaderboard(40, 30000);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white md:text-4xl">Hall of fame</h1>
          <p className="mt-2 max-w-xl text-white/50">
            Rankings from fire votes across every set. One vote per guest per session.
          </p>
        </div>
        <Link to="/" className="btn-ghost text-sm">
          ← Back to floor
        </Link>
      </div>

      <div className="glass-panel-strong rounded-2xl p-6 md:p-8">
        <h2 className="font-display text-sm font-bold uppercase tracking-[0.2em] text-white/40">Global leaderboard</h2>
        <div className="mt-6">
          <LeaderboardBoard rows={rows} error={error} />
        </div>
      </div>
    </div>
  );
}
