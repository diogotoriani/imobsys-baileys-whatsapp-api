require('dotenv').config();

function apiKeyAuth(req, res, next) {
  const authHeader = req.header('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Chave de API inválida ou ausente' });
  }

  const token = authHeader.split(' ')[1];

  if (token !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Chave de API inválida ou ausente' });
  }

  next();
}

module.exports = apiKeyAuth;
