FROM node:24-alpine
WORKDIR /app
COPY package.json ./
COPY src ./src
COPY public ./public
COPY scripts ./scripts
COPY data ./data
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3096 BD_DESK_DB=/data/bd-desk.db
VOLUME ["/data"]
EXPOSE 3096
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD wget -q -O - http://127.0.0.1:3096/api/health >/dev/null || exit 1
CMD ["node","src/server.js"]
