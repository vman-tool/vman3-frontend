# FROM node:18-alpine as builder

# WORKDIR /app

# COPY package*.json ./

# RUN npm install --legacy-peer-deps

# COPY . .

# RUN npm run build

# FROM nginx:alpine

# COPY nginx.conf /etc/nginx/conf.d/default.conf

# COPY --from=builder /app/dist/vman3-frontend/browser /usr/share/nginx/html

# EXPOSE 80

# CMD ["nginx", "-g", "daemon off;"]

# Stage 1: Build the Angular app
FROM node:18-alpine as builder

WORKDIR /app

# Copy package.json and package-lock.json files for dependency installation
COPY package*.json ./

# Install dependencies (use production flags and cache layer optimally)
RUN npm ci --legacy-peer-deps

# Copy the rest of the application code
COPY . .

# Build the Angular app with the correct project name and production configuration
RUN npm run build -- --configuration production --project=vman3-frontend --base-href /vman/

# Stage 2: Serve the app with Nginx
FROM nginx:alpine

# Copy custom Nginx configuration if needed
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built Angular app from builder stage to Nginx html folder
COPY --from=builder /app/dist/vman3-frontend/browser /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Run Nginx
CMD ["nginx", "-g", "daemon off;"]
