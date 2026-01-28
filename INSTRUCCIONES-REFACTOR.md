# 🚀 Instrucciones Post-Refactor - Taller SaaS

## ✅ Cambios Completados Automáticamente

### 1. Proxy Fix (Next.js 16)
- ✅ Archivo `src/proxy.ts` corregido con `export default async function`
- ✅ Cache `.next` eliminado
- ✅ No hay archivo `middleware.ts` conflictivo

### 2. Build TypeScript
- ✅ 50+ errores de TypeScript corregidos
- ✅ Build exitoso (61 páginas generadas)
- ✅ 0 errores de compilación

### 3. Auth Fallback
- ✅ 27 server actions actualizadas con `obtenerUsuarioConFallback()`
- ✅ Soporta usuarios por `auth_id` (nuevo) y `email` (legacy)
- ✅ Auto-reparación de usuarios antiguos

---

## 🔴 ACCIÓN REQUERIDA: Aplicar Migraciones SQL

**IMPORTANTE**: La aplicación NO funcionará correctamente hasta que apliques las migraciones SQL a tu base de datos de Supabase.

### Paso 1: Ir a Supabase Dashboard

1. Abre tu navegador y ve a: https://supabase.com/dashboard
2. Selecciona tu proyecto de taller-saas
3. En el menú lateral, haz clic en **SQL Editor**

### Paso 2: Ejecutar Migraciones

1. Haz clic en **New Query**
2. Copia **TODO** el contenido del archivo `migraciones-refactor.sql`
3. Pégalo en el editor SQL
4. Haz clic en **Run** (o presiona Ctrl+Enter)

### Paso 3: Verificar que las Migraciones Funcionaron

Ejecuta estas queries en el SQL Editor para verificar:

```sql
-- 1. Verificar que usuarios tienen auth_id
SELECT COUNT(*) as usuarios_sin_auth_id
FROM usuarios
WHERE auth_id IS NULL;
-- Resultado esperado: 0 (todos tienen auth_id)

-- 2. Verificar que talleres tienen configuración
SELECT COUNT(*) as talleres_sin_config
FROM talleres t
LEFT JOIN configuracion_taller c ON t.id = c.taller_id
WHERE c.id IS NULL;
-- Resultado esperado: 0 (todos tienen config)

-- 3. Verificar que talleres tienen serie de facturación
SELECT COUNT(*) as talleres_sin_serie
FROM talleres t
LEFT JOIN series_facturacion s ON t.id = s.taller_id
WHERE s.id IS NULL;
-- Resultado esperado: 0 (todos tienen serie)
```

---

## 📋 ¿Qué Hacen las Migraciones?

### 1. Tabla `usuarios`
- Agrega columna `auth_id` para vincular con Supabase Auth
- Agrega columna `activo` para soft-delete
- Vincula automáticamente usuarios existentes por email

### 2. Tabla `series_facturacion`
- Nueva tabla para gestionar numeración de facturas
- Cada taller tiene su propia serie (FA-001, FA-002, etc.)

### 3. Tabla `configuracion_taller`
- Nueva tabla para centralizar configuración del taller
- Tarifa hora, IVA, datos fiscales, personalización

---

## 🎯 Siguiente Paso: Probar la Aplicación

Una vez aplicadas las migraciones, ejecuta:

```bash
npm run dev
```

### Verificaciones en la App:

1. **Login**: Prueba iniciar sesión con un usuario existente
   - Debería funcionar sin problemas
   - El auth fallback detectará si es usuario legacy y lo actualizará

2. **Dashboard**: Verifica que carga correctamente
   - Sin errores 500
   - Sin errores de "usuario no encontrado"

3. **Crear Orden**: Prueba crear una nueva orden de trabajo
   - El formulario debe cargar
   - Puedes seleccionar cliente y vehículo

4. **Crear Factura**: Prueba crear una factura
   - Debe generar número automático (FA-001)
   - PDF debe generarse correctamente

---

## ❌ Problemas Comunes

### Error: "Usuario no encontrado" al Login

**Causa**: Las migraciones SQL no se aplicaron o fallaron

**Solución**:
1. Verifica que ejecutaste TODO el archivo `migraciones-refactor.sql`
2. Ejecuta las queries de verificación del Paso 3
3. Si `usuarios_sin_auth_id > 0`, ejecuta solo esta parte:

```sql
UPDATE usuarios u
SET auth_id = au.id
FROM auth.users au
WHERE u.email = au.email
  AND u.auth_id IS NULL;
```

### Error: "The Proxy file '/proxy' must export a function named proxy"

**Causa**: Cache corrupto o export incorrecto

**Solución**:
```bash
rm -rf .next
npm run dev
```

### Error 500 en Rutas API

**Causa**: Falta tabla `configuracion_taller` o `series_facturacion`

**Solución**:
1. Verifica que ejecutaste las migraciones completas
2. Ejecuta las queries de verificación

---

## 📊 Arquitectura Post-Refactor

```
src/
├── actions/              # Server Actions (27 con fallback)
│   ├── citas/
│   ├── clientes/
│   ├── facturas/
│   ├── ordenes/
│   └── vehiculos/
├── lib/
│   └── auth/
│       └── obtener-usuario-fallback.ts  # 🔑 Auth híbrido
├── proxy.ts              # ✅ Export default (Next.js 16)
└── types/
    └── formularios.ts    # Tipos unificados
```

### Flujo de Autenticación:

1. Usuario hace login → Supabase Auth crea sesión
2. Proxy intercepta request → Refresca sesión
3. Server Action → `obtenerUsuarioConFallback()`
   - Intento 1: Buscar por `auth_id` ✅
   - Intento 2: Buscar por `email` (usuarios legacy) ✅
   - Si encuentra por email: Actualiza `auth_id` automáticamente

---

## 🎉 Resumen

✅ Proxy corregido (export default)
✅ Build exitoso (0 errores TypeScript)
✅ Auth fallback implementado
✅ Migraciones SQL preparadas

🔴 **PENDIENTE**: Aplicar migraciones SQL en Supabase Dashboard

Una vez aplicadas las migraciones, la aplicación estará 100% funcional con la nueva arquitectura refactorizada.

---

**Archivo de Migraciones**: `/home/user/taller-saas/migraciones-refactor.sql`
**Instrucciones**: Este archivo (INSTRUCCIONES-REFACTOR.md)
