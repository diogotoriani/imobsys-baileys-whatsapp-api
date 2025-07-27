// src/baileysManager.js
const express = require('express');
const { makeWASocket, DisconnectReason, fetchLatestBaileysVersion, useSingleFileAuthState } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode');
const { redisClient, saveSession, getSession, deleteSession } = require('./helpers/redisAuth');

const router = express.Router();

const sessions = {}; // sessões em memória

// Função para criar/iniciar sessão (usa Redis para estado)
async function createSession(sessionId, webhookUrl = null) {
  // Função para atualizar sessão no Redis
  const saveCreds = async (creds) => {
    await saveSession(sessionId, creds);
  };

  // Recuperar estado do Redis (simples aqui para ex)
  const savedCreds = await getSession(sessionId);

  // Cria socket Baileys
  const sock = makeWASocket({
    printQRInTerminal: false,
    auth: savedCreds || undefined,
  });

  sock.ev.on('creds.update', saveCreds);

  // Guardar QR code em base64 para enviar no endpoint
  sock.ev.on('connection.update', async (update) => {
    const { connection, qr, lastDisconnect } = update;

    if (qr) {
      sessions[sessionId].qrcode = await qrcode.toDataURL(qr);
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        console.log(`[${sessionId}] Reconectando...`);
        await createSession(sessionId, webhookUrl);
      } else {
        console.log(`[${sessionId}] Logout detectado, removendo sessão`);
        delete sessions[sessionId];
        await deleteSession(sessionId);
      }
    }

    if (connection === 'open') {
      sessions[sessionId].qrcode = null;
      console.log(`[${sessionId}] Conectado!`);
    }

    // Se quiser, chama webhook recebendo mensagem (exemplo):
    if (update.messages && webhookUrl) {
      // POST para webhookUrl com as mensagens (implemente você)
    }
  });

  sessions[sessionId] = {
    sock,
    qrcode: null,
  };

  return sessions[sessionId];
}

function getSession(sessionId) {
  return sessions[sessionId]?.sock || null;
}

async function isConnected(sessionId) {
  const sock = getSession(sessionId);
  return sock && sock.ws && sock.ws.readyState === 1;
}

async function logoutSession(sessionId) {
  const sock = getSession(sessionId);
  if (!sock) throw new Error('Sessão não encontrada');
  await sock.logout();
  delete sessions[sessionId];
  await deleteSession(sessionId);
}

async function checkNumber(sessionId, number) {
  const sock = getSession(sessionId);
  if (!sock) throw new Error('Sessão não encontrada');
  const exists = await sock.onWhatsApp(number);
  return { exists: exists && exists.length > 0 };
}

async function sendText(sessionId, to, message) {
  const sock = getSession(sessionId);
  if (!sock) throw new Error('Sessão não encontrada');
  await sock.sendMessage(to, { text: message });
}

async function sendMedia(sessionId, to, base64, filename) {
  const sock = getSession(sessionId);
  if (!sock) throw new Error('Sessão não encontrada');
  const buffer = Buffer.from(base64, 'base64');
  await sock.sendMessage(to, { document: buffer, mimetype: 'application/pdf', fileName: filename });
}

async function sendLocation(sessionId, to, lat, lng, name) {
  const sock = getSession(sessionId);
  if (!sock) throw new Error('Sessão não encontrada');
  await sock.sendMessage(to, {
    location: {
      degreesLatitude: lat,
      degreesLongitude: lng,
      name: name || '',
    },
  });
}

async function sendContact(sessionId, to, name, phone) {
  const sock = getSession(sessionId);
  if (!sock) throw new Error('Sessão não encontrada');

  const vcard = `
BEGIN:VCARD
VERSION:3.0
FN:${name}
TEL;TYPE=CELL:${phone}
END:VCARD
  `.trim();

  await sock.sendMessage(to, { contacts: { displayName: name, contacts: [{ vcard }] } });
}

async function sendGroupMessage(sessionId, groupId, message) {
  const sock = getSession(sessionId);
  if (!sock) throw new Error('Sessão não encontrada');
  await sock.sendMessage(groupId, { text: message });
}

async function listGroups(sessionId) {
  const sock = getSession(sessionId);
  if (!sock) throw new Error('Sessão não encontrada');
  const groups = [];

  const chats = await sock.groupFetchAllParticipating();
  for (const [id, data] of Object.entries(chats)) {
    groups.push({
      id,
      subject: data.subject,
      creation: data.creation,
      owner: data.owner,
    });
  }

  return groups;
}

function listSessions() {
  return Object.keys(sessions);
}

// --- ROTAS ---

// Iniciar sessão e obter QR code
router.post('/session/start/:id', async (req, res) => {
  const sessionId = req.params.id;
  const webhookUrl = req.body.webhookUrl || null;

  try {
    const sessao = await createSession(sessionId, webhookUrl);

    // Enviar QR code ou status conectado
    if (sessao.qrcode) {
      res.json({ status: 'QR_CODE', qr: sessao.qrcode });
    } else {
      res.json({ status: 'CONNECTED' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Erro ao iniciar sessão', details: err.message });
  }
});

// Pegar QR code da sessão
router.get('/session/qrcode/:id', (req, res) => {
  const sessionId = req.params.id;
  const sessao = sessions[sessionId];
  if (sessao && sessao.qrcode) {
    res.json({ qr: sessao.qrcode });
  } else {
    res.status(404).json({ error: 'QR code não disponível' });
  }
});

// Listar sessões
router.get('/sessions', (req, res) => {
  res.json(listSessions());
});

// Verificar status da sessão
router.get('/session/status/:id', async (req, res) => {
  try {
    const connected = await isConnected(req.params.id);
    res.json({ connected });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Logout da sessão
router.delete('/session/logout/:id', async (req, res) => {
  try {
    await logoutSession(req.params.id);
    res.json({ success: true, message: `Sessão ${req.params.id} desconectada` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check se número é WhatsApp
router.post('/check-number', async (req, res) => {
  const { sessionId, number } = req.body;
  if (!sessionId || !number) return res.status(400).json({ error: 'sessionId e number são obrigatórios' });

  try {
    const result = await checkNumber(sessionId, number);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Enviar texto
router.post('/send/text', async (req, res) => {
  const { sessionId, to, message } = req.body;
  if (!sessionId || !to || !message) return res.status(400).json({ error: 'sessionId, to e message são obrigatórios' });

  try {
    await sendText(sessionId, to, message);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Enviar mídia (ex: pdf)
router.post('/send/media', async (req, res) => {
  const { sessionId, to, base64, filename } = req.body;
  if (!sessionId || !to || !base64 || !filename) return res.status(400).json({ error: 'sessionId, to, base64, filename são obrigatórios' });

  try {
    await sendMedia(sessionId, to, base64, filename);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Enviar localização
router.post('/send/location', async (req, res) => {
  const { sessionId, to, lat, lng, name } = req.body;
  if (!sessionId || !to || !lat || !lng) return res.status(400).json({ error: 'sessionId, to, lat, lng são obrigatórios' });

  try {
    await sendLocation(sessionId, to, lat, lng, name);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Enviar contato
router.post('/send/contact', async (req, res) => {
  const { sessionId, to, name, phone } = req.body;
  if (!sessionId || !to || !name || !phone) return res.status(400).json({ error: 'sessionId, to, name, phone são obrigatórios' });

  try {
    await sendContact(sessionId, to, name, phone);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Enviar mensagem para grupo
router.post('/send/group', async (req, res) => {
  const { sessionId, groupId, message } = req.body;
  if (!sessionId || !groupId || !message) return res.status(400).json({ error: 'sessionId, groupId, message são obrigatórios' });

  try {
    await sendGroupMessage(sessionId, groupId, message);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Listar grupos da sessão
router.get('/groups/:sessionId', async (req, res) => {
  try {
    const groups = await listGroups(req.params.sessionId);
    res.json({ success: true, groups });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
