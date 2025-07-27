const express = require('express');
const bodyParser = require('body-parser');
const baileysRoutes = require('./routes/api');
const apiKeyAuth = require('./middleware/auth');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware para proteger todas as rotas /api com API Key
app.use('/api', apiKeyAuth, baileysRoutes);

app.get('/', (req, res) => {
  res.send('Baileys WhatsApp API Running');
});

app.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}`);
});
