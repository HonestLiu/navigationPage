'use strict';

// SSE 实时同步中心：维护客户端连接集合，并提供 broadcast。
const sseClients = new Set();

setInterval(() => {
    for (const res of sseClients) {
        try { res.write(':heartbeat\n\n'); } catch (e) { sseClients.delete(res); }
    }
}, 30000);

function broadcast(event, data) {
    const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of sseClients) {
        try { res.write(msg); } catch (e) { sseClients.delete(res); }
    }
}

function handleSSE(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });
    res.write(':\n\n');
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
}

module.exports = { broadcast, handleSSE };
