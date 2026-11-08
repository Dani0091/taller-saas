# 🚀 GUÍA COMPLETA: Arrancar Local y Migrar Producción

**Fecha**: 2026-01-26
**Objetivo**: Solucionar TODOS los errores y tener un plan seguro para producción

---

## ✅ PARTE 1: SOLUCIONES APLICADAS (Local)

### 1. **Proxy.ts Corregido** ✅

**Problema**:
```
⨯ The Proxy file "/proxy" must export a function named `proxy` or a default function.
```

**Solución Aplicada**:
```typescript
// src/proxy.ts

// ANTES (INCORRECTO)
export async function proxy(request: NextRequest) {
  ...
}
export default proxy  // ← Separado

// DESPUÉS (CORRECTO) ✅
export default async function proxy(request: NextRequest) {
  ...
}
// Sin export default separado
```

**Estado**: ✅ CORREGIDO

---

### 2. **Columnas de BD Añadidas** ✅

**Problema**:
```
Could not find the 'activo' column of 'usuarios' in the schema cache
```

**Migración**:
```sql
-- supabase/migrations/20250126_fix_usuarios_missing_columns.sql

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE;

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_usuarios_auth_id ON usuarios(auth_id);
```

**Estado**: ✅ MIGRACIÓN CREADA (pendiente aplicar)

---

### 3. **Registro Actualizado** ✅

**Código corregido**:
```typescript
// src/app/api/auth/registro/route.ts:169

const { data: usuarioData, error: usuarioError } = await supabaseAdmin
  .from('usuarios')
  .insert({
    auth_id: authData.user.id,  // ← AÑADIDO: Vincular con Auth
    email: email_usuario,
    nombre: nombre_usuario,
    rol: 'admin',
    taller_id: taller.id,
    activo: true,
  })
```

**Estado**: ✅ CORREGIDO

---

## 🚀 PARTE 2: ARRANCAR EN LOCAL (3 Pasos)

### PASO 1: Limpiar Cache Completamente

```bash
# 1. Detener servidor (Ctrl+C)

# 2. Eliminar cache de Next.js
rm -rf .next

# 3. Eliminar node_modules/.cache (opcional)
rm -rf node_modules/.cache

# 4. Reiniciar
npm run dev
```

**Resultado esperado**:
```
✓ Starting...
✓ Ready in 3.2s
○ Compiling / ...
```

**SIN ERRORES de proxy** ✅

---

### PASO 2: Aplicar Migración de BD

Ejecuta este SQL en tu BD local:

```sql
-- 1. Añadir columnas faltantes
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE;

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_usuarios_auth_id ON usuarios(auth_id);

-- 2. Actualizar usuarios existentes
UPDATE usuarios
SET activo = TRUE
WHERE activo IS NULL;
```

**Cómo ejecutar**:

#### Opción A: Supabase Cloud Dashboard
```
1. https://app.supabase.com → Tu proyecto
2. SQL Editor → New Query
3. Pegar el SQL de arriba
4. Click "Run" ▶️
```

#### Opción B: Supabase CLI Local
```bash
cd /home/user/taller-saas
supabase db push
```

#### Opción C: psql Directo
```bash
psql -h localhost -U postgres -d postgres < supabase/migrations/20250126_fix_usuarios_missing_columns.sql
```

---

### PASO 3: Vincular Usuarios Existentes

Tienes 5 usuarios sin `auth_id`:
```json
[
  { "email": "testd@yopmail.com", "tiene_auth_id": false },
  { "email": "testde@yopmail.com", "tiene_auth_id": false },
  { "email": "ttest@yopmail.com", "tiene_auth_id": false },
  { "email": "dani@yopmail.com", "tiene_auth_id": false },
  { "email": "<email-del-taller>", "tiene_auth_id": false }
]
```

**Elige una opción:**

#### Opción A: Vincular Automáticamente (Si tienen Auth)

```sql
-- 1. Verificar si existen en auth.users
SELECT id, email FROM auth.users;

-- 2. Si existen ahí, vincular por email:
UPDATE usuarios u
SET auth_id = au.id
FROM auth.users au
WHERE u.email = au.email
  AND u.auth_id IS NULL;

-- 3. Verificar:
SELECT email, auth_id IS NOT NULL as vinculado FROM usuarios;
```

**Resultado esperado**: Todos con `vinculado: true`

---

#### Opción B: Eliminar y Re-registrar (Recomendado para Local)

```sql
-- 1. Eliminar usuarios de prueba sin auth
DELETE FROM usuarios WHERE auth_id IS NULL;

-- 2. También eliminar sus talleres (opcional)
-- Solo si son talleres de prueba sin datos importantes
DELETE FROM talleres WHERE id IN (
  SELECT taller_id FROM usuarios WHERE auth_id IS NULL
);
```

Luego, cada usuario debe **registrarse de nuevo**:
```
http://localhost:3000/auth/registro
```

---

### ✅ VERIFICAR QUE FUNCIONA

Después de los 3 pasos:

#### 1. Servidor arranca sin errores

```bash
npm run dev

# Debe mostrar:
✓ Ready in 3.2s
# SIN errores de proxy
# SIN errores de BD
```

#### 2. Registro funciona

```
http://localhost:3000/auth/registro

Nombre Taller: Taller Test Local
CIF: 12345678Z
Email: test@yopmail.com
Password: test123456
```

**Consola del servidor**:
```
✅ Usuario Auth creado: [uuid]
✅ Taller creado: [uuid]
✅ Usuario vinculado: [uuid]  ← CON auth_id incluido
🎉 Registro completado
```

#### 3. Login funciona

```
http://localhost:3000/auth/login

Email: test@yopmail.com
Password: test123456
```

**Resultado**:
- ✅ Redirige a `/dashboard`
- ✅ Dashboard carga métricas
- ✅ No hay errores

#### 4. Verificar en BD

```sql
SELECT
  id,
  email,
  auth_id IS NOT NULL as tiene_auth_id,
  activo
FROM usuarios
ORDER BY created_at DESC;

-- TODOS deben tener:
-- tiene_auth_id: true ✅
-- activo: true ✅
```

---

## 🏭 PARTE 3: MIGRAR A PRODUCCIÓN (SIN PERDER USUARIOS)

### 🔒 IMPORTANTE: Tus Usuarios de Producción están SEGUROS

**Los usuarios de producción NO se han perdido**. Este problema es solo en desarrollo local.

**Producción sigue funcionando** con la versión anterior hasta que hagas deploy de los cambios.

---

### 📋 PLAN DE MIGRACIÓN SEGURO (5 Fases)

#### FASE 1: AUDITORÍA PRE-MIGRACIÓN

Ejecuta en producción (Supabase Dashboard):

```sql
-- 1. Contar usuarios actuales
SELECT COUNT(*) as total_usuarios FROM usuarios;

-- 2. Ver estructura de tabla
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'usuarios'
ORDER BY ordinal_position;

-- 3. Ver usuarios en auth.users
SELECT COUNT(*) as total_auth FROM auth.users;

-- 4. Comparar emails
SELECT
  (SELECT COUNT(*) FROM usuarios) as usuarios_bd,
  (SELECT COUNT(*) FROM auth.users) as usuarios_auth,
  (SELECT COUNT(*) FROM usuarios u INNER JOIN auth.users au ON u.email = au.email) as coincidencias;
```

**Anota los resultados** para verificar después que no se perdió nada.

---

#### FASE 2: MIGRACIÓN DE ESQUEMA

**⏰ Hacerlo en horario de bajo tráfico**

```sql
-- TRANSACCIÓN ATÓMICA (todo o nada)
BEGIN;

-- 1. Añadir columnas nuevas
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE;

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Crear índice
CREATE INDEX IF NOT EXISTS idx_usuarios_auth_id ON usuarios(auth_id);

-- 3. Actualizar usuarios existentes
UPDATE usuarios
SET activo = TRUE
WHERE activo IS NULL;

-- 4. Vincular automáticamente por email
UPDATE usuarios u
SET auth_id = au.id
FROM auth.users au
WHERE u.email = au.email
  AND u.auth_id IS NULL;

-- 5. Verificar resultado
DO $$
DECLARE
  usuarios_sin_vincular INTEGER;
BEGIN
  SELECT COUNT(*) INTO usuarios_sin_vincular
  FROM usuarios
  WHERE auth_id IS NULL;

  IF usuarios_sin_vincular > 0 THEN
    RAISE EXCEPTION '⚠️ Hay % usuarios sin vincular. Revisa antes de continuar.', usuarios_sin_vincular;
  END IF;

  RAISE NOTICE '✅ Todos los usuarios vinculados correctamente';
END $$;

COMMIT;
-- Si algo falla, hace ROLLBACK automático
```

**Resultado esperado**:
```
✅ Todos los usuarios vinculados correctamente
```

Si aparece el error "Hay X usuarios sin vincular", ejecuta:

```sql
ROLLBACK;  -- Deshacer cambios

-- Ver qué usuarios no se vincularon
SELECT u.email
FROM usuarios u
LEFT JOIN auth.users au ON u.email = au.email
WHERE au.id IS NULL;

-- Decidir qué hacer con ellos (ver FASE 3)
```

---

#### FASE 3: USUARIOS HUÉRFANOS (Si hay)

Si algunos usuarios NO se pudieron vincular, tienes 3 opciones:

##### Opción A: Crear Auth Manualmente

```
1. Ir a Supabase Dashboard → Authentication → Users
2. Para cada email sin vincular, click "Add user"
3. Email: [email del usuario]
4. Password: [temporal, que luego puedan cambiar]
5. Marcar "Auto Confirm User"
6. Enviar email de recuperación al usuario
7. Re-ejecutar el UPDATE para vincular
```

##### Opción B: Contactar a Usuarios

```
1. Exportar lista de emails sin auth:
   SELECT email FROM usuarios WHERE auth_id IS NULL;

2. Enviarles un email:
   "Hemos actualizado el sistema. Por favor, regístrate de nuevo en [URL]/auth/registro"

3. Cuando se registren, se vincularán automáticamente
```

##### Opción C: Eliminar Cuentas Inactivas

```sql
-- Solo si son cuentas de prueba o inactivas

-- Ver cuándo se crearon
SELECT email, created_at
FROM usuarios
WHERE auth_id IS NULL
ORDER BY created_at DESC;

-- Si son muy antiguas, eliminar:
DELETE FROM usuarios
WHERE auth_id IS NULL
  AND created_at < NOW() - INTERVAL '6 months';
```

---

#### FASE 4: DEPLOY DE CÓDIGO NUEVO

Una vez que la BD está migrada:

```bash
# 1. En tu local, asegúrate de que todo funciona
npm run build
npm start

# 2. Hacer merge a main
git checkout main
git merge claude/refactor-saas-architecture-5fW7k

# 3. Push a producción
git push origin main

# 4. Deploy automático (Vercel/Netlify)
# O manual según tu hosting
```

**Archivos que se deployarán**:
- ✅ `src/proxy.ts` (corregido)
- ✅ `src/app/api/auth/registro/route.ts` (con auth_id)
- ✅ Todas las acciones refactorizadas
- ✅ Componentes optimizados

---

#### FASE 5: VERIFICACIÓN POST-DEPLOY

Después del deploy, verifica:

```sql
-- 1. Todos los usuarios tienen auth_id
SELECT
  COUNT(*) FILTER (WHERE auth_id IS NOT NULL) as vinculados,
  COUNT(*) FILTER (WHERE auth_id IS NULL) as sin_vincular,
  COUNT(*) as total
FROM usuarios;

-- Resultado esperado: sin_vincular = 0

-- 2. Nuevos registros tienen auth_id automáticamente
SELECT id, email, auth_id, created_at
FROM usuarios
ORDER BY created_at DESC
LIMIT 5;
```

**Pruebas funcionales**:
- [ ] Registro de nuevo taller
- [ ] Login con usuario existente
- [ ] Dashboard carga métricas
- [ ] Crear orden de trabajo
- [ ] Crear cliente y vehículo
- [ ] Generar factura

---

## 🔍 TROUBLESHOOTING

### Error: "Hay X usuarios sin vincular"

**Causa**: Emails en `usuarios` que NO existen en `auth.users`

**Solución**:
1. Ver cuáles son: `SELECT email FROM usuarios WHERE auth_id IS NULL`
2. Crear sus cuentas en Auth (Dashboard → Users → Add user)
3. Re-ejecutar el UPDATE para vincular

---

### Error: "Cannot add foreign key constraint"

**Causa**: Hay `auth_id` con UUIDs que no existen en `auth.users`

**Solución**:
```sql
-- Ver cuáles son inválidos
SELECT u.email, u.auth_id
FROM usuarios u
LEFT JOIN auth.users au ON u.auth_id = au.id
WHERE u.auth_id IS NOT NULL
  AND au.id IS NULL;

-- Limpiar auth_id inválidos
UPDATE usuarios u
SET auth_id = NULL
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users au WHERE au.id = u.auth_id
);

-- Re-vincular correctamente
UPDATE usuarios u
SET auth_id = au.id
FROM auth.users au
WHERE u.email = au.email
  AND u.auth_id IS NULL;
```

---

### Error: "Dashboard no carga métricas"

**Causa**: Server Action busca por `auth_id` que es NULL

**Solución**:
```sql
-- Verificar usuario actual
SELECT auth.uid();  -- Copia este UUID

-- Ver si el usuario tiene auth_id
SELECT id, email, auth_id
FROM usuarios
WHERE auth_id = '[UUID copiado]';

-- Si no aparece, vincular manualmente
UPDATE usuarios
SET auth_id = '[UUID copiado]'
WHERE email = '[tu email]';
```

---

### Error: "Login funciona pero dashboard error"

**Causa**: RLS (Row Level Security) busca por `auth_id`

**Solución**:
```sql
-- Verificar que las policies usan auth_id
SELECT schemaname, tablename, policyname, qual
FROM pg_policies
WHERE tablename = 'usuarios';

-- Si usan email en lugar de auth_id, actualizarlas:
DROP POLICY IF EXISTS "Ver usuarios del taller" ON usuarios;
CREATE POLICY "Ver usuarios del taller" ON usuarios
  FOR SELECT USING (
    taller_id IN (SELECT taller_id FROM usuarios WHERE auth_id = auth.uid())
  );
```

---

## 📊 CHECKLIST FINAL

### Local ✅

- [ ] Servidor arranca sin error de proxy
- [ ] Migración de BD aplicada (activo + auth_id)
- [ ] Usuarios existentes vinculados O eliminados
- [ ] Registro de nuevo usuario funciona
- [ ] Login funciona
- [ ] Dashboard carga métricas
- [ ] Sin errores en consola

### Producción ✅

- [ ] Auditoría pre-migración ejecutada
- [ ] Migración de esquema aplicada en horario de bajo tráfico
- [ ] Usuarios huérfanos resueltos (si hay)
- [ ] Código nuevo deployado
- [ ] Verificación post-deploy completada
- [ ] Pruebas funcionales OK
- [ ] Monitoreo de errores activo (primeras 24h)

---

## 📞 SOPORTE

Si algo falla durante la migración de producción:

### ROLLBACK RÁPIDO

```sql
-- Si la migración falló a mitad
BEGIN;

-- Eliminar columnas añadidas
ALTER TABLE usuarios DROP COLUMN IF EXISTS activo;
ALTER TABLE usuarios DROP COLUMN IF EXISTS auth_id;
DROP INDEX IF EXISTS idx_usuarios_auth_id;

COMMIT;
```

Luego, **revert el deploy** a la versión anterior.

---

## 🎯 RESUMEN EJECUTIVO

| Etapa | Estado | Tiempo Estimado |
|-------|--------|-----------------|
| **Local: Fix Proxy** | ✅ Listo | 5 minutos |
| **Local: Migración BD** | ⏳ Pendiente | 10 minutos |
| **Local: Vincular Usuarios** | ⏳ Pendiente | 5 minutos |
| **Producción: Auditoría** | ⏳ Futuro | 15 minutos |
| **Producción: Migración** | ⏳ Futuro | 30 minutos |
| **Producción: Deploy** | ⏳ Futuro | 15 minutos |
| **Producción: Verificación** | ⏳ Futuro | 30 minutos |

**Total Local**: ~20 minutos
**Total Producción**: ~90 minutos

---

**Creado por**: Claude Code (Sonnet 4.5)
**Fecha**: 2026-01-26
**Objetivo**: Arrancar local Y migrar producción sin perder usuarios
