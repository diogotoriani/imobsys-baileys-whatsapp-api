const fs = require('fs');
const path = require('path');
const axios = require('axios');
const qrcode = require('qrcode');
const mime = require('mime-types');

const {
  default: makeWASocket,
  DisconnectReason,
} = require('@whiskeysockets/baileys');

const { useRedisAuthState, deleteAuthState } = require('./helpers/redisAuth');

const sessions = new Map();           // sessionId => sock
const sessionWebhooks = new Map();   // sessionId => webhook URL

const sessionPath = path.join(__dirname, '..', 'sessions');
if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath);

async function createSession(sessionId, webhookUrl = null) {
  const { state, saveCreds } = await useRedisAuthState(sessionId);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
  });

  sessions.set(sessionId, sock);
  if (webhookUrl) sessionWebhooks.set(sessionId, webhookUrl);

  sock.qr = null;

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      sock.qr = await qrcode.toDataURL(qr);
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        console.log(`Reconectando sessão ${sessionId}...`);
        await createSession(sessionId, sessionWebhooks.get(sessionId));
      } else {
        console.log(`Sessão ${sessionId} desconectada.`);
        sessions.delete(sessionId);
        sessionWebhooks.delete(sessionId);
      }
    }

    if (connection === 'open') {
      sock.qr = null;
      console.log(`Sessão ${sessionId} conectada.`);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type === 'notify') {
      const webhook = sessionWebhooks.get(sessionId);
      if (webhook) {
        try {
          await axios.post(webhook, {
            sessionId,
            message: messages[0],
          });
        } catch (e) {
          console.error(`Erro webhook sessão ${sessionId}:`, e.message);
        }
      }
    }
  });

  return {
    socket: sock,
    getQR: () => sock.qr,
  };
}

function listSessions() {
  return Array.from(sessions.keys()); // retorna array com os IDs das sessões
}

function getSession(sessionId) {
  return sessions.get(sessionId);
}

async function isConnected(sessionId) {
  const sock = getSession(sessionId);
  return !!(sock?.user);
}

async function sendText(sessionId, to, message) {
  const sock = getSession(sessionId);
  if (!sock) throw new Error('Sessão não conectada');
  await sock.sendMessage(to, { text: message });
}

async function sendMedia(sessionId, to, base64, filename) {
  const sock = getSession(sessionId);
  if (!sock) throw new Error('Sessão não conectada');

  const buffer = Buffer.from(base64, 'base64');
  const mimetype = mime.lookup(filename) || 'application/octet-stream';

  await sock.sendMessage(to, {
    document: buffer,
    mimetype,
    fileName: filename,
  });
}

async function sendLocation(sessionId, to, lat, lng, name = '') {
  const sock = getSession(sessionId);
  if (!sock) throw new Error('Sessão não conectada');

  await sock.sendMessage(to, {
    location: {
      degreesLatitude: parseFloat(lat),
      degreesLongitude: parseFloat(lng),
      name,
    },
  });
}

async function sendContact(sessionId, to, name, phone) {
  const sock = getSession(sessionId);
  if (!sock) throw new Error('Sessão não conectada');

  await sock.sendMessage(to, {
    contacts: {
      displayName: name,
      contacts: [
        {
          displayName: name,
          vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nTEL;type=CELL:${phone}\nEND:VCARD`,
        },
      ],
    },
  });
}

async function sendGroupMessage(sessionId, groupId, message) {
  const sock = getSession(sessionId);
  if (!sock) throw new Error('Sessão não conectada');

  await sock.sendMessage(groupId, { text: message });
}

async function listGroups(sessionId) {
  const sock = getSession(sessionId);
  if (!sock) throw new Error('Sessão não conectada');

  const groups = await sock.groupFetchAllParticipating();
  return Object.entries(groups).map(([id, data]) => ({
    id,
    name: data.subject,
  }));
}

async function logoutSession(sessionId) {
  const sock = getSession(sessionId);
  if (!sock) throw new Error('Sessão não conectada');

  await sock.logout();

  // Remove arquivos locais (opcional)
  const dir = path.join(sessionPath, sessionId);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }

  // Remove credenciais do Redis
  await deleteAuthState(sessionId);

  sessions.delete(sessionId);
  sessionWebhooks.delete(sessionId);
}

async function checkNumber(sessionId, number) {
  const sock = getSession(sessionId);
  if (!sock) throw new Error('Sessão não conectada');

  const jid = number.includes('@s.whatsapp.net') ? number : number + '@s.whatsapp.net';
  const [result] = await sock.onWhatsApp(jid);
  return {
    exists: result?.exists || false,
    jid: result?.jid || null,
  };
}

module.exports = {
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
};
