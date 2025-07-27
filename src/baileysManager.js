const express = require('express');
const { makeWASocket, DisconnectReason } = require('@whiskeysockets/baileys');
const { useRedisAuthState } = require('../helpers/redisAuth');

const router = express.Router();

const sessions = {}; // Guardar sockets ativos na memória

// 🔧 Função para iniciar sessão
async function startSession(sessionId) {
  const { state, saveCreds, init } = useRedisAuthState(sessionId);
  await init();

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false, // desabilita QR no terminal
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, qr, lastDisconnect } = update;

    if (qr) {
      sessions[sessionId].qrcode = qr;
    }

    if (connection === 'close') {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        startSession(sessionId);
      } else {
        delete sessions[sessionId];
      }
    }
  });

  sessions[sessionId] = {
    sock,
    qrcode: null,
  };

  return sessions[sessionId];
}

// 📌 Inicia uma nova sessão
router.post('/sessions/:sessionId/start', async (req, res) => {
  const { sessionId } = req.params;

  try {
    const sessao = await startSession(sessionId);
    if (sessao.qrcode) {
      res.json({
        success: true,
        sessionId,
        qrcode: sessao.qrcode, // você pode transformar em base64 se quiser exibir
      });
    } else {
      res.json({
        success: true,
        sessionId,
        message: 'Sessão iniciada (sem QR code)',
      });
    }
  } catch (err) {
    console.error('Erro ao iniciar sessão:', err);
    res.status(500).json({
      error: 'Erro ao iniciar sessão',
      details: err.message,
    });
  }
});

// 🔍 Retorna QRCode da sessão (se estiver pendente)
router.get('/sessions/:sessionId/qrcode', (req, res) => {
  const { sessionId } = req.params;

  const session = sessions[sessionId];
  if (session && session.qrcode) {
    res.json({ sessionId, qrcode: session.qrcode });
  } else {
    res.status(404).json({ error: 'QR Code não disponível no momento' });
  }
});

// 📋 Lista sessões ativas
router.get('/sessions', (req, res) => {
  res.json(Object.keys(sessions));
});

module.exports = router;
