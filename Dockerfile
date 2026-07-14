FROM node:24-alpine
LABEL org.opencontainers.image.title="ContextSeal" \
      org.opencontainers.image.description="Graph-backed certification for high-risk data changes" \
      org.opencontainers.image.source="https://github.com/zyganali-glitch/ContextSeal" \
      org.opencontainers.image.licenses="Apache-2.0"
WORKDIR /app
ENV CONTEXTSEAL_HOST=0.0.0.0
COPY package.json ./
COPY src ./src
COPY public ./public
COPY config ./config
COPY examples ./examples
RUN mkdir -p .contextseal && chown -R node:node /app
ENV NODE_ENV=production PORT=4173 CONTEXTSEAL_MODE=fixture
EXPOSE 4173
USER node
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:4173/api/health').then(async r=>{const b=await r.json();if(!r.ok||b.status!=='ok')process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["node", "src/server.js"]
