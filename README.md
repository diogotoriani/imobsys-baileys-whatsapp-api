# Baileys WhatsApp API

API REST para envio e recebimento de mensagens via WhatsApp usando a biblioteca [Baileys](https://github.com/WhiskeySockets/Baileys) com persistência de sessão em Redis e proteção por API Key.

---

## Requisitos

- Node.js 18+ Verifique o Node.js e npm instalados. 
node -v
npm -v


- Redis rodando e acessível  
Certifique-se que o Redis está instalado e rodando na máquina (ou em servidor acessível).
Se não tiver Redis instalado no Ubuntu, pode instalar com:

sudo apt update
sudo apt install redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server

Teste a conexão:
redis-cli ping
# Deve responder PONG



- npm instalado  

---

## Instalação

1. Clone este repositório:

git clone https://seu-repo.git
cd seu-repo




2. Instale as dependências:

npm install

3. Crie o arquivo .env na raiz com o conteúdo:

API_KEY=sua-chave-secreta-aqui
REDIS_URL=redis://localhost:6379
PORT=3000

Rodando o servidor

npm start

Uso da API
Todas as requisições a rotas http://localhost:3000/api/... devem enviar o header:
x-api-key: sua-chave-secreta-aqui

Endpoints principais
POST /api/session/start/:id
Inicia uma sessão WhatsApp com id :id. Retorna QR Code base64 para escanear.

GET /api/session/status/:id
Retorna status da sessão (connected: true|false).

DELETE /api/session/logout/:id
Desconecta e remove a sessão.

POST /api/check-number
Verifica se um número está registrado no WhatsApp. JSON esperado:

{ "sessionId": "id", "number": "5511999999999" }

POST /api/send/text
Envia mensagem texto. JSON:
{ "sessionId": "id", "to": "5511999999999@s.whatsapp.net", "message": "Olá" }

POST /api/send/media
Envia arquivo PDF, imagem ou doc em base64. JSON:

{ "sessionId": "id", "to": "...", "base64": "base64string", "filename": "arquivo.pdf" }

POST /api/send/location
Envia localização. JSON:

{ "sessionId": "id", "to": "...", "lat": "-23.000", "lng": "-46.000", "name": "Local" }

POST /api/send/contact
Envia contato. JSON:

{ "sessionId": "id", "to": "...", "name": "Nome", "phone": "5511999999999" }


POST /api/send/group

Envia mensagem para grupo. JSON:
{ "sessionId": "id", "groupId": "grupo-id@s.whatsapp.net", "message": "Mensagem" }


GET /api/groups/:sessionId
Lista grupos que a sessão participa.

Webhooks
Ao iniciar a sessão, informe um webhookUrl no corpo JSON da rota /session/start/:id.
Sua API receberá notificações de mensagens enviadas e recebidas.

curl -X POST http://localhost:3000/api/session/start/minhaSessao \
  -H "Content-Type: application/json" \
  -H "x-api-key: sua-chave-aqui" \
  -d '{"webhookUrl": "https://meu-webhook.exemplo.com/whatsapp"}'


Segurança
Use uma API Key forte definida na variável API_KEY no .env.

Todas as rotas api/ exigem esse header x-api-key.

Observações
A persistência das sessões usa Redis (endereço configurável via REDIS_URL).

Implemente limites e logs conforme necessário para seu ambiente.

Esta API é básica, adapte conforme suas necessidades.

