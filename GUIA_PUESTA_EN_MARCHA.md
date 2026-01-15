# GUÍA COMPLETA DE PUESTA EN MARCHA - TallerAgil v1.0

## ÍNDICE
1. [Configurar Supabase](#1-configurar-supabase)
2. [Ejecutar Migraciones SQL](#2-ejecutar-migraciones-sql)
3. [Configurar Variables de Entorno](#3-configurar-variables-de-entorno)
4. [Deploy en Railway (Recomendado)](#4-deploy-en-railway)
5. [Configurar Dominio Personalizado](#5-configurar-dominio-personalizado)
6. [Primer Acceso y Configuración](#6-primer-acceso-y-configuración)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. CONFIGURAR SUPABASE

### Paso 1.1: Crear Cuenta y Proyecto

1. Ve a **https://supabase.com** y crea cuenta (gratis)
2. Click en **"New Project"**
3. Configuración del proyecto:
   - **Organization**: Crea una nueva o usa existente
   - **Project name**: `talleragil` (o el nombre que quieras)
   - **Database Password**: Genera una contraseña segura y **GUÁRDALA**
   - **Region**: `Frankfurt (eu-central-1)` ← **IMPORTANTE para RGPD**
   - **Pricing Plan**: Free (suficiente para empezar)
4. Click **"Create new project"** y espera ~2 minutos

### Paso 1.2: Obtener Credenciales

Una vez creado el proyecto:

1. Ve a **Settings** (icono engranaje) → **API**
2. Copia estos valores:

```
# Project URL (será algo como):
https://abcdefghijk.supabase.co

# API Keys:
anon (public): eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role (secret): eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**⚠️ IMPORTANTE**: La `service_role` key es SECRETA. Nunca la expongas en el frontend.

### Paso 1.3: Configurar Autenticación

1. Ve a **Authentication** → **Providers**
2. Verifica que **Email** está habilitado
3. En **Authentication** → **URL Configuration**:
   - **Site URL**: `https://tu-dominio.com` (o la URL de Railway después del deploy)
   - **Redirect URLs**: Añade:
     - `https://tu-dominio.com/*`
     - `http://localhost:3000/*` (para desarrollo)

---

## 2. EJECUTAR MIGRACIONES SQL

### Paso 2.1: Abrir SQL Editor

1. En Supabase Dashboard, ve a **SQL Editor** (icono de base de datos)
2. Click en **"New query"**

### Paso 2.2: Ejecutar Schema Completo

Copia y pega TODO el contenido del archivo:
```
supabase/schema.sql
```

Este archivo crea:
- ✅ 9 tablas (talleres, usuarios, clientes, vehiculos, ordenes, lineas, facturas, etc.)
- ✅ Índices para rendimiento
- ✅ Row Level Security (RLS) habilitado
- ✅ Políticas de seguridad por taller
- ✅ Triggers para updated_at automático

### Paso 2.3: Ejecutar Query

1. Pega todo el SQL en el editor
2. Click **"Run"** (o Ctrl+Enter)
3. Deberías ver: `Success. No rows returned`

### Paso 2.4: Verificar Creación

Ejecuta esta query para verificar:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

Debes ver estas 9 tablas:
- clientes
- facturas
- lineas_factura
- lineas_orden
- ordenes_reparacion
- taller_config
- talleres
- usuarios
- vehiculos

---

## 3. CONFIGURAR VARIABLES DE ENTORNO

### Variables Necesarias

Crea un archivo `.env.local` (local) o configúralas en Railway:

```bash
# === OBLIGATORIAS ===

# URL del proyecto Supabase
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijk.supabase.co

# Clave anónima (pública)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Clave de servicio (secreta, solo servidor)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# URL de la aplicación (actualizar después del deploy)
NEXT_PUBLIC_APP_URL=https://talleragil.up.railway.app

# === OPCIONALES (para fotos) ===

# Token del bot de Telegram
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz

# Chat ID donde se guardan fotos
TELEGRAM_CHAT_ID=-1001234567890
```

### Cómo Obtener Telegram Bot (Opcional)

Si quieres usar la funcionalidad de fotos:

1. Abre Telegram y busca **@BotFather**
2. Envía `/newbot`
3. Sigue las instrucciones (nombre y username)
4. Copia el **token** que te da
5. Crea un grupo y añade el bot
6. Para obtener el chat_id, envía un mensaje al grupo y visita:
   `https://api.telegram.org/bot<TOKEN>/getUpdates`
7. Busca `"chat":{"id":-1001234567890}` en la respuesta

---

## 4. DEPLOY EN RAILWAY

### Paso 4.1: Crear Cuenta Railway

1. Ve a **https://railway.app**
2. Click **"Login"** → **"Login with GitHub"**
3. Autoriza el acceso

### Paso 4.2: Crear Proyecto

1. Click **"New Project"**
2. Selecciona **"Deploy from GitHub repo"**
3. Busca y selecciona tu repositorio `taller-saas`
4. Click **"Deploy Now"**

### Paso 4.3: Configurar Variables de Entorno

1. En el proyecto de Railway, click en el servicio desplegado
2. Ve a la pestaña **"Variables"**
3. Click **"+ New Variable"** y añade cada una:

```
NEXT_PUBLIC_SUPABASE_URL = https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...
SUPABASE_SERVICE_ROLE_KEY = eyJ...
NEXT_PUBLIC_APP_URL = (se actualiza después)
TELEGRAM_BOT_TOKEN = (opcional)
TELEGRAM_CHAT_ID = (opcional)
NODE_ENV = production
```

### Paso 4.4: Configurar Build

1. Ve a la pestaña **"Settings"**
2. En **Build Command**: `npm ci && npm run build`
3. En **Start Command**: `npm start`
4. En **Root Directory**: `/` (vacío o /)

### Paso 4.5: Obtener URL de Deploy

1. Una vez desplegado, ve a **Settings** → **Networking**
2. Click **"Generate Domain"**
3. Obtendrás algo como: `talleragil-production.up.railway.app`
4. **ACTUALIZA** la variable `NEXT_PUBLIC_APP_URL` con esta URL

### Paso 4.6: Actualizar Supabase

1. Vuelve a Supabase → **Authentication** → **URL Configuration**
2. Actualiza **Site URL** con la URL de Railway
3. Añade a **Redirect URLs**: `https://tu-app.up.railway.app/*`

---

## 5. CONFIGURAR DOMINIO PERSONALIZADO

### Opción A: Sin Dominio Propio (Gratuito)

Usa la URL de Railway directamente:
- `https://talleragil-production.up.railway.app`

### Opción B: Con Dominio Propio

#### Paso 5.1: Comprar Dominio

Opciones económicas (~10€/año):
- **Namecheap**: https://namecheap.com
- **Porkbun**: https://porkbun.com
- **Cloudflare Registrar**: https://cloudflare.com/products/registrar

Ejemplo: `talleragil.es` o `tunombre.com`

#### Paso 5.2: Configurar DNS con Cloudflare (Recomendado)

1. Crea cuenta en **https://cloudflare.com** (gratis)
2. Click **"Add a Site"** y añade tu dominio
3. Sigue las instrucciones para cambiar los **nameservers** en tu registrador
4. Espera ~24h para propagación

#### Paso 5.3: Conectar Dominio a Railway

**En Railway:**
1. Ve a tu proyecto → **Settings** → **Networking**
2. En **Custom Domain**, click **"+ Custom Domain"**
3. Escribe tu dominio: `talleragil.es`
4. Railway te dará un valor **CNAME** (algo como `xxx.railway.app`)

**En Cloudflare:**
1. Ve a **DNS**
2. Añade registro:
   - **Type**: CNAME
   - **Name**: `@` (o `www`)
   - **Target**: el valor que te dio Railway
   - **Proxy status**: Proxied (naranja)

#### Paso 5.4: Actualizar URLs

1. **Railway**: Actualiza `NEXT_PUBLIC_APP_URL` → `https://talleragil.es`
2. **Supabase**: Actualiza Site URL y Redirect URLs con el nuevo dominio

---

## 6. PRIMER ACCESO Y CONFIGURACIÓN

### Paso 6.1: Registrar Usuario Admin

1. Abre tu aplicación: `https://tu-dominio.com`
2. Click en **"Registrarse"**
3. Completa el formulario:
   - **Nombre del taller**: Tu Taller S.L.
   - **Email**: tu@email.com
   - **Contraseña**: (mínimo 6 caracteres)
4. Click **"Crear cuenta"**

Esto crea automáticamente:
- Un registro en `auth.users` (Supabase Auth)
- Un registro en `talleres`
- Un registro en `usuarios` vinculado al taller
- Un registro en `taller_config` con valores por defecto

### Paso 6.2: Configurar Datos del Taller

1. Ve a **Configuración** (icono engranaje)
2. Completa:
   - Nombre de la empresa
   - CIF/NIF
   - Dirección completa
   - Teléfono y email
   - Logo (opcional)
   - Tarifa por hora
   - % IVA (21% por defecto)
   - Serie de facturas
   - IBAN (para domiciliaciones)
   - Condiciones de pago
3. Click **"Guardar"**

### Paso 6.3: Crear Primer Cliente

1. Ve a **Clientes** → **Nuevo Cliente**
2. Rellena datos del cliente
3. Guarda

### Paso 6.4: Crear Primera Orden

1. Ve a **Órdenes** → **Nueva**
2. Selecciona cliente
3. Crea o selecciona vehículo
4. Añade descripción del problema
5. Añade líneas (mano de obra, piezas)
6. Guarda

---

## 7. TROUBLESHOOTING

### Error: "Invalid API Key"

**Causa**: Las claves de Supabase no están bien configuradas.

**Solución**:
1. Verifica en Supabase Dashboard → Settings → API
2. Copia de nuevo las claves
3. Asegúrate de no tener espacios extra

### Error: "User not found" después de registro

**Causa**: El trigger de creación de usuario no se ejecutó.

**Solución manual** (en Supabase SQL Editor):
```sql
-- Obtén el ID del usuario de auth.users
SELECT id, email FROM auth.users WHERE email = 'tu@email.com';

-- Crea el taller manualmente si no existe
INSERT INTO talleres (nombre) VALUES ('Mi Taller');

-- Obtén el ID del taller
SELECT id FROM talleres ORDER BY created_at DESC LIMIT 1;

-- Crea el usuario con los IDs obtenidos
INSERT INTO usuarios (email, taller_id, rol)
VALUES ('tu@email.com', 'ID_DEL_TALLER', 'admin');
```

### Error: "RLS policy violation"

**Causa**: Las políticas de seguridad están bloqueando el acceso.

**Solución**: Verifica que el usuario existe en la tabla `usuarios` con el email correcto.

### Build falla en Railway

**Causa común**: Falta de memoria o timeout.

**Solución**:
1. En Railway → Settings, aumenta recursos si es posible
2. Verifica que no hay errores de TypeScript: `npm run type-check`
3. Revisa los logs en Railway → Deployments

### OCR no funciona

**Causa**: Tesseract.js necesita más memoria.

**Solución**:
- Railway free tier debería ser suficiente
- Si persiste, el OCR puede tardar en el primer uso (carga el modelo)

### Fotos no se suben

**Causa**: Telegram no está configurado.

**Solución**:
1. Verifica `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID`
2. El bot debe ser admin del grupo
3. Prueba enviando un mensaje al grupo manualmente

---

## RESUMEN DE URLS

| Servicio | URL |
|----------|-----|
| **Tu App** | https://tu-dominio.com |
| **Supabase Dashboard** | https://supabase.com/dashboard |
| **Railway Dashboard** | https://railway.app/dashboard |
| **Cloudflare Dashboard** | https://dash.cloudflare.com |

---

## COSTES ESTIMADOS

| Concepto | Coste | Notas |
|----------|-------|-------|
| Supabase | $0 | Free tier: 500MB DB, 2GB transfer |
| Railway | $0-5/mes | $5 crédito gratis incluido |
| Dominio | ~10€/año | Opcional |
| Cloudflare | $0 | DNS y SSL gratis |
| **TOTAL MVP** | **$0/mes** | Sin dominio personalizado |

---

## SOPORTE

Si tienes problemas:
1. Revisa los logs en Railway
2. Revisa la consola del navegador (F12)
3. Verifica las variables de entorno
4. Consulta la documentación de Supabase

¡Listo! Tu TallerAgil debería estar funcionando. 🚗🔧
