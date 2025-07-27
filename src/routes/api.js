const express = require('express');
const router = express.Router();

const {
  createSession,
  getSession,
  isConnected,
  sendText,
  sendMedia,
  sendLocation,
  sendContact,
  sendGroupMessage,
  listGroups,
  logoutSession,
  checkNumber,
  listSessions,
} = require('../baileysManager');

router.post('/session/start/:id', async (req, res) => {
  const sessionId = req.params.id;
  const webhookUrl = req.body.webhookUrl || null;

  try {
    const result = await createSession(sessionId, webhookUrl);

    let qrSent = false;

    const interval = setInterval(() => {
      const sock = getSession(sessionId);
      if (!sock) return;

      if (sock.user) {
        clearInterval(interval);
        if (!qrSent) {
          res.json({ status: 'CONNECTED' });
          qrSent = true;
        }
      } else if (sock.qr && !qrSent) {
        res.json({ status: 'QR_CODE', qr: sock.qr });
        qrSent = true;
      }
    }, 1000);

    setTimeout(() => {
      if (!qrSent) {
        clearInterval(interval);
        res.status(408).json({ error: 'QR code não gerado a tempo' });
      }
    }, 20000);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao iniciar sessão', details: err.message });
  }
});

router.get('/sessions', async (req, res) => {
  const sessions = getAllSessions(); // função que retorna array de sessões
  res.json(sessions);
});

router.get('/session/status/:id', async (req, res) => {
  try {
    const connected = await isConnected(req.params.id);
    res.json({ connected });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/session/logout/:id', async (req, res) => {
  const sessionId = req.params.id;
  try {
    await logoutSession(sessionId);
    res.json({ success: true, message: `Sessão ${sessionId} desconectada e removida` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/check-number', async (req, res) => {
  const { sessionId, number } = req.body;
  if (!sessionId || !number) {
    return res.status(400).json({ error: 'sessionId e number são obrigatórios' });
  }

  try {
    const result = await checkNumber(sessionId, number);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/send/text', async (req, res) => {
  const { sessionId, to, message } = req.body;
  if (!sessionId || !to || !message) {
    return res.status(400).json({ error: 'sessionId, to e message são obrigatórios' });
  }

  try {
    await sendText(sessionId, to, message);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/send/media', async (req, res) => {
  const { sessionId, to, base64, filename } = req.body;
  if (!sessionId || !to || !base64 || !filename) {
    return res.status(400).json({ error: 'sessionId, to, base64, filename são obrigatórios' });
  }

  try {
    await sendMedia(sessionId, to, base64, filename);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/send/location', async (req, res) => {
  const { sessionId, to, lat, lng, name } = req.body;
  if (!sessionId || !to || !lat || !lng) {
    return res.status(400).json({ error: 'sessionId, to, lat, lng são obrigatórios' });
  }

  try {
    await sendLocation(sessionId, to, lat, lng, name);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/send/contact', async (req, res) => {
  const { sessionId, to, name, phone } = req.body;
  if (!sessionId || !to || !name || !phone) {
    return res.status(400).json({ error: 'sessionId, to, name, phone são obrigatórios' });
  }

  try {
    await sendContact(sessionId, to, name, phone);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/send/group', async (req, res) => {
  const { sessionId, groupId, message } = req.body;
  if (!sessionId || !groupId || !message) {
    return res.status(400).json({ error: 'sessionId, groupId, message são obrigatórios' });
  }

  try {
    await sendGroupMessage(sessionId, groupId, message);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/groups/:sessionId', async (req, res) => {
  try {
    const groups = await listGroups(req.params.sessionId);
    res.json({ success: true, groups });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
