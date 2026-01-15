# Guía de Despliegue - TallerAgil

## Requisitos Previos

### 1. Configurar Supabase (Obligatorio)

1. Crear proyecto en [supabase.com](https://supabase.com) (gratis)
2. Elegir región **Frankfurt (eu-central-1)** para RGPD
3. Obtener credenciales en **Settings > API**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

4. Ejecutar migraciones en **SQL Editor**:
```sql
-- Copiar contenido de supabase/migrations/add_orden_legal_fields.sql
```

### 2. Configurar Telegram (Opcional)

Para la funcionalidad de subir fotos:

1. Crear bot con [@BotFather](https://t.me/BotFather)
2. Obtener `TELEGRAM_BOT_TOKEN`
3. Crear grupo/canal y obtener `TELEGRAM_CHAT_ID`

---

## Opciones de Deploy Gratuitas

### Opción A: Railway (Recomendado)

**Pros**: Fácil, $5 crédito gratis/mes, buen rendimiento
**Contras**: Límite de crédito

```bash
# 1. Instalar CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Crear proyecto
railway init

# 4. Configurar variables de entorno
railway variables set NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
railway variables set NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
railway variables set SUPABASE_SERVICE_ROLE_KEY=xxx
railway variables set NEXT_PUBLIC_APP_URL=https://tu-app.up.railway.app
railway variables set TELEGRAM_BOT_TOKEN=xxx
railway variables set TELEGRAM_CHAT_ID=xxx

# 5. Deploy
railway up
```

### Opción B: Render.com

**Pros**: Free tier generoso, auto-deploy desde GitHub
**Contras**: Sleep después de 15min inactividad (free tier)

1. Conectar repositorio en [render.com](https://render.com)
2. Seleccionar "Web Service"
3. Configurar:
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npm start`
4. Añadir variables de entorno
5. Deploy automático

### Opción C: Fly.io

**Pros**: Generous free tier, edge locations
**Contras**: Requiere tarjeta (no cobra si no excedes)

```bash
# 1. Instalar CLI
curl -L https://fly.io/install.sh | sh

# 2. Login
fly auth login

# 3. Crear app
fly launch --name talleragil

# 4. Configurar secrets
fly secrets set NEXT_PUBLIC_SUPABASE_URL=xxx
fly secrets set NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
fly secrets set SUPABASE_SERVICE_ROLE_KEY=xxx
fly secrets set NEXT_PUBLIC_APP_URL=https://talleragil.fly.dev
fly secrets set TELEGRAM_BOT_TOKEN=xxx
fly secrets set TELEGRAM_CHAT_ID=xxx

# 5. Deploy
fly deploy
```

### Opción D: VPS con Coolify (Self-hosted)

**Pros**: Control total, sin límites, económico ($4-5/mes)
**Contras**: Requiere mantenimiento

#### Proveedores VPS económicos:
- **Hetzner**: €3.79/mes (Alemania, RGPD compliant)
- **Hostinger**: $4.99/mes
- **Oracle Cloud**: Gratis (ARM, 4 OCPU, 24GB RAM)

```bash
# En el VPS:

# 1. Instalar Coolify
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash

# 2. Acceder a https://tu-ip:8000
# 3. Conectar repositorio GitHub
# 4. Configurar variables de entorno
# 5. Deploy con un click
```

### Opción E: Docker Compose (Self-hosted)

```bash
# 1. Crear docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - TELEGRAM_CHAT_ID=${TELEGRAM_CHAT_ID}
    restart: unless-stopped
EOF

# 2. Crear .env con las variables

# 3. Ejecutar
docker-compose up -d
```

---

## Variables de Entorno

| Variable | Descripción | Obligatorio |
|----------|-------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima Supabase | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio Supabase | ✅ |
| `NEXT_PUBLIC_APP_URL` | URL pública de la app | ✅ |
| `TELEGRAM_BOT_TOKEN` | Token del bot de Telegram | ❌ |
| `TELEGRAM_CHAT_ID` | ID del chat de Telegram | ❌ |

---

## Configuración de Dominio Personalizado

### Con Cloudflare (Gratis)

1. Añadir dominio a Cloudflare
2. Cambiar nameservers en tu registrador
3. En la plataforma de deploy, configurar dominio personalizado
4. Añadir registros DNS en Cloudflare:
   - Tipo: `CNAME`
   - Nombre: `@` o `www`
   - Destino: URL proporcionada por la plataforma

### SSL/HTTPS

Todas las plataformas mencionadas incluyen SSL gratis automático.

---

## Monitoreo y Logs

### Básico (Gratis)

- **Railway/Render/Fly.io**: Logs integrados en dashboard
- **Supabase**: Logs de base de datos en dashboard

### Avanzado (Opcional)

- **Sentry**: Tracking de errores (free tier generoso)
- **Axiom**: Logs centralizados (free tier)

---

## Checklist Pre-Deploy

- [ ] Supabase configurado con región EU
- [ ] Migraciones SQL ejecutadas
- [ ] Variables de entorno preparadas
- [ ] Build local funciona (`npm run build`)
- [ ] Tests pasan (`npm test`)
- [ ] `.env.example` actualizado
- [ ] Telegram bot configurado (si se usa)

---

## Troubleshooting

### Error: "NEXT_PUBLIC_SUPABASE_URL is not defined"
- Verificar que las variables están configuradas en la plataforma
- Las variables `NEXT_PUBLIC_*` deben estar disponibles en build time

### Error: "Invalid API key"
- Verificar que `SUPABASE_SERVICE_ROLE_KEY` es la correcta
- No confundir con `ANON_KEY`

### Cold starts lentos
- Normal en free tiers que "duermen"
- Considerar upgrade o VPS propio

### OCR no funciona
- Tesseract.js requiere más memoria
- Verificar límites de la plataforma (mín. 512MB RAM)

---

## Costes Estimados

| Escenario | Plataforma | Coste/mes |
|-----------|------------|-----------|
| MVP inicial | Railway/Render free | €0 |
| Producción básica | Railway/Fly.io | €5-10 |
| Producción seria | VPS Hetzner | €4-8 |
| Alta disponibilidad | VPS + backup | €10-20 |

**Supabase free tier** incluye:
- 500MB base de datos
- 1GB storage
- 2GB bandwidth
- 50,000 MAU auth

Suficiente para ~100-500 órdenes/mes.
