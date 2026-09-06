FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

# Retries once: under QEMU emulation (arm64 builds on an amd64 runner), npm's
# extraction of platform-specific optional native packages occasionally hits
# a transient ENOENT/EEXIST race on mkdir - not a real dependency problem,
# just an emulated-filesystem flake that a retry clears.
RUN npm ci --legacy-peer-deps || npm ci --legacy-peer-deps

COPY . .

RUN npm run build -- --configuration production --project=vman3-frontend

FROM nginx:alpine

COPY default.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist/vman3-frontend/browser /usr/share/nginx/html

# Ensure all assets are world-readable (source files may have restrictive perms).
RUN find /usr/share/nginx/html/assets -type f -exec chmod 644 {} \;

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
