require('dotenv').config();

function apiKeyAuth(req, res, next) {
  const apiKey = req.header('x-api-key');

  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Chave de API inválida ou ausente' });
  }

  next();
}

module.exports = apiKeyAuth;
