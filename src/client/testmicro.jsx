import { useState, useRef } from "react";

export default function MicVisualizer() {
  const [testing, setTesting] = useState(false);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);

  const startTest = async () => {
    if (testing) return;
    setTesting(true);

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioCtxRef.current = new AudioContext();
    const source = audioCtxRef.current.createMediaStreamSource(stream);

    analyserRef.current = audioCtxRef.current.createAnalyser();
    analyserRef.current.fftSize = 256;
    source.connect(analyserRef.current);

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    function draw() {
      analyserRef.current.getByteFrequencyData(dataArray);
      const volume = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "green";
      ctx.fillRect(0, canvas.height - volume, canvas.width, volume);

      animationRef.current = requestAnimationFrame(draw);
    }

    draw();
  };

  const stopTest = () => {
    setTesting(false);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (audioCtxRef.current) audioCtxRef.current.close();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div>
      <button onClick={startTest}>Проверить микрофон</button>
      <button onClick={stopTest}>Остановить</button>
      <canvas ref={canvasRef} width={300} height={100} style={{border: "1px solid #000"}}></canvas>
    </div>
  );
}
