import { useEffect } from "react";
import { initWebRTC, startCall } from "./hooks/webrtc.js";

export default function App() {
  useEffect(() => {
    initWebRTC();
  }, []);

  return (
    <>
      <button onClick={startCall}>Позвонить</button>
      <audio id="remoteAudio" autoPlay playsInline></audio>
    </>
  );
}
