FROM node:18-alpine

# Criar diretório da aplicação
WORKDIR /usr/src/app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm install --only=production

# Copiar código da aplicação
COPY . .

# Expor porta
EXPOSE 10000

# Comando para iniciar
CMD [ "node", "bot.js" ]
