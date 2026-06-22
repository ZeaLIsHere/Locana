let clients = [];

function registerClient(req, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = Date.now();
  const newClient = {
    id: clientId,
    res
  };
  clients.push(newClient);
  console.log(`Realtime SSE Client Connected: ${clientId}. Total clients: ${clients.length}`);

  // Send handshake message
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', clientId })}\n\n`);

  req.on('close', () => {
    clients = clients.filter(c => c.id !== clientId);
    console.log(`Realtime SSE Client Disconnected: ${clientId}. Total clients: ${clients.length}`);
  });
}

function broadcastEvent(type, data) {
  const payload = JSON.stringify({ type, data });
  console.log(`Realtime SSE Broadcast: Sending event '${type}' to ${clients.length} clients`);
  clients.forEach(client => {
    try {
      client.res.write(`data: ${payload}\n\n`);
    } catch (err) {
      console.error(`Error sending SSE to client ${client.id}:`, err.message);
    }
  });
}

module.exports = {
  registerClient,
  broadcastEvent
};
