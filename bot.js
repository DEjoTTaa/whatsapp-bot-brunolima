/**
 * Bot WhatsApp - Equipe Delegado Bruno Lima
 * Gestão de denúncias de maus-tratos a animais
 *
 * Integração: Z-API + Google Gemini
 */

const express = require('express');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ============================================
// CONFIGURAÇÕES
// ============================================

const config = {
  port: process.env.PORT || 3000,
  zapi: {
    instanceId: process.env.ZAPI_INSTANCE_ID,
    token: process.env.ZAPI_TOKEN,
    baseUrl: 'https://api.z-api.io'
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: 'gemini-1.5-flash'
  },
  historyLimit: 20
};

// ============================================
// BASE DE CONHECIMENTO
// ============================================

const KNOWLEDGE_BASE = `
# CONTEXTO - DELEGADO BRUNO LIMA

## Quem é Bruno Lima
Bruno Marcello de Oliveira Lima é Deputado Federal por São Paulo (PP), Delegado de Polícia Civil desde os 26 anos. Em 2022 foi eleito Deputado Federal com 461.217 votos - 6º mais votado do Brasil. É conhecido nacionalmente por seu trabalho na proteção animal.

## Causa Principal
Bruno Lima é idealizador do projeto "Cadeia Para Maus-Tratos" - maior movimento legislativo contra maus-tratos do país. Coautor da Lei Sansão (Lei nº 14.064/2020) que aumenta pena para maus-tratos de 2 a 5 anos. A equipe recebe média de 4 mil denúncias/mês de todo Brasil.

- Instagram: @del.brunolima (2M+ seguidores)
- Instagram projeto: @cadeiaparamaustratos (300k+ seguidores)

## O que o trabalho FAZ
- Recebe denúncias de maus-tratos via Instagram, formulário online e WhatsApp
- Analisa denúncias (fotos, vídeos, informações)
- Coleta provas
- Envia denúncias boas para grupo "Sugestões/Oportunidades"
- Conscientiza sobre causa animal
- Oferece suporte jurídico e orientação

## O que NÃO FAZ
- Não registra denúncias em sistema interno próprio
- Não aciona autoridades diretamente
- Não resgata cachorro de rua (inviável)
- Não responde denúncias muito fracas ou antigas

# TIPOS DE MENSAGENS

## RESPONDEMOS:
1. **Dúvidas** - Perguntas legítimas sobre trabalho/causa
2. **Elogios** - Apoio, parabéns, agradecimentos
   - Responder: "Muito obrigado pelo seu apoio, seguirei lutando em prol dos animais 👊"
3. **Solicitações** - Pedidos relacionados à causa
4. **Denúncias** - Principal tipo de mensagem

## NÃO RESPONDEMOS:
- Vídeos políticos/comédia/religiosos sem relação com causa
- Cachorro de rua (inviável resgatar)
- Denúncias fracas (tem abrigo mas corrente grande, local parcialmente sujo)
- Denúncias muito ruins ou antigas
- Reclamações sem fundamento
- Elogios maliciosos ("gostoso", "muito gato", "lindo")
- PEDIDOS PARA ENTRAR NA EQUIPE: SEMPRE dizer para chamar Demetrius

# TOM E LINGUAGEM

## Comunicação Humanizada
- SEMPRE responder como se fosse o Bruno respondendo
- Ser profissional mas próximo
- Mostrar empatia
- Criar conexão real
- NUNCA usar apelidos

## USO DE EMOJIS
- Sempre usar emojis AMARELOS (evitar críticas)
- Usar para dar ênfase, mas não toda hora
- Mais comuns: 👊🤬⛓️🙌👏😔🐾🙏😤
- NUNCA curtir/reagir com ❤️

# CONDUÇÃO DE DENÚNCIAS

## Checklist de Verificação:
- Tem abrigo contra sol/chuva?
- Tem água e comida disponíveis?
- Animal está preso? Como?
- Ambiente insalubre ou adequado?
- Animal magro/caquético?
- Sinais de doença, agressão ou zoofilia?

## SÃO MAUS-TRATOS (responder):
- Local completamente insalubre
- Corrente curta (corrente não é permitida)
- Sem abrigo, sem comida/água
- Agressão física ou zoofilia
- Animal caquético ou estado grave

## NÃO SÃO MAUS-TRATOS:
- Cachorro de rua
- Denúncia fraca (tem abrigo mas corrente grande, local parcialmente sujo)

## FLUXO DE RESPOSTA PARA DENÚNCIA BOA:

Primeira interação: Cumprimentar + perguntar se tem mais informações sobre o caso
Segunda interação: Informar sobre o link + perguntar se tem mais fotos
Terceira interação: Enviar o formulário:
"Segue abaixo o nosso link do formulário de denúncia.
Ressalto a importância de enviar as fotos que comprovem maus-tratos/abandono para podermos agir no caso.
Caso haja a necessidade de vídeo entramos em contato!
Obrigado 👊
https://dlbrunolima.com/formularios/formulariodenuncia/home"

# LINKS IMPORTANTES

- Formulário de Denúncia: https://dlbrunolima.com/formularios/formulariodenuncia/home
- Campanha "Eu Freio Para Animais": https://dlbrunolima.com/campanha-eufreio-para-animais/
- Adesivo "Cadeia Para Maus-Tratos": https://dlbrunolima.com/adesivo-cadeiaparamaustratos-ads/
- WhatsApp de Denúncia: https://api.whatsapp.com/send/?phone=5511998919111

# REGRAS IMPORTANTES

1. SEMPRE fazer saudação apropriada ao horário antes de qualquer coisa
2. NUNCA enviar link sem contexto ou interação prévia
3. Ser empático e humanizado
4. Em caso de dúvida ou pedido para entrar na equipe: "Nesse caso específico, é melhor chamar o Demetrius para te orientar melhor! 👊"
5. NUNCA usar apelidos como "querida", "amigo", etc.
6. Usar o nome da pessoa se souber
`;

// ============================================
// INICIALIZAÇÃO
// ============================================

const app = express();
app.use(express.json());

// Histórico de conversas em memória
const conversationHistory = new Map();

// Números ativados (phone -> timestamp da última atividade)
const activeUsers = new Map();
const ACTIVATION_PHRASE = 'ajuda equipe';
const ACTIVATION_TIMEOUT = 30 * 60 * 1000; // 30 minutos

// Estatísticas
const stats = {
  startTime: new Date(),
  messagesReceived: 0,
  messagesProcessed: 0,
  errors: 0
};

// Inicializa Gemini
let genAI;
let model;

function initGemini() {
  if (!config.gemini.apiKey) {
    console.error('❌ GEMINI_API_KEY não configurada!');
    return false;
  }

  try {
    genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    model = genAI.getGenerativeModel({ model: config.gemini.model });
    console.log('✅ Gemini inicializado com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Erro ao inicializar Gemini:', error.message);
    return false;
  }
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

/**
 * Retorna saudação baseada no horário atual (Brasília)
 */
function getGreeting() {
  // Horário de Brasília (UTC-3)
  const now = new Date();
  const brasiliaOffset = -3 * 60;
  const localOffset = now.getTimezoneOffset();
  const brasiliaTime = new Date(now.getTime() + (localOffset + brasiliaOffset) * 60000);
  const hour = brasiliaTime.getHours();

  if (hour >= 6 && hour < 12) {
    return 'Bom dia';
  } else if (hour >= 12 && hour < 18) {
    return 'Boa tarde';
  } else {
    return 'Boa noite';
  }
}

/**
 * Obtém ou cria histórico de conversa
 */
function getHistory(chatId) {
  if (!conversationHistory.has(chatId)) {
    conversationHistory.set(chatId, []);
  }
  return conversationHistory.get(chatId);
}

/**
 * Adiciona mensagem ao histórico
 */
function addToHistory(chatId, role, content) {
  const history = getHistory(chatId);
  history.push({ role, content, timestamp: new Date() });

  // Limita histórico
  if (history.length > config.historyLimit) {
    history.shift();
  }
}

/**
 * Formata histórico para o Gemini
 */
function formatHistoryForGemini(chatId) {
  const history = getHistory(chatId);
  return history.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));
}

/**
 * Limpa históricos antigos (mais de 24h)
 */
function cleanOldHistories() {
  const maxAge = 24 * 60 * 60 * 1000; // 24 horas
  const now = Date.now();

  for (const [chatId, history] of conversationHistory.entries()) {
    if (history.length > 0) {
      const lastMessage = history[history.length - 1];
      if (now - new Date(lastMessage.timestamp).getTime() > maxAge) {
        conversationHistory.delete(chatId);
      }
    }
  }
}

// Limpa históricos a cada hora
setInterval(cleanOldHistories, 60 * 60 * 1000);

/**
 * Desativa números inativos há mais de 30 minutos
 */
function cleanInactiveUsers() {
  const now = Date.now();

  for (const [phone, lastActivity] of activeUsers.entries()) {
    if (now - lastActivity > ACTIVATION_TIMEOUT) {
      activeUsers.delete(phone);
      conversationHistory.delete(phone);
      console.log(`🔴 Número desativado por inatividade (30 min): ${phone}`);
    }
  }
}

// Verifica inatividade a cada minuto
setInterval(cleanInactiveUsers, 60 * 1000);

// ============================================
// INTEGRAÇÃO GEMINI
// ============================================

/**
 * Gera resposta usando Gemini
 */
async function generateResponse(chatId, userMessage, senderName) {
  if (!model) {
    throw new Error('Gemini não inicializado');
  }

  const greeting = getGreeting();
  const history = formatHistoryForGemini(chatId);

  const systemPrompt = `Você é um assistente virtual que responde como se fosse o Delegado Bruno Lima.

${KNOWLEDGE_BASE}

INSTRUÇÕES ADICIONAIS:
- A saudação atual baseada no horário de Brasília é: "${greeting}"
- ${senderName ? `O nome da pessoa é: ${senderName}` : 'Você não sabe o nome da pessoa'}
- Responda de forma humanizada, como se fosse o próprio Bruno
- Use a saudação apropriada ao horário quando for a primeira interação
- Seja empático e próximo
- Use emojis amarelos com moderação (👊🙌👏😔🐾🙏)
- NUNCA use apelidos como "querida", "amigo", etc
- Se souber o nome, pode usar: "${greeting}, ${senderName || 'tudo bem'}?"
- Se for denúncia, siga o fluxo correto de condução
- Em dúvidas ou pedidos para entrar na equipe, indique o Demetrius

Responda à mensagem do usuário de forma natural e humanizada.`;

  try {
    const chat = model.startChat({
      history: history,
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.7,
      },
    });

    const prompt = `${systemPrompt}\n\nMensagem do usuário: ${userMessage}`;
    const result = await chat.sendMessage(prompt);
    const response = result.response.text();

    // Salva no histórico
    addToHistory(chatId, 'user', userMessage);
    addToHistory(chatId, 'assistant', response);

    return response;
  } catch (error) {
    console.error('Erro ao gerar resposta:', error);
    throw error;
  }
}

// ============================================
// INTEGRAÇÃO Z-API
// ============================================

/**
 * Envia mensagem via Z-API
 */
async function sendMessage(chatId, message) {
  if (!config.zapi.instanceId || !config.zapi.token) {
    console.log('📤 [SIMULAÇÃO] Enviando para', chatId, ':', message);
    return { success: true, simulated: true };
  }

  try {
    const url = `${config.zapi.baseUrl}/instances/${config.zapi.instanceId}/token/${config.zapi.token}/send-text`;

    const response = await axios.post(url, {
      phone: chatId,
      message: message
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': config.zapi.token
      }
    });

    console.log('📤 Mensagem enviada para', chatId);
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error.response?.data || error.message);
    throw error;
  }
}

// ============================================
// PROCESSAMENTO DE MENSAGENS
// ============================================

/**
 * Processa mensagem recebida (formato Z-API)
 */
async function processMessage(data) {
  try {
    // Ignora mensagens enviadas por nós mesmos
    if (data.fromMe) {
      return;
    }

    // Ignora grupos (opcional)
    if (data.isGroup) {
      return;
    }

    const chatId = data.phone;
    const senderName = data.senderName || data.chatName;

    // Extrai texto da mensagem (Z-API envia em diferentes campos conforme o tipo)
    const message = data.text?.message ||
                   data.image?.caption ||
                   data.video?.caption ||
                   null;

    if (!chatId) return;

    // Verifica frase de ativação
    if (message && message.trim().toLowerCase() === ACTIVATION_PHRASE) {
      activeUsers.set(chatId, Date.now());
      console.log(`🟢 Número ativado: ${chatId} (${senderName || 'sem nome'})`);
      await sendMessage(chatId, 'Olá! Pode me mandar a sua dúvida');
      stats.messagesReceived++;
      stats.messagesProcessed++;
      return;
    }

    // Ignora quem não ativou o bot
    if (!activeUsers.has(chatId)) {
      return;
    }

    // Atualiza timestamp de atividade
    activeUsers.set(chatId, Date.now());

    // Ignora mensagens sem texto
    if (!message) {
      // Se for imagem/vídeo sem caption, pode ser uma denúncia
      if (data.image || data.video) {
        const response = await generateResponse(
          chatId,
          '[Usuário enviou uma imagem/vídeo]',
          senderName
        );
        await sendMessage(chatId, response);
      }
      return;
    }

    console.log(`📩 Mensagem de ${senderName || chatId}: ${message.substring(0, 50)}...`);
    stats.messagesReceived++;

    // Gera resposta
    const response = await generateResponse(chatId, message, senderName);

    // Envia resposta
    await sendMessage(chatId, response);
    stats.messagesProcessed++;

  } catch (error) {
    console.error('❌ Erro ao processar mensagem:', error);
    stats.errors++;
  }
}

// ============================================
// ROTAS EXPRESS
// ============================================

// Webhook para Z-API
app.post('/webhook', async (req, res) => {
  try {
    // Z-API envia mensagens recebidas com tipo "ReceivedCallback"
    if (req.body && !req.body.fromMe) {
      setImmediate(() => processMessage(req.body));
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Erro no webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check para Render
app.get('/health', (req, res) => {
  const healthy = !!model;
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'unhealthy',
    gemini: !!model,
    zapi: !!(config.zapi.instanceId && config.zapi.token),
    uptime: Math.floor((Date.now() - stats.startTime.getTime()) / 1000)
  });
});

// Estatísticas
app.get('/stats', (req, res) => {
  res.json({
    ...stats,
    uptime: Math.floor((Date.now() - stats.startTime.getTime()) / 1000),
    activeUsers: activeUsers.size,
    activeConversations: conversationHistory.size,
    memoryUsage: process.memoryUsage()
  });
});

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    name: 'Bot WhatsApp - Delegado Bruno Lima',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      webhook: 'POST /webhook',
      health: 'GET /health',
      stats: 'GET /stats'
    }
  });
});

// ============================================
// INICIALIZAÇÃO DO SERVIDOR
// ============================================

app.listen(config.port, () => {
  console.log('='.repeat(50));
  console.log('🤖 Bot WhatsApp - Delegado Bruno Lima');
  console.log('='.repeat(50));
  console.log(`🚀 Servidor rodando na porta ${config.port}`);
  console.log(`📍 Webhook: http://localhost:${config.port}/webhook`);
  console.log(`💚 Health: http://localhost:${config.port}/health`);
  console.log(`📊 Stats: http://localhost:${config.port}/stats`);
  console.log('='.repeat(50));

  // Inicializa Gemini
  initGemini();

  // Verifica configurações
  if (!config.zapi.instanceId) {
    console.log('⚠️  ZAPI_INSTANCE_ID não configurada (modo simulação)');
  }
  if (!config.zapi.token) {
    console.log('⚠️  ZAPI_TOKEN não configurado (modo simulação)');
  }

  console.log('='.repeat(50));
  console.log('✅ Bot pronto para receber mensagens!');
});
