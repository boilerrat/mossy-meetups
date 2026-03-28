FROM node:18-bullseye-slim
WORKDIR /app
ENV NODE_OPTIONS=--dns-result-order=ipv6first
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run prisma:generate
RUN npm run build
EXPOSE 3000
CMD ["sh", "-lc", "HOST_IP=$(hostname -i | awk '{print $1}') && npx next start -H \"$HOST_IP\" -p 3000"]
