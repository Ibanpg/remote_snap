import { Link } from "react-router-dom";

const steps = [
  {
    title: "1. Create an account",
    body: "Sign up with email. Your DJ name is stored on your profile so chat and the leaderboard show who you are.",
  },
  {
    title: "2. Floor = live & upcoming sets",
    body: "The lobby lists sessions that are scheduled or live. Open any card to enter that room as a guest.",
  },
  {
    title: "3. Only DJs broadcast",
    body: "If you start a set, open the DJ booth. One Snapchat Lens (set in your env) runs on your webcam; that composited feed is what streams to the room. Viewers watch and chat — they don’t send video to the crowd.",
  },
  {
    title: "4. Chat & votes",
    body: "Chat is stored in the database and updates live. You can drop one vote per set for the DJ (you can’t vote for yourself). Votes roll up into the global DJ leaderboard.",
  },
  {
    title: "5. Tech under the hood",
    body: "Supabase handles auth, Postgres, row-level security, and realtime chat. A small WebSocket server exchanges WebRTC signaling (SDP/ICE). Media flows peer-style from DJ to viewers — for big crowds you’d swap in a media server (SFU) and TURN.",
  },
];

export function HowItWorksPage() {
  return (
    <article className="glass-panel-strong rounded-2xl p-8 md:p-10">
      <h1 className="font-display text-3xl font-bold text-gradient md:text-4xl">How it works</h1>
      <p className="mt-4 text-white/60">
        Quick tour of NOCTURNE — what each role does and how the pieces connect.
      </p>

      <ol className="mt-10 space-y-6">
        {steps.map((s) => (
          <li
            key={s.title}
            className="rounded-2xl border border-white/10 bg-black/25 px-5 py-5 md:px-6 md:py-6"
          >
            <h2 className="font-display text-lg font-bold text-fuchsia-200/95">{s.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/58">{s.body}</p>
          </li>
        ))}
      </ol>

      <div className="mt-12 rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-5 text-sm text-cyan-100/85">
        <strong className="text-cyan-200">Lens setup:</strong> put{" "}
        <code className="text-white/80">VITE_SNAP_API_TOKEN</code>,{" "}
        <code className="text-white/80">VITE_LENS_ID</code>, and{" "}
        <code className="text-white/80">VITE_LENS_GROUP_ID</code> in <code className="text-white/80">web/.env</code> (from
        the Snap / Camera Kit portal). Restart Vite after changes.
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link to="/about" className="btn-ghost">
          About
        </Link>
        <Link to="/auth" className="btn-neon">
          Sign in to try it
        </Link>
      </div>
    </article>
  );
}
