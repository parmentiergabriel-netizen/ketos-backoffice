FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN if [ -f pnpm-lock.yaml ]; then corepack enable && corepack prepare pnpm@latest --activate && pnpm install --frozen-lockfile;     elif [ -f yarn.lock ]; then yarn install --frozen-lockfile;     elif [ -f package-lock.json ]; then npm ci;     else npm install; fi

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN if [ -f pnpm-lock.yaml ]; then corepack enable && corepack prepare pnpm@latest --activate && pnpm run build;     elif [ -f yarn.lock ]; then yarn build;     else npm run build; fi

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app .
EXPOSE 3000
CMD ["sh","-c","if [ -f pnpm-lock.yaml ]; then corepack enable && corepack prepare pnpm@latest --activate && pnpm start;     elif [ -f yarn.lock ]; then yarn start;     else npm run start; fi"]
