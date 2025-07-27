const { createClient } = require('redis');
const { proto } = require('@whiskeysockets/baileys');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisClient = createClient({ url: redisUrl });

redisClient.on('error', (err) => {
  console.error('Erro ao conectar ao Redis:', err);
});

redisClient.connect();

async function saveSession(sessionId, data, ttlSeconds = 3600 * 24 * 7) {
  await redisClient.set(`session:${sessionId}`, JSON.stringify(data), {
    EX: ttlSeconds,
  });
}

async function getSession(sessionId) {
  const data = await redisClient.get(`session:${sessionId}`);
  return data ? JSON.parse(data) : null;
}

async function deleteSession(sessionId) {
  await redisClient.del(`session:${sessionId}`);
}

async function hasSession(sessionId) {
  const exists = await redisClient.exists(`session:${sessionId}`);
  return exists === 1;
}

// 🔥 Aqui está o que faltava: useRedisAuthState
function useRedisAuthState(sessionId) {
  const credsKey = `baileys:${sessionId}:creds`;

  const state = {
    creds: undefined,
    keys: {
      get: async (type, ids) => {
        const key = `baileys:${sessionId}:keys:${type}`;
        const data = await redisClient.hGetAll(key);
        const result = {};
        for (const id of ids) {
          if (data[id]) {
            result[id] = JSON.parse(data[id]);
          }
        }
        return result;
      },
      set: async (type, values) => {
        const key = `baileys:${sessionId}:keys:${type}`;
        const entries = {};
        for (const id in values) {
          entries[id] = JSON.stringify(values[id]);
        }
        await redisClient.hSet(key, entries);
      },
      delete: async (type, ids) => {
        const key = `baileys:${sessionId}:keys:${type}`;
        await redisClient.hDel(key, ids);
      }
    }
  };

  async function saveCreds() {
    await redisClient.set(credsKey, JSON.stringify(state.creds));
  }

  async function init() {
    const credsJson = await redisClient.get(credsKey);
    if (credsJson) {
      state.creds = JSON.parse(credsJson);
    } else {
      state.creds = proto.AuthenticationCreds.fromPartial({});
    }
  }

  return { state, saveCreds, init };
}

module.exports = {
  redisClient,
  saveSession,
  getSession,
  deleteSession,
  hasSession,
  useRedisAuthState // ✅ agora exportado corretamente
};
