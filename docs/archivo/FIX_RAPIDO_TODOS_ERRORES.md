# 🚨 SOLUCIÓN RÁPIDA: Todos los Errores Actuales

**Fecha**: 2026-01-26
**Estado**: 🔧 EN PROGRESO

---

## 🔴 PROBLEMAS ACTUALES

### 1. ❌ Proxy no funciona (CRÍTICO)
```
⨯ The file "./src/proxy.ts" must export a function named `proxy`
```

### 2. ❌ Usuarios sin auth_id (CRÍTICO)
```json
{
  "email": "dani@yopmail.com",
  "tiene_auth_id": false  // ← TODOS los usuarios así
}
```

### 3. ⚠️ Índice duplicado (IGNORABLE)
```
ERROR: relation "idx_usuarios_auth_id" already exists
```

---

## ✅ SOLUCIONES APLICADAS

### 1. **Proxy Corregido** ✅

**Archivo**: `src/proxy.ts`

**Cambio**: Renombrar función de `middleware` a `proxy`

```typescript
// ANTES
export async function middleware(request: NextRequest) {

// DESPUÉS ✅
export async function proxy(request: NextRequest) {

// + Export default
export default proxy
```

**Estado**: ✅ CORREGIDO

---

### 2. **Script de Vinculación Creado** ✅

**Archivo**: `supabase/migrations/20250126_vincular_usuarios_existentes.sql`

Este script vincula automáticamente usuarios existentes con `auth.users` por email.

**Estado**: ✅ CREADO (pendiente aplicar)

---

## 🚀 INSTRUCCIONES: Resolver TODO

### PASO 1: Reiniciar Servidor (Fix Proxy)

```bash
# 1. Detener npm run dev (Ctrl+C)

# 2. Limpiar cache
rm -rf .next

# 3. Reiniciar
npm run dev
```

**Resultado esperado**:
- ✅ No debe aparecer error de proxy
- ✅ Dashboard debe cargar (aunque sin datos por auth_id)

---

### PASO 2: Vincular Usuarios Existentes

Tienes **5 usuarios sin auth_id**. Necesitas vincularlos.

#### Opción A: Vincular Automáticamente (Recomendado)

**Requisito**: Los emails deben existir en `auth.users`

```sql
-- Ejecuta en Supabase SQL Editor o psql:

-- 1. Ver usuarios en auth.users
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC;

-- 2. Si hay usuarios ahí, vincular automáticamente:
UPDATE usuarios u
SET auth_id = au.id
FROM auth.users au
WHERE u.email = au.email
  AND u.auth_id IS NULL;

-- 3. Verificar resultado:
SELECT
  COUNT(*) FILTER (WHERE auth_id IS NOT NULL) as vinculados,
  COUNT(*) FILTER (WHERE auth_id IS NULL) as sin_vincular
FROM usuarios;
```

**Resultado esperado**:
```
vinculados | sin_vincular
-----------|-------------
     5     |      0        ← TODOS vinculados
```

---

#### Opción B: Limpiar Usuarios Huérfanos (Si no hay en auth.users)

Si los usuarios NO existen en `auth.users`, elimínalos:

```sql
-- ⚠️ CUIDADO: Esto es DESTRUCTIVO

-- Ver usuarios sin auth
SELECT id, email, nombre
FROM usuarios
WHERE auth_id IS NULL;

-- Si estás seguro, eliminar:
DELETE FROM usuarios WHERE auth_id IS NULL;
```

Luego, esos usuarios deben **registrarse de nuevo** en:
`http://localhost:3000/auth/registro`

---

#### Opción C: Crear Auth Manualmente (Si quieres conservar usuarios)

Si quieres conservar los usuarios pero no tienen auth:

```typescript
// En Supabase Dashboard → Authentication → Users
// Click "Add user" para cada email:

// 1. testd@yopmail.com
// 2. testde@yopmail.com
// 3. ttest@yopmail.com
// 4. dani@yopmail.com
// 5. <email-del-taller>

// Luego ejecuta el UPDATE del Opción A para vincularlos
```

---

### PASO 3: Verificar que Funciona

```bash
# 1. Reiniciar servidor
npm run dev

# 2. Ir a login
http://localhost:3000/auth/login

# 3. Intentar login con usuario existente:
Email: dani@yopmail.com
Password: [tu password]

# 4. Resultado esperado:
✅ Login exitoso
✅ Redirige a /dashboard
✅ Dashboard carga métricas
✅ No hay errores en consola
```

---

### PASO 4: Probar Registro de Usuario Nuevo

```bash
# 1. Ir a registro
http://localhost:3000/auth/registro

# 2. Crear nuevo taller:
Nombre Taller: Taller Test Nuevo
CIF: 12345678B
Nombre: Usuario Test
Email: nuevo@yopmail.com
Password: test123456

# 3. Verificar en consola del servidor:
✅ Usuario Auth creado: [uuid]
✅ Taller creado: [uuid]
✅ Usuario vinculado: [uuid]  ← CON auth_id incluido
🎉 Registro completado

# 4. Verificar en BD:
SELECT id, email, auth_id IS NOT NULL as tiene_auth_id
FROM usuarios
WHERE email = 'nuevo@yopmail.com';

# Resultado esperado:
# email              | tiene_auth_id
# -------------------|---------------
# nuevo@yopmail.com  | true          ← ✅ TRUE
```

---

## 🔍 DEBUGGING: Verificar Estado Actual

### Ver todos los usuarios y su estado

```sql
SELECT
  u.id,
  u.email,
  u.nombre,
  u.auth_id,
  CASE
    WHEN u.auth_id IS NOT NULL THEN '✅ Vinculado'
    ELSE '❌ Sin vincular'
  END as estado,
  u.created_at
FROM usuarios u
ORDER BY u.created_at DESC;
```

### Ver usuarios en auth.users

```sql
SELECT
  id as auth_id,
  email,
  created_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users
ORDER BY created_at DESC;
```

### Comparar: ¿Cuáles faltan?

```sql
-- Usuarios en 'usuarios' pero NO en 'auth.users'
SELECT u.email
FROM usuarios u
LEFT JOIN auth.users au ON u.email = au.email
WHERE au.id IS NULL;
```

---

## 📊 RESUMEN DE CAMBIOS

| Archivo | Cambio | Estado |
|---------|--------|--------|
| `src/proxy.ts` | Renombrar función `middleware` → `proxy` | ✅ Aplicado |
| `src/proxy.ts` | Añadir `export default proxy` | ✅ Aplicado |
| `supabase/migrations/20250126_vincular_usuarios_existentes.sql` | Script de vinculación | ✅ Creado |
| Base de Datos | Vincular usuarios con auth_id | ⏳ Pendiente |

---

## 🎯 CHECKLIST FINAL

Después de seguir los pasos:

- [ ] ✅ Servidor inicia sin error de proxy
- [ ] ✅ Usuarios existentes tienen `auth_id` (o fueron eliminados)
- [ ] ✅ Login funciona con usuario existente
- [ ] ✅ Registro de nuevo usuario funciona
- [ ] ✅ Dashboard carga métricas correctamente
- [ ] ✅ No hay errores en consola del navegador
- [ ] ✅ No hay errores en consola del servidor

---

## 🔥 SOLUCIÓN MÁS RÁPIDA (Si quieres empezar de cero)

Si prefieres empezar de cero sin conservar usuarios:

```sql
-- 1. Eliminar TODOS los usuarios de la tabla
DELETE FROM usuarios;

-- 2. Eliminar usuarios de auth (Supabase Dashboard → Authentication → Users)
-- Click en cada usuario → Delete

-- 3. Reiniciar servidor
npm run dev

-- 4. Registrarse de nuevo
http://localhost:3000/auth/registro
```

**Ventaja**: Limpio y seguro que funciona
**Desventaja**: Pierdes datos de prueba existentes

---

## 📞 SI ALGO FALLA

### Error: "No rows in result set"
→ Usuario no existe en `auth.users`, debe registrarse de nuevo

### Error: "invalid input syntax for type uuid"
→ auth_id está corrupto, ejecuta: `UPDATE usuarios SET auth_id = NULL WHERE email = '[email]'`

### Dashboard no carga métricas
→ Verifica: `SELECT auth_id FROM usuarios WHERE email = '[tu_email]'` debe retornar un UUID válido

---

**Creado por**: Claude Code (Sonnet 4.5)
**Fecha**: 2026-01-26
**Siguiente**: Vincular usuarios y probar login
