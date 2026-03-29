import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { formatRelativeTime } from "../lib/time";
import { createViewerSignaling } from "../lib/streamSignaling";

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

type CommentRow = {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  profiles: { display_name: string } | null;
};

function signalBaseUrl() {
  return (
    (import.meta.env.VITE_SIGNAL_URL as string | undefined) || `ws://${location.hostname}:3001`
  );
}

function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2) return (p[0]![0] + p[1]![0]).toUpperCase();
  return (name.slice(0, 2) || "?").toUpperCase();
}

export function WatchPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const [session, setSession] = useState<SessionRow | null>(null);
  const [hostName, setHostName] = useState("");
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [sigStatus, setSigStatus] = useState("");
  const [sigErr, setSigErr] = useState(false);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [voteCount, setVoteCount] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);
  const [voteMsg, setVoteMsg] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    if (!sessionId) return;
    const { data, error } = await supabase.from("dj_sessions").select("*").eq("id", sessionId).maybeSingle();
    if (error) {
      setLoadErr(error.message);
      return;
    }
    if (!data) {
      setLoadErr("Session not found.");
      return;
    }
    setSession(data);
    setLoadErr(null);
    const { data: hp } = await supabase.from("profiles").select("display_name").eq("id", data.host_id).maybeSingle();
    setHostName(hp?.display_name ?? "DJ");
  }, [sessionId]);

  const refreshVotes = useCallback(async () => {
    if (!sessionId) return;
    const { count } = await supabase
      .from("dj_votes")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId);
    setVoteCount(count ?? 0);
    if (user) {
      const { data: mine } = await supabase
        .from("dj_votes")
        .select("id")
        .eq("session_id", sessionId)
        .eq("voter_id", user.id)
        .maybeSingle();
      setHasVoted(!!mine);
    }
  }, [sessionId, user]);

  const refreshComments = useCallback(async () => {
    if (!sessionId) return;
    const { data, error } = await supabase
      .from("session_comments")
      .select("id, body, created_at, user_id, profiles(display_name)")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });
    if (!error && data) setComments(data as unknown as CommentRow[]);
  }, [sessionId]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    void refreshVotes();
  }, [refreshVotes]);

  useEffect(() => {
    void refreshComments();
  }, [refreshComments]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  useEffect(() => {
    if (!sessionId || !session?.webrtc_room || !videoRef.current) return;
    setSigStatus("Connecting…");
    setSigErr(false);
    const v = createViewerSignaling(session.webrtc_room, signalBaseUrl(), videoRef.current, (msg, err) => {
      setSigStatus(msg);
      if (err) setSigErr(true);
    });
    v.connect();
    return () => v.destroy();
  }, [session?.webrtc_room, sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase
      .channel(`comments:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "session_comments",
          filter: `session_id=eq.${sessionId}`,
        },
        () => void refreshComments(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId, refreshComments]);

  async function sendComment() {
    if (!user || !sessionId || !commentBody.trim()) return;
    const { error } = await supabase.from("session_comments").insert({
      session_id: sessionId,
      user_id: user.id,
      body: commentBody.trim(),
    });
    if (!error) {
      setCommentBody("");
      void refreshComments();
    }
  }

  async function sendVote() {
    if (!user || !sessionId || !session) return;
    setVoteMsg(null);
    const { error } = await supabase.from("dj_votes").insert({
      session_id: sessionId,
      voter_id: user.id,
    });
    if (error) setVoteMsg(error.message);
    else {
      setHasVoted(true);
      void refreshVotes();
    }
  }

  const isHost = user && session && user.id === session.host_id;

  if (loadErr || !session) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center text-white/70">
        {loadErr ?? "Loading…"}
        <div className="mt-4">
          <Link className="text-fuchsia-400 underline" to="/">
            Back to floor
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_400px]">
      <div>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Link to="/" className="text-sm text-white/45 hover:text-white">
            ← Floor
          </Link>
          <Link to="/how-it-works" className="text-xs text-white/35 hover:text-white/55">
            How it works
          </Link>
          {isHost && (
            <Link
              to={`/session/${session.id}/booth`}
              className="rounded-lg bg-amber-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-200"
            >
              DJ booth
            </Link>
          )}
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
              session.status === "live" ? "bg-rose-500/30 text-rose-100" : "bg-white/10 text-white/50"
            }`}
          >
            {session.status}
          </span>
        </div>

        <h1 className="font-display text-3xl font-bold text-white md:text-4xl">{session.title}</h1>
        <p className="mt-1 text-white/50">
          Hosted by <span className="text-white/75">{hostName}</span>
        </p>
        {session.description && <p className="mt-3 max-w-2xl text-sm text-white/40">{session.description}</p>}

        <div className="glass-panel-strong relative mt-6 overflow-hidden rounded-2xl border border-white/10 shadow-[0_0_60px_-20px_rgba(168,85,247,0.35)]">
          <div className="flex items-center justify-between border-b border-white/10 bg-black/40 px-4 py-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Main stage · DJ broadcast</span>
            {session.status === "live" && (
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-rose-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
                </span>
                Live
              </span>
            )}
          </div>
          <div className="aspect-video bg-black/80">
            <video ref={videoRef} className="h-full w-full object-contain" playsInline autoPlay controls />
          </div>
          <p className={`border-t border-white/10 px-4 py-2 text-xs ${sigErr ? "text-rose-300" : "text-white/45"}`}>
            {sigStatus || "Waiting for signal…"}
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
          <div className="flex flex-wrap items-center gap-4">
            {!isHost && (
              <button
                type="button"
                disabled={hasVoted || session.status === "ended"}
                onClick={() => void sendVote()}
                className="btn-neon"
              >
                {hasVoted ? "Fire vote locked in" : "Drop a fire vote"}
              </button>
            )}
            <div className="flex items-baseline gap-2">
              <span className="font-display text-2xl font-bold text-cyan-300 tabular-nums">{voteCount}</span>
              <span className="text-sm text-white/45">votes this set</span>
            </div>
            {voteMsg && <span className="text-sm text-rose-300">{voteMsg}</span>}
          </div>
          <p className="mt-3 text-xs text-white/35">
            Votes count toward the{" "}
            <Link className="text-fuchsia-400/90 underline hover:text-fuchsia-300" to="/leaderboard">
              global DJ leaderboard
            </Link>
            . You can’t vote for your own set.
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-col gap-4">
        <div className="glass-panel-strong flex max-h-[min(640px,70vh)] min-h-[420px] flex-col overflow-hidden rounded-2xl border border-white/10 shadow-[0_0_50px_-15px_rgba(34,211,238,0.2)]">
          <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-fuchsia-950/40 to-violet-950/30 px-4 py-3">
            <div>
              <h3 className="font-display text-base font-bold text-white">Room chat</h3>
              <p className="text-[10px] uppercase tracking-wider text-white/40">Realtime · {comments.length} messages</p>
            </div>
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" title="Channel open" />
          </div>

          <div className="chat-scroll flex-1 space-y-3 overflow-y-auto px-3 py-4">
            {comments.map((c) => {
              const mine = user?.id === c.user_id;
              const name = c.profiles?.display_name ?? "Guest";
              return (
                <div
                  key={c.id}
                  className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[10px] font-bold ${
                      mine
                        ? "bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white"
                        : "border border-white/15 bg-white/10 text-white/80"
                    }`}
                  >
                    {initials(name)}
                  </div>
                  <div className={`max-w-[85%] min-w-0 ${mine ? "items-end text-right" : ""} flex flex-col`}>
                    <div
                      className={`rounded-2xl px-3.5 py-2.5 text-sm leading-snug ${
                        mine
                          ? "rounded-tr-sm border border-fuchsia-500/30 bg-fuchsia-950/50 text-white/95"
                          : "rounded-tl-sm border border-white/10 bg-black/35 text-white/88"
                      }`}
                    >
                      <span className={`mb-1 block text-[10px] font-semibold uppercase tracking-wide ${mine ? "text-fuchsia-200/80" : "text-cyan-200/70"}`}>
                        {mine ? "You" : name}
                      </span>
                      <p className="whitespace-pre-wrap break-words">{c.body}</p>
                    </div>
                    <span className={`mt-1 px-1 text-[10px] text-white/30 ${mine ? "text-right" : ""}`}>
                      {formatRelativeTime(c.created_at)}
                    </span>
                  </div>
                </div>
              );
            })}
            {comments.length === 0 && (
              <div className="rounded-xl border border-dashed border-white/15 bg-black/20 py-12 text-center">
                <p className="text-sm text-white/45">No messages yet</p>
                <p className="mt-1 text-xs text-white/30">Be the first to hype the DJ.</p>
              </div>
            )}
            <div ref={commentsEndRef} />
          </div>

          <div className="border-t border-white/10 bg-black/30 p-3">
            <div className="flex gap-2">
              <input
                className="input-club flex-1 text-sm"
                placeholder={user ? "Message the room…" : "Sign in to chat"}
                disabled={!user}
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && void sendComment()}
              />
              <button
                type="button"
                disabled={!user || !commentBody.trim()}
                className="btn-neon shrink-0 px-5 py-2 text-sm"
                onClick={() => void sendComment()}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
