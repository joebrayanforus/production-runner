# Frontend multi-stage Dockerfile
# Stage 1: build the Angular app
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --silent
COPY angular.json tsconfig*.json ./
COPY src ./src
RUN npm run build -- --configuration production       

# Stage 2: serve the app with Nginx
FROM nginx:alpine AS runtime
# Remove default nginx files and configs
RUN rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/*
# Copy Angular build output directly to html root
COPY --from=builder /app/dist/projettest1/browser/ /usr/share/nginx/html/
# Use the provided nginx config
COPY ./nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]


