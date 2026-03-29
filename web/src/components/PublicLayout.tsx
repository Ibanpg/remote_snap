import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function PublicLayout() {
  const { user } = useAuth();

  return (
    <div className="club-bg club-grid min-h-screen">
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-transparent to-black/70" />
      <header className="relative z-10 border-b border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <Link to={user ? "/" : "/auth"} className="font-display text-xl font-extrabold text-gradient md:text-2xl">
            NOCTURNE
          </Link>
          <nav className="flex flex-wrap items-center gap-2 text-sm">
            <Link className="rounded-lg px-3 py-2 text-white/65 hover:bg-white/10 hover:text-white" to="/how-it-works">
              How it works
            </Link>
            <Link className="rounded-lg px-3 py-2 text-white/65 hover:bg-white/10 hover:text-white" to="/about">
              About
            </Link>
            {user ? (
              <Link className="btn-neon py-2 text-sm" to="/">
                Enter floor
              </Link>
            ) : (
              <Link className="btn-neon py-2 text-sm" to="/auth">
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className="relative z-10 mx-auto max-w-3xl px-4 py-12">
        <Outlet />
      </main>
      <footer className="relative z-10 border-t border-white/10 py-8 text-center text-xs text-white/35">
        NOCTURNE · Virtual club demo · Snapchat Camera Kit + Supabase
      </footer>
    </div>
  );
}
