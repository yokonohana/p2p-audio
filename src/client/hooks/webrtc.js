let pc;
let ws;
let localStream;
let pendingCandidates = [];

export function initWebRTC() {
  ws = new WebSocket("ws://46.32.73.87:3001");

  ws.onopen = () => console.log("WebSocket подключён!");
  ws.onerror = (err) => console.error("Ошибка WebSocket:", err);
  ws.onclose = () => console.log("WebSocket закрыт");

  pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  pc.onicecandidate = (e) => {
    if (e.candidate && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "candidate", candidate: e.candidate }));
    }
  };

  pc.ontrack = (event) => {
    const audio = document.getElementById("remoteAudio");
    if (audio) {
      audio.srcObject = event.streams[0];
      audio.play().catch(() => {});
    }
  };

  pc.onconnectionstatechange = () => console.log("Connection state:", pc.connectionState);

  ws.onmessage = async (e) => {
    const msg = JSON.parse(e.data);
    try {
      if (msg.type === "offer") {
        if (pc.signalingState === "have-local-offer") {
          await pc.setLocalDescription({ type: "rollback" });
        }
        await pc.setRemoteDescription(msg.sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "answer", sdp: answer }));
        }
        for (const c of pendingCandidates) {
          try { await pc.addIceCandidate(c); } catch {}
        }
        pendingCandidates = [];
      }

      if (msg.type === "answer") {
        if (pc.signalingState === "have-local-offer" || pc.signalingState === "stable") {
          await pc.setRemoteDescription(msg.sdp);
          for (const c of pendingCandidates) {
            try { await pc.addIceCandidate(c); } catch {}
          }
          pendingCandidates = [];
        }
      }

      if (msg.type === "candidate") {
        if (pc.remoteDescription && pc.remoteDescription.type) {
          try { await pc.addIceCandidate(msg.candidate); } catch {}
        } else {
          pendingCandidates.push(msg.candidate);
        }
      }
    } catch {}
  };
}

export async function startCall() {
  if (!pc) return;
  if (pc.signalingState !== "stable") return;
  if (!localStream) {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));
  }
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "offer", sdp: offer }));
  }
}
