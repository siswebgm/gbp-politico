FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY server.js google.js payments.js jobs.js n8n.js ./

ENV PORT=3400
EXPOSE 3400

CMD ["node", "server.js"]
