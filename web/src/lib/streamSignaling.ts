export const ICE: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export function buildSignalUrl(
  role: "host" | "viewer",
  room: string,
  signalBase: string,
): string {
  const base = signalBase.replace(/\/$/, "");
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}role=${role}&room=${encodeURIComponent(room)}`;
}

export async function bufferIce(
  pc: RTCPeerConnection,
  queue: RTCIceCandidateInit[],
): Promise<void> {
  while (queue.length) {
    const c = queue.shift();
    if (c) await pc.addIceCandidate(c);
  }
}

export type HostSignaling = {
  connect: () => void;
  destroy: () => void;
  getViewerCount: () => number;
};

export function createHostSignaling(
  outbound: MediaStream,
  room: string,
  signalBase: string,
  onStatus: (msg: string, err?: boolean) => void,
): HostSignaling {
  const peers = new Map<string, RTCPeerConnection>();
  const iceQueues = new Map<string, RTCIceCandidateInit[]>();
  let ws: WebSocket | null = null;

  async function attachViewer(viewerId: string) {
    if (peers.has(viewerId)) return;
    const pc = new RTCPeerConnection(ICE);
    peers.set(viewerId, pc);
    iceQueues.set(viewerId, []);

    for (const track of outbound.getTracks()) {
      pc.addTrack(track, outbound);
    }

    pc.onicecandidate = (e) => {
      if (e.candidate && ws?.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "ice",
            viewerId,
            candidate: e.candidate.toJSON(),
          }),
        );
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    ws?.send(JSON.stringify({ type: "offer", viewerId, sdp: offer.sdp }));
    onStatus(`Streaming to ${peers.size} viewer(s)`);
  }

  async function onAnswer(viewerId: string, sdp: string) {
    const pc = peers.get(viewerId);
    if (!pc) return;
    await pc.setRemoteDescription({ type: "answer", sdp });
    const q = iceQueues.get(viewerId) || [];
    await bufferIce(pc, q);
  }

  async function onHostIce(viewerId: string, candidate: RTCIceCandidateInit) {
    const pc = peers.get(viewerId);
    const q = iceQueues.get(viewerId);
    if (!pc || !q) return;
    if (!pc.remoteDescription) {
      q.push(candidate);
      return;
    }
    await pc.addIceCandidate(candidate);
  }

  function detachViewer(viewerId: string) {
    peers.get(viewerId)?.close();
    peers.delete(viewerId);
    iceQueues.delete(viewerId);
    onStatus(
      peers.size ? `Streaming to ${peers.size} viewer(s)` : "Waiting for viewers…",
    );
  }

  function destroy() {
    for (const id of [...peers.keys()]) detachViewer(id);
    ws?.close();
    ws = null;
  }

  function connect() {
    ws = new WebSocket(buildSignalUrl("host", room, signalBase));
    ws.onopen = () => onStatus("Waiting for viewers…");
    ws.onmessage = (ev) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      if (msg.type === "viewer-joined" && typeof msg.viewerId === "string") {
        void attachViewer(msg.viewerId);
      }
      if (msg.type === "viewer-left" && typeof msg.viewerId === "string") {
        detachViewer(msg.viewerId);
      }
      if (msg.type === "answer" && typeof msg.viewerId === "string" && typeof msg.sdp === "string") {
        void onAnswer(msg.viewerId, msg.sdp);
      }
      if (
        msg.type === "ice" &&
        typeof msg.viewerId === "string" &&
        msg.candidate != null
      ) {
        void onHostIce(msg.viewerId, msg.candidate as RTCIceCandidateInit);
      }
    };
    ws.onerror = () =>
      onStatus("Signaling error — is the server running on port 3001?", true);
  }

  return {
    connect,
    destroy,
    getViewerCount: () => peers.size,
  };
}

export type ViewerSignaling = {
  connect: () => void;
  destroy: () => void;
};

export function createViewerSignaling(
  room: string,
  signalBase: string,
  video: HTMLVideoElement,
  onStatus: (msg: string, err?: boolean) => void,
): ViewerSignaling {
  let pc: RTCPeerConnection | null = null;
  const icePending: RTCIceCandidateInit[] = [];
  let ws: WebSocket | null = null;

  async function handleOffer(sdp: string) {
    pc = new RTCPeerConnection(ICE);
    pc.ontrack = (e) => {
      if (video.srcObject !== e.streams[0]) {
        video.srcObject = e.streams[0];
      }
    };
    pc.onicecandidate = (e) => {
      if (e.candidate && ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "ice", candidate: e.candidate.toJSON() }));
      }
    };

    await pc.setRemoteDescription({ type: "offer", sdp });
    while (icePending.length) {
      const c = icePending.shift();
      if (c) await pc.addIceCandidate(c);
    }

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    ws?.send(JSON.stringify({ type: "answer", sdp: answer.sdp }));
    onStatus("Connected — enjoy the set.");
  }

  async function handleIce(candidate: RTCIceCandidateInit) {
    if (!pc?.remoteDescription) {
      icePending.push(candidate);
      return;
    }
    await pc.addIceCandidate(candidate);
  }

  function destroy() {
    pc?.close();
    pc = null;
    icePending.length = 0;
    ws?.close();
    ws = null;
    video.srcObject = null;
  }

  function connect() {
    ws = new WebSocket(buildSignalUrl("viewer", room, signalBase));
    ws.onopen = () => onStatus("Joining stream…");
    ws.onmessage = async (ev) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      if (msg.type === "offer" && typeof msg.sdp === "string") {
        await handleOffer(msg.sdp);
      }
      if (msg.type === "ice" && msg.candidate != null) {
        await handleIce(msg.candidate as RTCIceCandidateInit);
      }
    };
    ws.onerror = () => {
      onStatus("Could not reach signaling server.", true);
    };
  }

  return { connect, destroy };
}
