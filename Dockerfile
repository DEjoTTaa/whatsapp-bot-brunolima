# Dockerfile para Bot WhatsApp - Delegado Bruno Lima
# Otimizado para Koyeb Free Tier

FROM node:18-alpine

# Define diretório de trabalho
WORKDIR /app

# Copia arquivos de dependências
COPY package*.json ./

# Instala dependências (apenas produção)
RUN npm ci --only=production

# Copia código fonte
COPY bot.js ./

# Define variáveis de ambiente padrão
ENV NODE_ENV=production
ENV PORT=3000

# Expõe porta
EXPOSE 3000

# Health check para Koyeb
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Executa o bot
CMD ["node", "bot.js"]
