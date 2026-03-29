import { Link } from "react-router-dom";

export function AboutPage() {
  return (
    <article className="glass-panel-strong rounded-2xl p-8 md:p-10">
      <h1 className="font-display text-3xl font-bold text-gradient md:text-4xl">About NOCTURNE</h1>
      <p className="mt-4 text-lg text-white/70">
        NOCTURNE is an experimental virtual club built for DJs who want Snapchat-style AR on the web and for crowds who
        want to hang out, chat, and vote — without everyone needing the Snapchat app.
      </p>

      <section className="mt-10 space-y-4 text-white/60">
        <h2 className="font-display text-xl font-semibold text-white">Why it exists</h2>
        <p>
          Live streaming is everywhere, but branded AR lenses are still awkward outside Snap’s ecosystem. This project
          wires{" "}
          <strong className="text-white/85">Snap Camera Kit Web</strong> into a browser DJ booth, pairs it with{" "}
          <strong className="text-white/85">WebRTC</strong> for the stage feed, and uses{" "}
          <strong className="text-white/85">Supabase</strong> for accounts, rooms, chat, and leaderboards.
        </p>
      </section>

      <section className="mt-10 space-y-4 text-white/60">
        <h2 className="font-display text-xl font-semibold text-white">Who built what</h2>
        <p>
          You’re running a demo stack: a Vite + React front end, a tiny Node signaling server for WebRTC handshake, and
          your own Supabase project holding data. Lenses and API tokens come from your Snap developer account — swap them
          to match your brand or performance.
        </p>
      </section>

      <section className="mt-10 space-y-4 text-white/60">
        <h2 className="font-display text-xl font-semibold text-white">Safety & expectations</h2>
        <p>
          This is not a production moderation platform. For real events, add reporting, rate limits, admin tools, HTTPS +
          TURN for WebRTC, and clear community guidelines. Treat tokens and keys as secrets.
        </p>
      </section>

      <div className="mt-12 flex flex-wrap gap-3">
        <Link to="/how-it-works" className="btn-ghost">
          How it works
        </Link>
        <Link to="/auth" className="btn-neon">
          Enter the club
        </Link>
      </div>
    </article>
  );
}
