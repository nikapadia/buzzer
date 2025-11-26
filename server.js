// Simple gameshow buzzer server
const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: 8080 });

let lobbies = {}; // { lobbyCode: { host: ws, players: {}, buzzOrder: [] } }

function send(ws, type, data) {
    ws.send(JSON.stringify({ type, ...data }));
}

wss.on("connection", ws => {
    ws.on("message", raw => {
        let msg = {};
        try { msg = JSON.parse(raw); } catch { return; }

        // Create lobby
        if (msg.type === "create_lobby") {
            const code = Math.random().toString(36).substring(2, 6).toUpperCase();
            lobbies[code] = { host: ws, players: {}, buzzOrder: [] };
            send(ws, "lobby_created", { code });
        }

        // Join lobby
        if (msg.type === "join_lobby") {
            const lobby = lobbies[msg.code];
            if (!lobby) return send(ws, "error", { message: "Lobby not found" });

            lobby.players[msg.name] = ws;
            send(ws, "joined_successfully", { name: msg.name });
            send(lobby.host, "player_joined", { name: msg.name });
        }

        // Buzz
        if (msg.type === "buzz") {
            const lobby = lobbies[msg.code];
            if (!lobby) return;

            if (!lobby.buzzOrder.includes(msg.name)) {
                lobby.buzzOrder.push(msg.name);
                send(lobby.host, "buzz_update", { order: lobby.buzzOrder });
            }
        }

        // Player sends a message to the host
        if (msg.type === "player_message") {
            const lobby = lobbies[msg.code];
            if (!lobby) return;

            // Send message only to the host
            send(lobby.host, "player_message", {
                name: msg.name,
                text: msg.text
            });
        }


        // Reset
        if (msg.type === "reset") {
            const lobby = lobbies[msg.code];
            if (!lobby) return;
            lobby.buzzOrder = [];
            send(lobby.host, "buzz_update", { order: [] });
        }
    });
});

console.log("Buzzer server running on ws://localhost:8080");
