// webrtc.js
let pc;
let ws;
let localStream;
let pendingCandidates = [];

// --- Инициализация WebSocket и PeerConnection ---
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
    if (audio) audio.srcObject = event.streams[0];
  };

  // --- Обработка сообщений WebSocket ---
  ws.onmessage = async (e) => {
    const msg = JSON.parse(e.data);

    try {
      // --- Offer ---
      if (msg.type === "offer") {
        if (pc.signalingState !== "stable") {
          console.warn("Offer отложен, текущее состояние:", pc.signalingState);
          return;
        }

        await pc.setRemoteDescription(msg.sdp);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "answer", sdp: answer }));
        }

        // Применяем отложенные ICE-кандидаты
        for (const c of pendingCandidates) {
          await pc.addIceCandidate(c);
        }
        pendingCandidates = [];
      }

      // --- Answer ---
      if (msg.type === "answer") {
        if (pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(msg.sdp);

          // Применяем отложенные ICE-кандидаты
          for (const c of pendingCandidates) {
            await pc.addIceCandidate(c);
          }
          pendingCandidates = [];
        } else {
          console.warn("Answer пропущен, текущее состояние:", pc.signalingState);
        }
      }

      // --- ICE Candidate ---
      if (msg.type === "candidate") {
        if (pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(msg.candidate);
        } else {
          // Откладываем кандидата
          pendingCandidates.push(msg.candidate);
        }
      }
    } catch (err) {
      console.error("Ошибка обработки сообщения WebRTC:", err);
    }
  };
}

// --- Начало звонка ---
export async function startCall() {
  if (!pc) {
    console.error("PeerConnection не инициализирован");
    return;
  }

  // Получаем микрофон
  localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));

  // Создаём offer
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "offer", sdp: offer }));
  } else {
    console.warn("WebSocket ещё не подключён. Попробуйте позже.");
  }
}
