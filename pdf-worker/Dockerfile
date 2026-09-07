# Full puppeteer image: Chrome is baked in, so there's no download at boot and
# no version drift against a separately-pinned chromium build.
FROM ghcr.io/puppeteer/puppeteer:23.4.0

USER root
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run build && chown -R pptruser:pptruser /app
USER pptruser

ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "dist/index.js"]
