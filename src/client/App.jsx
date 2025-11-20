import { useEffect } from "react";
import { initWebRTC, startCall } from "./hooks/webrtc.js";
import MicVisualizer from "./testmicro.jsx";

export default function App() {
  useEffect(() => {
    initWebRTC();
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h2>WebRTC Звонок</h2>
      <button onClick={startCall}>Позвонить</button>
      <audio id="remoteAudio" autoPlay></audio>

      <h2>Проверка микрофона</h2>
      <MicVisualizer />
    </div>
  );
}
