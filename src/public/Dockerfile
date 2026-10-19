# syntax=docker/dockerfile:1

# ---------- Estágio 1: build do Angular ----------
FROM node:22-alpine AS build
WORKDIR /app
ENV NG_CLI_ANALYTICS=false

# Dependências primeiro: o cache só é invalidado quando package*.json mudar
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Código-fonte + angular.json, tsconfig*.json, tailwind.config.js e .postcssrc.json
COPY . .

# O build não deve depender da rede: sem isso o Angular baixa as fontes do Google durante o build
# (e falha com HTTP 400/403 em redes restritas). As fontes passam a carregar no navegador, via <link> do index.html.
RUN node -e "const fs=require('fs');const a=JSON.parse(fs.readFileSync('angular.json','utf8'));for(const p of Object.values(a.projects)){const c=((p.architect||{}).build||{}).configurations;if(c&&c.production){c.production.optimization={scripts:true,styles:{minify:true,inlineCritical:false},fonts:false};}}fs.writeFileSync('angular.json',JSON.stringify(a,null,2));"

# A pasta de saída em dist/ depende do nome do projeto no angular.json, por isso o glob
RUN npx ng build --configuration production \
 && mkdir -p /out \
 && mv dist/*/browser/* /out/

# ---------- Estágio 2: servidor estático (nginx) ----------
FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /out /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=10s --timeout=5s --retries=5 --start-period=5s \
  CMD wget -qO /dev/null http://127.0.0.1/ || exit 1