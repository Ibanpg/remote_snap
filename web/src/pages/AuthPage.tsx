import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function AuthPage() {
  const { user, loading, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      if (mode === "login") {
        const { error: err } = await signIn(email, password);
        if (err) setError(err.message);
      } else {
        if (!displayName.trim()) {
          setError("Choose a DJ name.");
          setPending(false);
          return;
        }
        const { error: err } = await signUp(email, password, displayName.trim());
        if (err) setError(err.message);
        else setError("Check your email to confirm, then sign in.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="club-bg club-grid flex min-h-screen flex-col items-center justify-center p-4">
      <div className="animate-float mb-8 text-center">
        <h1 className="font-display text-4xl font-extrabold text-gradient md:text-6xl">NOCTURNE</h1>
        <p className="mt-2 text-sm text-white/50">Virtual club · Snapchat lenses · Live votes</p>
      </div>

      <div className="glass-panel-strong w-full max-w-md rounded-2xl p-8 shadow-[0_0_80px_-20px_rgba(168,85,247,0.5)]">
        <div className="mb-6 flex rounded-xl bg-black/40 p-1">
          <button
            type="button"
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${mode === "login" ? "bg-fuchsia-600 text-white shadow-lg" : "text-white/50"}`}
            onClick={() => {
              setMode("login");
              setError(null);
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${mode === "signup" ? "bg-fuchsia-600 text-white shadow-lg" : "text-white/50"}`}
            onClick={() => {
              setMode("signup");
              setError(null);
            }}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-white/40">DJ name</label>
              <input
                className="input-club"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How you appear on the floor"
                autoComplete="nickname"
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-white/40">Email</label>
            <input
              className="input-club"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-white/40">Password</label>
            <input
              className="input-club"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>

          {error && (
            <p className={`text-sm ${error.startsWith("Check your") ? "text-cyan-300/90" : "text-rose-300"}`}>{error}</p>
          )}

          <button type="submit" disabled={pending} className="btn-neon w-full">
            {pending ? "…" : mode === "login" ? "Enter the club" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-white/35">
          By continuing you agree this is a demo — configure Supabase Auth (email) in your project.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-white/45">
        <Link to="/how-it-works" className="hover:text-white/85">
          How it works
        </Link>
        <Link to="/about" className="hover:text-white/85">
          About NOCTURNE
        </Link>
      </div>
    </div>
  );
}
