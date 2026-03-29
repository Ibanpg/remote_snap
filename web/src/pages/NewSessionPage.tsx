import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { randomWebrtcRoom } from "../lib/sessionUtils";

export function NewSessionPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setPending(true);
    const webrtc_room = randomWebrtcRoom();
    const { data, error: err } = await supabase
      .from("dj_sessions")
      .insert({
        host_id: user.id,
        title: title.trim() || "Untitled set",
        description: description.trim() || null,
        webrtc_room,
        status: "scheduled",
      })
      .select("id")
      .single();

    setPending(false);
    if (err) {
      setError(err.message);
      return;
    }
    navigate(`/session/${data.id}/booth`);
  }

  return (
    <div className="mx-auto max-w-lg">
      <h2 className="font-display text-3xl font-bold text-white">Start a set</h2>
      <p className="mt-2 text-white/45">You’ll open the DJ booth with Snapchat Camera Kit, then go live.</p>

      <form onSubmit={(e) => void handleSubmit(e)} className="glass-panel-strong mt-8 space-y-5 rounded-2xl p-8">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-white/40">Set title</label>
          <input className="input-club" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Midnight acid set" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-white/40">Vibe / notes</label>
          <textarea
            className="input-club min-h-[100px] resize-y"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Genre, BPM, requests…"
          />
        </div>
        {error && <p className="text-sm text-rose-300">{error}</p>}
        <button type="submit" disabled={pending} className="btn-neon w-full">
          {pending ? "Creating…" : "Create & open booth"}
        </button>
      </form>
    </div>
  );
}
