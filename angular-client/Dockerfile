# ---------- Build Phase ----------
FROM node:alpine AS Build
WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

# Build the app once (no real env values here)
RUN npm run build:production

# ---------- Runtime Phase ----------
FROM nginx:alpine AS Production

# Install envsubst to do runtime variable substitution
RUN apk add --no-cache gettext

# Set working directory
WORKDIR /usr/share/nginx/html

# Copy built Angular app
COPY --from=Build /usr/src/app/dist/angular-client/browser .

# Copy NGINX config
COPY --from=Build /usr/src/app/nginx.conf /etc/nginx/conf.d/default.conf

# Copy env prod and entrypoint script
COPY env.prod.js ./assets/env.prod.js
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]