import {
  bootstrapCameraKit,
  createMediaStreamSource,
  Transform2D,
  type CameraKitSession,
} from "@snap/camera-kit";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { createHostSignaling } from "../lib/streamSignaling";

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

function signalBaseUrl() {
  return (
    (import.meta.env.VITE_SIGNAL_URL as string | undefined) || `ws://${location.hostname}:3001`
  );
}

function snapEnv() {
  return {
    apiToken: (import.meta.env.VITE_SNAP_API_TOKEN as string | undefined)?.trim(),
    lensId: (import.meta.env.VITE_LENS_ID as string | undefined)?.trim(),
    lensGroupId: (import.meta.env.VITE_LENS_GROUP_ID as string | undefined)?.trim(),
  };
}

export function BoothPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user } = useAuth();
  const liveRef = useRef<HTMLCanvasElement>(null);
  const captureMountRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<ReturnType<typeof createHostSignaling> | null>(null);
  const sessionRef = useRef<CameraKitSession | null>(null);
  const mediaRef = useRef<MediaStream | null>(null);

  const [session, setSession] = useState<SessionRow | null>(null);
  const [sessionFetchErr, setSessionFetchErr] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [onAir, setOnAir] = useState(false);
  const [starting, setStarting] = useState(false);

  const load = useCallback(async () => {
    if (!sessionId) return;
    const { data, error } = await supabase.from("dj_sessions").select("*").eq("id", sessionId).maybeSingle();
    if (error) {
      setSessionFetchErr(error.message);
      return;
    }
    setSession(data);
    setSessionFetchErr(null);
  }, [sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const cleanupStream = useCallback(() => {
    hostRef.current?.destroy();
    hostRef.current = null;
    void sessionRef.current?.pause();
    sessionRef.current = null;
    mediaRef.current?.getTracks().forEach((t) => t.stop());
    mediaRef.current = null;
    captureMountRef.current?.replaceChildren();
    setOnAir(false);
    setStatus("");
  }, []);

  useEffect(() => () => cleanupStream(), [cleanupStream]);

  if (!sessionId) return <Navigate to="/" replace />;
  if (sessionFetchErr)
    return (
      <div className="text-rose-300">
        {sessionFetchErr}{" "}
        <Link className="underline" to="/">
          Floor
        </Link>
      </div>
    );
  if (!session) return <div className="text-white/50">Loading booth…</div>;
  if (!user || user.id !== session.host_id) {
    return <Navigate to={`/session/${sessionId}`} replace />;
  }

  const { apiToken, lensId, lensGroupId } = snapEnv();
  const snapReady = !!(apiToken && lensId && lensGroupId);

  async function goLive() {
    const s = session;
    if (!s) return;
    if (!snapReady || !liveRef.current) {
      setErr("Set VITE_SNAP_API_TOKEN, VITE_LENS_ID, and VITE_LENS_GROUP_ID in web/.env");
      return;
    }
    setStarting(true);
    setErr(null);
    try {
      cleanupStream();
      const cameraKit = await bootstrapCameraKit({
        apiToken: apiToken!,
        logger: "console",
      });
      const camSession = await cameraKit.createSession({
        liveRenderTarget: liveRef.current,
        renderWhileTabHidden: true,
      });
      sessionRef.current = camSession;
      if (captureMountRef.current) {
        captureMountRef.current.replaceChildren(camSession.output.capture);
      }

      camSession.events.addEventListener("error", ({ detail }) => {
        if (detail.error.name === "LensExecutionError") {
          setStatus("Lens failed in-browser — confirm Web support in Lens Studio / portal.");
        }
      });

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: true,
      });
      mediaRef.current = mediaStream;

      const source = createMediaStreamSource(mediaStream, {
        transform: Transform2D.MirrorX,
        cameraType: "user",
      });
      await camSession.setSource(source);
      const lens = await cameraKit.lensRepository.loadLens(lensId!, lensGroupId!);
      await camSession.applyLens(lens);
      await camSession.play("live");
      await camSession.play("capture");

      const cap = camSession.output.capture;
      const videoPart = cap.captureStream(30);
      const outbound = new MediaStream([...videoPart.getVideoTracks(), ...mediaStream.getAudioTracks()]);

      const signaling = createHostSignaling(outbound, s.webrtc_room, signalBaseUrl(), (msg, isErr) => {
        setStatus(msg);
        if (isErr) setErr(msg);
      });
      hostRef.current = signaling;
      signaling.connect();

      await supabase
        .from("dj_sessions")
        .update({ status: "live", started_at: new Date().toISOString() })
        .eq("id", s.id);
      setSession((prev) => (prev ? { ...prev, status: "live" } : prev));
      setOnAir(true);
      setStatus("You’re live — fans can join from the floor.");
    } catch (e) {
      console.error(e);
      setErr(e instanceof Error ? e.message : String(e));
      cleanupStream();
    } finally {
      setStarting(false);
    }
  }

  async function endSet() {
    const s = session;
    if (!s) return;
    await supabase
      .from("dj_sessions")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", s.id);
    cleanupStream();
    setSession((prev) => (prev ? { ...prev, status: "ended" } : prev));
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link to={`/session/${session.id}`} className="text-sm text-white/45 hover:text-white">
          ← Audience view
        </Link>
        <Link to="/" className="text-sm text-white/45 hover:text-white">
          Floor
        </Link>
        {onAir && (
          <span className="animate-pulse-glow rounded-full bg-rose-600/40 px-3 py-1 text-xs font-bold uppercase tracking-widest text-rose-100">
            On air
          </span>
        )}
      </div>

      <h1 className="font-display text-3xl font-bold text-white">DJ booth · {session.title}</h1>
      <p className="mt-1 text-sm text-white/45">
        One Lens from your env goes to the stream — configured in <code className="text-white/70">web/.env</code>.
      </p>

      {!snapReady && (
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Add <code className="text-white">VITE_SNAP_API_TOKEN</code>, <code className="text-white">VITE_LENS_ID</code>, and{" "}
          <code className="text-white">VITE_LENS_GROUP_ID</code> to <code className="text-white">web/.env</code>, then
          restart the dev server.
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="glass-panel-strong relative overflow-hidden rounded-2xl">
          <canvas ref={liveRef} className="aspect-video min-h-[200px] w-full bg-black object-contain" />
          <div
            ref={captureMountRef}
            className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
            aria-hidden
          />
          <p className="border-t border-white/10 px-4 py-2 text-xs text-white/50">{status}</p>
        </div>

        <div className="flex flex-col gap-3">
          {!onAir && session.status !== "ended" && (
            <button
              type="button"
              disabled={starting || !snapReady}
              className="btn-neon w-full"
              onClick={() => void goLive()}
            >
              {starting ? "Starting…" : "Go live"}
            </button>
          )}
          {onAir && (
            <button type="button" className="btn-ghost w-full border-rose-500/40 text-rose-200" onClick={() => void endSet()}>
              End set
            </button>
          )}
          {session.status === "ended" && <p className="text-sm text-white/45">This set has ended.</p>}
          {err && <p className="text-sm text-rose-300">{err}</p>}
        </div>
      </div>
    </div>
  );
}
