# ========================
# BUILD STAGE
# ========================
FROM node:18-alpine AS build

WORKDIR /app

# Copiar package.json e instalar dependências
COPY package*.json ./
RUN npm ci

# Copiar todo o código fonte
COPY . .

# Definir variável de ambiente padrão (pode vir do EasyPanel)
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL:-/api}

# Build do Vite
RUN npm run build


# ========================
# NGINX STAGE
# ========================
FROM nginx:alpine

# Copiar os arquivos do build
COPY --from=build /app/dist /usr/share/nginx/html

# Copiar a configuração customizada do Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expor a porta 80
EXPOSE 80

# Iniciar o Nginx
CMD ["nginx", "-g", "daemon off;"]
