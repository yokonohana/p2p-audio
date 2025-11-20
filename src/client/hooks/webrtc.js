let pc;
let ws;
let localStream;
let pendingCandidates = [];
let tracksAdded = false;

export function initWebRTC() {
  ws = new WebSocket("ws://46.32.73.87:3001");

  ws.onopen = () => console.log("WebSocket подключён!");
  ws.onerror = (err) => console.error("Ошибка WebSocket:", err);
  ws.onclose = () => console.log("WebSocket закрыт");

  window.pc = pc = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "turn:freestun.net:3478", username: "free", credential: "free" },
      { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" }
    ]
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
      audio.autoplay = true;
      audio.volume = 1;
      audio.muted = false;
      audio.play().catch(() => console.log("Автовоспроизведение заблокировано. Нажмите на страницу."));
    }
  };

  pc.onconnectionstatechange = () =>
    console.log("Connection state:", pc.connectionState);

  ws.onmessage = async (e) => {
    const msg = JSON.parse(e.data);

    try {
      if (msg.type === "offer") {
        await ensureLocalAudio();

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
  if (pc.signalingState !== "stable") {
    console.warn("Call уже инициирован, подождите завершения текущего offer");
    return;
  }

  await ensureLocalAudio();

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "offer", sdp: offer }));
  }
}

async function ensureLocalAudio() {
  if (!localStream) {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  }
  if (!tracksAdded) {
    localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));
    tracksAdded = true;
  }
}
