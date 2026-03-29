FROM node:18-bullseye-slim
WORKDIR /app
ENV NODE_OPTIONS=--dns-result-order=ipv6first
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run prisma:generate
RUN npm run build
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
  CMD node -e "require('http').get('http://127.0.0.1:3000/api/health',(r)=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
CMD ["sh", "-lc", "npx prisma migrate deploy && npx next start -H 0.0.0.0 -p 3000"]
