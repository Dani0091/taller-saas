# 🔧 SOLUCIÓN: Errores de Build y Base de Datos

**Fecha**: 2026-01-26
**Estado**: ✅ SOLUCIONADO

---

## 🔴 PROBLEMAS DETECTADOS

### 1. **Error Principal: Columnas Faltantes en Tabla `usuarios`**

```
Error: Could not find the 'activo' column of 'usuarios' in the schema cache
```

**Causa**: Tu base de datos local no tiene las columnas `activo` y `auth_id` en la tabla `usuarios`.

**Impacto**:
- ❌ No se pueden registrar nuevos usuarios
- ❌ No se pueden iniciar sesión usuarios existentes
- ❌ Dashboard no carga métricas (depende de `auth_id`)

---

### 2. **Error en Dashboard: Métricas No Cargan**

```javascript
// src/app/dashboard/page.tsx:38
if (!resultado.success) {
  throw new Error(resultado.error)  // ← Error aquí
}
```

**Causa**: El Server Action `obtenerMetricasDashboardAction()` intenta hacer:

```typescript
// src/actions/dashboard/obtener-metricas.action.ts:32
.eq('auth_id', user.id)  // ← Esta columna no existe en tu BD
```

---

### 3. **Warning de Middleware Deprecated**

```
⚠ The "middleware" file convention is deprecated.
Please use "proxy" instead.
```

**Causa**: Next.js 15 deprecó el nombre `middleware.ts` en favor de `proxy.ts`.

---

## ✅ SOLUCIONES APLICADAS

### Solución 1: Migración SQL Creada

**Archivo**: `supabase/migrations/20250126_fix_usuarios_missing_columns.sql`

```sql
-- 1. Añadir columna 'activo' si no existe
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE;

-- 2. Añadir columna 'auth_id' si no existe
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Crear índice para búsquedas por auth_id
CREATE INDEX IF NOT EXISTS idx_usuarios_auth_id ON usuarios(auth_id);

-- 4. Actualizar usuarios existentes
UPDATE usuarios
SET activo = TRUE
WHERE activo IS NULL;
```

**Estado**: ✅ Migración creada

---

### Solución 2: Código de Registro Actualizado

**Archivo**: `src/app/api/auth/registro/route.ts`

**Cambio**: Añadido `auth_id` al insertar usuario

```typescript
// ANTES (línea 166-175)
const { data: usuarioData, error: usuarioError } = await supabaseAdmin
  .from('usuarios')
  .insert({
    email: email_usuario,
    nombre: nombre_usuario,
    rol: 'admin',
    taller_id: taller.id,
    activo: true,  // ← Esta columna faltaba en BD
  })

// DESPUÉS (✅ CORREGIDO)
const { data: usuarioData, error: usuarioError } = await supabaseAdmin
  .from('usuarios')
  .insert({
    auth_id: authData.user.id,  // ← NUEVO: Vincular con Supabase Auth
    email: email_usuario,
    nombre: nombre_usuario,
    rol: 'admin',
    taller_id: taller.id,
    activo: true,
  })
```

**Estado**: ✅ Código actualizado

---

### Solución 3: Middleware Renombrado

**Cambio**: `src/middleware.ts` → `src/proxy.ts`

```bash
mv src/middleware.ts src/proxy.ts
```

**Estado**: ✅ Archivo renombrado

---

## 📋 INSTRUCCIONES: Aplicar la Migración

### Opción A: Supabase Remoto (Producción)

Si estás usando Supabase Cloud:

```bash
# 1. Ir al Dashboard de Supabase
# https://app.supabase.com

# 2. Seleccionar tu proyecto: "taller-saas"

# 3. Ir a: SQL Editor (ícono </> en sidebar)

# 4. Click en "New Query"

# 5. Copiar TODO el contenido de:
#    supabase/migrations/20250126_fix_usuarios_missing_columns.sql

# 6. Pegar en el editor y click en "Run" (▶️)

# 7. Verificar que aparezca: "Success. No rows returned"
```

---

### Opción B: Supabase Local (Desarrollo)

Si estás usando Supabase CLI local:

```bash
# 1. Asegúrate de tener Supabase CLI instalado
supabase --version

# 2. Si no está instalado:
npm install -g supabase

# 3. Iniciar Supabase local (si no está corriendo)
cd /home/user/taller-saas
supabase start

# 4. Aplicar la migración
supabase db push

# 5. Verificar que se aplicó correctamente
supabase db diff
```

---

### Opción C: Aplicar Manualmente con psql

Si tienes acceso directo a PostgreSQL:

```bash
# 1. Conectar a la base de datos
psql -h localhost -U postgres -d postgres

# 2. Ejecutar las queries:
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_usuarios_auth_id ON usuarios(auth_id);
UPDATE usuarios SET activo = TRUE WHERE activo IS NULL;

# 3. Salir
\q
```

---

## 🧪 VERIFICAR QUE FUNCIONA

Después de aplicar la migración:

### 1. **Reiniciar el servidor de desarrollo**

```bash
# Detener el servidor (Ctrl+C)
# Limpiar cache de Next.js
rm -rf .next

# Volver a iniciar
npm run dev
```

---

### 2. **Probar Registro de Usuario**

```bash
# 1. Ir a: http://localhost:3000/auth/registro

# 2. Rellenar formulario:
Nombre Taller: Mi Taller Test
CIF: 12345678A
Nombre Usuario: Test User
Email: test@yopmail.com
Password: test123456

# 3. Click en "Registrar"

# 4. Verificar en consola del servidor:
✅ Usuario Auth creado: [uuid]
✅ Taller creado: [uuid]
✅ Usuario vinculado: [uuid]  # ← Esto debe aparecer SIN ERROR
✅ Configuración creada
🎉 Registro completado exitosamente

# 5. Verificar que redirige a /dashboard
```

---

### 3. **Probar Login**

```bash
# 1. Ir a: http://localhost:3000/auth/login

# 2. Ingresar:
Email: test@yopmail.com
Password: test123456

# 3. Click en "Iniciar sesión"

# 4. Verificar que redirige a /dashboard

# 5. Verificar que carga métricas:
✅ Órdenes Hoy: 0
✅ Pendientes: 0
✅ En Progreso: 0
✅ Completadas: 0
✅ Facturado Mes: €0.00
```

---

### 4. **Verificar en la Base de Datos**

```sql
-- Conectar a la BD y ejecutar:

-- Ver estructura de la tabla usuarios
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'usuarios'
ORDER BY ordinal_position;

-- Resultado esperado:
-- column_name | data_type | is_nullable
-- ------------|-----------|------------
-- id          | uuid      | NO
-- email       | varchar   | NO
-- nombre      | varchar   | YES
-- rol         | varchar   | YES
-- taller_id   | uuid      | NO
-- activo      | boolean   | YES         ← Debe estar aquí
-- auth_id     | uuid      | YES         ← Debe estar aquí
-- created_at  | timestamp | YES
-- updated_at  | timestamp | YES

-- Ver usuarios creados
SELECT id, email, nombre, rol, activo, auth_id IS NOT NULL as tiene_auth_id
FROM usuarios;
```

---

## 🔍 SI AÚN HAY ERRORES

### Error: "auth_id cannot be null"

**Problema**: Usuarios antiguos en la BD no tienen `auth_id`.

**Solución**:

```sql
-- Opción 1: Eliminar usuarios antiguos (si es desarrollo)
DELETE FROM usuarios WHERE auth_id IS NULL;

-- Opción 2: Migrar usuarios antiguos (si es producción)
-- Requiere script personalizado para vincular con auth.users
```

---

### Error: "duplicate key value violates unique constraint"

**Problema**: Intento de crear usuario con email que ya existe.

**Solución**:

```sql
-- Ver usuarios duplicados
SELECT email, COUNT(*)
FROM usuarios
GROUP BY email
HAVING COUNT(*) > 1;

-- Eliminar duplicados (conserva el más reciente)
DELETE FROM usuarios a
WHERE id NOT IN (
  SELECT MAX(id) FROM usuarios b WHERE a.email = b.email
);
```

---

### Error: "relation auth.users does not exist"

**Problema**: La tabla `auth.users` de Supabase Auth no existe.

**Solución**:

```bash
# Si usas Supabase local, asegúrate de que esté corriendo
supabase start

# Verificar que el servicio de Auth esté activo
supabase status

# Resultado esperado:
# supabase_auth_api is running
```

---

## 📊 CAMBIOS REALIZADOS - RESUMEN

| Archivo | Cambio | Estado |
|---------|--------|--------|
| `supabase/migrations/20250126_fix_usuarios_missing_columns.sql` | Migración creada | ✅ Creado |
| `src/app/api/auth/registro/route.ts` | Añadido `auth_id` en insert | ✅ Actualizado |
| `src/middleware.ts` → `src/proxy.ts` | Renombrado | ✅ Renombrado |

---

## 🎯 PRÓXIMOS PASOS

Una vez aplicada la migración y verificado que funciona:

1. **Commit y push de los cambios**:

```bash
git add .
git commit -m "🔧 Fix: Añadir columnas faltantes en tabla usuarios y renombrar middleware

- Migración 20250126: Añadir activo y auth_id a usuarios
- Fix registro: Incluir auth_id al crear usuario
- Renombrar middleware.ts → proxy.ts (Next.js 15)
- Resolver error 'activo' column not found
- Resolver error dashboard métricas

Fixes #[issue_number]"

git push -u origin claude/refactor-saas-architecture-5fW7k
```

2. **Probar flujo completo**:
   - ✅ Registro de nuevo taller
   - ✅ Login con usuario creado
   - ✅ Dashboard carga métricas
   - ✅ Crear orden de trabajo
   - ✅ Crear cliente y vehículo

3. **Continuar con auditoría UX** (según `ANALISIS_FLUJO_USUARIO_Y_OPTIMIZACION.md`)

---

## 📞 SI NECESITAS AYUDA

**Errores comunes**:
- Error 500 en registro → Revisar logs del servidor (`npm run dev`)
- Dashboard no carga → Verificar que `auth_id` está poblado
- Warning de middleware → Verificar que `src/proxy.ts` existe

**Logs útiles**:
```bash
# Ver logs del servidor Next.js
# (Ya están en tu consola donde corre npm run dev)

# Ver logs de Supabase local
supabase logs
```

---

**Creado por**: Claude Code (Sonnet 4.5)
**Fecha**: 2026-01-26
**Objetivo**: Resolver errores críticos de base de datos y permitir registro/login
