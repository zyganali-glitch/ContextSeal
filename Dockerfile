FROM node:24-alpine
WORKDIR /app
ENV HOST=0.0.0.0
COPY package.json ./
COPY src ./src
COPY public ./public
COPY config ./config
COPY examples ./examples
RUN mkdir -p .contextseal && chown -R node:node /app
ENV NODE_ENV=production PORT=4173 CONTEXTSEAL_MODE=fixture
EXPOSE 4173
USER node
CMD ["node", "src/server.js"]
