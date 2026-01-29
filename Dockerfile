# Dockerfile para Bot WhatsApp - Delegado Bruno Lima
# Otimizado para Render Free Tier

FROM node:18-alpine

# Criar diretório da aplicação
WORKDIR /usr/src/app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm install --only=production

# Copiar código da aplicação
COPY . .

# Define variáveis de ambiente padrão
ENV NODE_ENV=production

# Expor porta (Render injeta PORT automaticamente)
EXPOSE 10000

# Comando para iniciar
CMD ["node", "bot.js"]
