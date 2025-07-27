# 📲 Baileys WhatsApp API

API REST construída com Express.js e a biblioteca [Baileys](https://github.com/WhiskeySockets/Baileys) para integração com WhatsApp Web, com suporte a múltiplas sessões, geração de QR Code, envio de mensagens, arquivos, localização, contatos, gerenciamento por webhook e persistência com Redis.

---

## 🚀 Instalação

### 1. Clone o repositório
```bash
git clone https://github.com/seuusuario/seurepo.git
cd seurepo
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Instale o Redis (obrigatório)
```bash
sudo apt update
sudo apt install redis-server -y
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

Verifique se está funcionando:
```bash
sudo systemctl status redis-server

redis-cli ping
# Deve retornar: PONG
```

### 4. Crie o arquivo `.env` 
npm install dotenv

crie o arquivo .env
```
# Chave secreta para autenticação da API
API_KEY=troque-por-uma-chave-muito-secreta

# URL do Redis (padrão localhost)
REDIS_URL=redis://localhost:6379

# Porta onde a API vai rodar
PORT=3000
```

### 5. Inicie o servidor
```bash
npm start
```

---

## 📌 Endpoints disponíveis

> Todos os endpoints da API devem conter o header:
>
> `Authorization: Bearer SUA_API_KEY`

### ✅ Verificar se a API está rodando
**GET /**
```bash
curl http://localhost:3000/
```

---

### 🔐 Listar sessões ativas
**GET /api/sessions**
```bash
curl -H "Authorization: Bearer SUA_API_KEY" http://localhost:3000/api/sessions
```

---

### ▶️ Iniciar sessão (com ou sem webhook)
**POST /api/session/start/:id**

#### Com webhook:
```bash
curl -X POST http://localhost:3000/api/session/start/minhaSessao \
  -H "Authorization: Bearer SUA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "webhook": "https://minhaapi.com/webhook" }'
```

**Resposta com QR code (base64)**
```json
{
  "status": "QR_CODE",
  "qr": "data:image/png;base64,..."
}
```

---

### 📤 Enviar mensagem de texto
**POST /api/send-message/:id**
```bash
curl -X POST http://localhost:3000/api/send-message/minhaSessao \
  -H "Authorization: Bearer SUA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "to": "5581999999999", "message": "Olá!" }'
```

---

### 📍 Enviar localização
**POST /api/send-location/:id**
```bash
curl -X POST http://localhost:3000/api/send-location/minhaSessao \
  -H "Authorization: Bearer SUA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "to": "5581999999999", "latitude": -8.05, "longitude": -34.9, "name": "Recife" }'
```

---

### 📎 Enviar arquivo (PDF, imagem, etc.)
**POST /api/send-file/:id**
```bash
curl -X POST http://localhost:3000/api/send-file/minhaSessao \
  -H "Authorization: Bearer SUA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "5581999999999",
    "filename": "arquivo.pdf",
    "base64": "data:application/pdf;base64,..."
  }'
```

---

### 👤 Enviar contato
**POST /api/send-contact/:id**
```bash
curl -X POST http://localhost:3000/api/send-contact/minhaSessao \
  -H "Authorization: Bearer SUA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "to": "5581999999999", "contactName": "João", "contactPhone": "5581888888888" }'
```

---

### 📴 Encerrar sessão
**POST /api/session/logout/:id**
```bash
curl -X POST http://localhost:3000/api/session/logout/minhaSessao \
  -H "Authorization: Bearer SUA_API_KEY"
```

---

### 🧼 Limpar todas as sessões do Redis (caso necessário)
**GET /api/clear-sessions**
```bash
curl -X GET http://localhost:3000/api/clear-sessions \
  -H "Authorization: Bearer SUA_API_KEY"
```

---

## 🧪 Webhook (opcional)
Se você iniciar uma sessão com um webhook definido, toda mensagem recebida será disparada via `POST` para a URL informada no seguinte formato:

```json
{
  "sessionId": "minhaSessao",
  "from": "5581999999999",
  "message": {
    "text": "Olá!"
  }
}
```

---

## 📄 Licença
MIT License

---

Feito com 💚 usando [Baileys](https://github.com/WhiskeySockets/Baileys)
