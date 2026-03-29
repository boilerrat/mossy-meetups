FROM node:20-bullseye-slim
WORKDIR /app
ENV NODE_OPTIONS=--dns-result-order=ipv6first
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run prisma:generate
RUN npm run build
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD curl -f http://localhost:3000/api/health || exit 1
CMD ["sh", "-lc", "npx prisma migrate deploy && npx next start -H 0.0.0.0 -p 3000"]
