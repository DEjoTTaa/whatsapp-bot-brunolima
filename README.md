# Bot WhatsApp - Delegado Bruno Lima

Bot de atendimento automático para a equipe do Delegado Bruno Lima, especializado em denúncias de maus-tratos a animais.

## Tecnologias

- **Node.js 18+** - Runtime
- **Express** - Servidor HTTP
- **Evolution API** - Integração WhatsApp
- **Google Gemini** - IA para respostas
- **Koyeb** - Hospedagem (free tier)

## Funcionalidades

- Atendimento humanizado 24/7
- Saudação automática por horário (Bom dia/Boa tarde/Boa noite)
- Condução de denúncias de maus-tratos
- Histórico de conversas (20 mensagens por usuário)
- Base de conhecimento completa sobre processos da equipe

---

## Passo a Passo para Deploy

### 1. Obter API Key do Google Gemini (Gratuita)

1. Acesse: https://aistudio.google.com/app/apikey
2. Faça login com sua conta Google
3. Clique em **"Create API Key"**
4. Copie a chave gerada (guarde em local seguro)

### 2. Configurar Evolution API

Se ainda não tem uma Evolution API rodando:

**Opção A - Usar serviço hospedado:**
- Contrate um serviço de Evolution API hospedada

**Opção B - Self-hosted (requer VPS):**
```bash
docker run -d \
  --name evolution-api \
  -p 8080:8080 \
  -e AUTHENTICATION_API_KEY=sua-chave-secreta \
  atendai/evolution-api:latest
```

**Configurar instância WhatsApp:**
1. Acesse sua Evolution API
2. Crie uma nova instância
3. Escaneie o QR Code com WhatsApp
4. Anote: URL da API, API Key e nome da instância

### 3. Deploy no Koyeb

#### 3.1 Preparar repositório

1. Crie um repositório no GitHub
2. Faça upload dos arquivos:
   - `bot.js`
   - `package.json`
   - `Dockerfile`
   - `.dockerignore`

```bash
git init
git add .
git commit -m "Bot WhatsApp Bruno Lima"
git remote add origin https://github.com/seu-usuario/seu-repo.git
git push -u origin main
```

#### 3.2 Criar conta no Koyeb

1. Acesse: https://www.koyeb.com
2. Crie conta (tem free tier)
3. Conecte seu GitHub

#### 3.3 Criar App no Koyeb

1. Clique em **"Create App"**
2. Selecione **"GitHub"**
3. Escolha seu repositório
4. Configure:
   - **Builder:** Dockerfile
   - **Instance type:** Free (nano)
   - **Region:** Washington, D.C. (ou mais próximo)

5. **Environment Variables** (IMPORTANTE):
   ```
   EVOLUTION_API_URL=https://sua-evolution-api.com
   EVOLUTION_API_KEY=sua-api-key
   EVOLUTION_INSTANCE=nome-da-instancia
   GEMINI_API_KEY=sua-gemini-api-key
   PORT=3000
   ```

6. Clique em **"Deploy"**

#### 3.4 Configurar Webhook na Evolution API

Após o deploy, o Koyeb fornecerá uma URL (ex: `https://seu-app.koyeb.app`)

1. Acesse sua Evolution API
2. Vá em **Settings** da instância
3. Configure o Webhook:
   - **URL:** `https://seu-app.koyeb.app/webhook`
   - **Events:** `MESSAGES_UPSERT` ou `messages.upsert`
   - **Enabled:** true

---

## Endpoints

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/` | GET | Informações do bot |
| `/webhook` | POST | Recebe mensagens do WhatsApp |
| `/health` | GET | Health check (usado pelo Koyeb) |
| `/stats` | GET | Estatísticas do bot |

---

## Desenvolvimento Local

### Requisitos
- Node.js 18+
- npm

### Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/seu-repo.git
cd seu-repo

# Instale dependências
npm install

# Configure variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais

# Execute
npm start
```

### Testar webhook localmente

Use ngrok para expor sua porta local:

```bash
ngrok http 3000
```

Configure o webhook da Evolution API para a URL do ngrok.

---

## Estrutura do Projeto

```
whatsapp-bot-brunolima/
├── bot.js           # Código principal
├── package.json     # Dependências
├── Dockerfile       # Container para deploy
├── .dockerignore    # Arquivos ignorados no Docker
├── .env.example     # Exemplo de variáveis
└── README.md        # Documentação
```

---

## Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `EVOLUTION_API_URL` | Sim | URL da Evolution API |
| `EVOLUTION_API_KEY` | Sim | Chave de API da Evolution |
| `EVOLUTION_INSTANCE` | Sim | Nome da instância WhatsApp |
| `GEMINI_API_KEY` | Sim | Chave API do Google Gemini |
| `PORT` | Não | Porta do servidor (padrão: 3000) |

---

## Solução de Problemas

### Bot não responde

1. Verifique se o webhook está configurado corretamente
2. Confira as variáveis de ambiente no Koyeb
3. Acesse `/health` para ver status dos serviços
4. Verifique logs no painel do Koyeb

### Erro de API Key

- Verifique se a GEMINI_API_KEY está correta
- Confirme que a API Key tem permissão para Gemini 1.5 Flash

### Evolution API não conecta

1. Verifique se a instância WhatsApp está conectada
2. Confirme URL e API Key
3. Teste a conexão manualmente

---

## Limites Free Tier

### Koyeb Free
- 1 app
- 512MB RAM
- Pode hibernar após inatividade

### Gemini API Free
- 15 requisições/minuto
- 1 milhão de tokens/mês
- Suficiente para uso moderado

---

## Suporte

Em caso de dúvidas sobre o bot, entre em contato com Demetrius.

---

## Licença

MIT License - Uso interno da equipe Delegado Bruno Lima.
