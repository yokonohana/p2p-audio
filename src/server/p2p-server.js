import { WebSocketServer } from "ws";

const PORT = 3001;

const wss = new WebSocketServer({ port: PORT, host: '0.0.0.0' });

wss.on("connection", (socket) => {
    console.log("Клиент подключился");

    socket.on("message", (data) => {
        const msg = JSON.parse(data);

        // Раздаём всем остальным клиентам
        wss.clients.forEach((client) => {
            if (client !== socket && client.readyState === 1) {
            client.send(JSON.stringify(msg));
            }
        });
    });

    socket.on("close", () => {
        console.log("Клиент отключился");
    });
});

console.log(`P2P сигналинг-сервер запущен на порту ${PORT}`);
