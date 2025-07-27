const makeInMemoryStore = require('@whiskeysockets/baileys').makeInMemoryStore;

function useRedisAuthState(sessionId) {
  const credsKey = `session:${sessionId}:creds`;

  const state = {
    creds: undefined,
    keys: {
      get: async (type, ids) => {
        const key = `session:${sessionId}:keys:${type}`;
        const data = await redisClient.hGetAll(key);
        const parsed = {};
        ids.forEach(id => {
          if (data[id]) {
            parsed[id] = JSON.parse(data[id]);
          }
        });
        return parsed;
      },
      set: async (type, values) => {
        const key = `session:${sessionId}:keys:${type}`;
        const entries = {};
        for (const id in values) {
          entries[id] = JSON.stringify(values[id]);
        }
        await redisClient.hSet(key, entries);
      }
    }
  };

  const saveCreds = async () => {
    await redisClient.set(credsKey, JSON.stringify(state.creds));
  };

  const init = async () => {
    const credsData = await redisClient.get(credsKey);
    if (credsData) {
      state.creds = JSON.parse(credsData);
    }
  };

  return {
    state,
    saveCreds,
    init
  };
}

module.exports = {
  redisClient,
  saveSession,
  getSession,
  deleteSession,
  hasSession,
  useRedisAuthState // ✅ agora exporta corretamente
};
