const { createClient } = require('redis');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisClient = createClient({ url: redisUrl });

redisClient.on('error', (err) => {
  console.error('Erro ao conectar ao Redis:', err);
});

redisClient.connect();

module.exports = {
  redisClient,

  // Salva dados da sessão (como credentials ou estado) com um TTL (opcional)
  async saveSession(sessionId, data, ttlSeconds = 3600 * 24 * 7) {
    await redisClient.set(`session:${sessionId}`, JSON.stringify(data), {
      EX: ttlSeconds,
    });
  },

  // Busca os dados de sessão
  async getSession(sessionId) {
    const data = await redisClient.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  },

  // Remove os dados de sessão
  async deleteSession(sessionId) {
    await redisClient.del(`session:${sessionId}`);
  },

  // Verifica se uma sessão existe
  async hasSession(sessionId) {
    const exists = await redisClient.exists(`session:${sessionId}`);
    return exists === 1;
  }
};
