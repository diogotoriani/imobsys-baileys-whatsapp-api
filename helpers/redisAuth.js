const redis = require('redis');

const client = redis.createClient();

client.on('error', (err) => {
  console.error('Redis Client Error', err);
});

(async () => {
  try {
    await client.connect();
    console.log('Redis conectado com sucesso');
  } catch (err) {
    console.error('Erro ao conectar no Redis:', err);
  }
})();

function key(sessionId) {
  return `whatsapp:auth:${sessionId}`;
}

async function getAuthState(sessionId) {
  const data = await client.get(key(sessionId));
  if (!data) {
    // Retorna estado padrão vazio
    return {
      creds: {},
      keys: {}
    };
  }
  try {
    return JSON.parse(data);
  } catch (err) {
    console.error('Erro ao parsear auth state do Redis:', err);
    return {
      creds: {},
      keys: {}
    };
  }
}

async function saveAuthState(sessionId, state) {
  try {
    await client.set(key(sessionId), JSON.stringify(state));
  } catch (err) {
    console.error('Erro ao salvar auth state no Redis:', err);
  }
}

async function deleteAuthState(sessionId) {
  try {
    await client.del(key(sessionId));
  } catch (err) {
    console.error('Erro ao deletar auth state no Redis:', err);
  }
}

// Função que imita useMultiFileAuthState do Baileys, mas usando Redis
async function useRedisAuthState(sessionId) {
  let state = await getAuthState(sessionId);

  return {
    state,
    saveCreds: async () => {
      await saveAuthState(sessionId, state);
    }
  };
}

module.exports = {
  useRedisAuthState,
  deleteAuthState,
};
