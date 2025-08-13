FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# Try CI first, fallback to install when no lockfile present
RUN npm ci --only=production || npm install --production

COPY . .

ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"]