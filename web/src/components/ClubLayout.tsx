import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function ClubLayout() {
  const { user, signOut } = useAuth();

  return (
    <div className="club-bg club-grid relative min-h-screen">
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" />

      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/30 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link to="/" className="group flex items-center gap-2">
            <span className="font-display text-xl font-extrabold tracking-tight text-gradient md:text-2xl">
              NOCTURNE
            </span>
            <span className="hidden rounded-full border border-fuchsia-500/40 bg-fuchsia-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-fuchsia-200/90 sm:inline">
              beta
            </span>
          </Link>

          <nav className="flex flex-wrap items-center gap-1 sm:gap-2">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `rounded-lg px-2.5 py-2 text-sm font-medium transition sm:px-3 ${isActive ? "bg-white/10 text-white" : "text-white/60 hover:text-white"}`
              }
            >
              Floor
            </NavLink>
            <NavLink
              to="/leaderboard"
              className={({ isActive }) =>
                `rounded-lg px-2.5 py-2 text-sm font-medium transition sm:px-3 ${isActive ? "bg-white/10 text-white" : "text-white/60 hover:text-white"}`
              }
            >
              Rankings
            </NavLink>
            <NavLink
              to="/session/new"
              className={({ isActive }) =>
                `rounded-lg px-2.5 py-2 text-sm font-medium transition sm:px-3 ${isActive ? "bg-white/10 text-white" : "text-white/60 hover:text-white"}`
              }
            >
              Start a set
            </NavLink>
            <Link
              to="/how-it-works"
              className="rounded-lg px-2.5 py-2 text-sm font-medium text-white/60 transition hover:text-white lg:px-3"
            >
              How it works
            </Link>
            <Link
              to="/about"
              className="rounded-lg px-2.5 py-2 text-sm font-medium text-white/60 transition hover:text-white lg:px-3"
            >
              About
            </Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden max-w-[140px] truncate text-xs text-white/50 md:inline" title={user?.email ?? ""}>
              {user?.email}
            </span>
            <button type="button" onClick={() => void signOut()} className="btn-ghost text-xs sm:text-sm">
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
