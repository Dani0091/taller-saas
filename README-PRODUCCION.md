# 🚀 TALLER SaaS - GUÍA DE PRODUCCIÓN

**Fecha**: 2026-01-29
**Branch**: `claude/refactor-saas-architecture-5fW7k`
**Estado**: ✅ LISTO PARA PRODUCCIÓN

---

## 📋 TABLA DE CONTENIDOS

1. [Inicio Rápido](#-inicio-rápido)
2. [Migraciones Necesarias](#-migraciones-necesarias)
3. [Configuración](#-configuración)
4. [Arquitectura del Sistema](#-arquitectura-del-sistema)
5. [Generador de Facturas](#-generador-de-facturas)
6. [Seguridad Multi-Tenant](#-seguridad-multi-tenant)
7. [Troubleshooting](#-troubleshooting)
8. [Testing](#-testing)
9. [Deploy](#-deploy)
10. [Mantenimiento](#-mantenimiento)

---

## ⚡ INICIO RÁPIDO

### Prerrequisitos

```bash
Node.js >= 18
npm >= 9
PostgreSQL >= 15 (Supabase)
```

### Instalación Local

```bash
# 1. Clonar repositorio
git clone <repo-url>
cd taller-saas

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales de Supabase

# 4. Aplicar migraciones (ver sección siguiente)

# 5. Arrancar desarrollo
npm run dev

# Abrir http://localhost:3000
```

---

## 🗄️ MIGRACIONES NECESARIAS

### CRÍTICO: Ejecutar Antes de Usar en Producción

#### 1. Migración de Series de Facturación

**Archivo**: `supabase/migrations/001_fix_series_facturacion.sql`

**Qué hace**: Añade columnas `serie` y `año` necesarias para el RPC de numeración.

```bash
# En Supabase SQL Editor, ejecutar:
```

```sql
-- Copiar y pegar contenido completo de:
-- supabase/migrations/001_fix_series_facturacion.sql
```

**Verificación**:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'series_facturacion'
  AND column_name IN ('serie', 'año');

-- Debe devolver 2 filas
```

#### 2. RPC de Numeración Atómica

**Archivo**: `supabase/migrations/rpc_asignar_numero_factura.sql`

**Qué hace**: Crea función PostgreSQL que asigna números correlativos con lock FOR UPDATE.

```sql
-- Copiar y pegar contenido completo de:
-- supabase/migrations/rpc_asignar_numero_factura.sql
```

**Verificación**:
```sql
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'asignar_numero_factura';

-- Debe devolver 1 fila
```

#### 3. Crear Series Iniciales

**IMPORTANTE**: Reemplazar `TU-TALLER-ID` con el UUID real.

```sql
-- Obtener el UUID de tu taller
SELECT id, nombre FROM talleres;

-- Crear series para el taller
INSERT INTO series_facturacion (taller_id, serie, año, prefijo, nombre, ultimo_numero, activa, es_predeterminada)
VALUES
  ('TU-TALLER-ID', 'F', 2026, 'F', 'Facturas Ordinarias', 0, TRUE, TRUE),
  ('TU-TALLER-ID', 'P', 2026, 'P', 'Proformas', 0, TRUE, FALSE),
  ('TU-TALLER-ID', 'R', 2026, 'R', 'Rectificativas', 0, TRUE, FALSE)
ON CONFLICT (taller_id, serie, año) DO NOTHING;
```

---

## ⚙️ CONFIGURACIÓN

### Variables de Entorno

**Archivo**: `.env.local`

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### Configuración del Taller

Tabla `taller_config`:

```sql
INSERT INTO taller_config (taller_id, iva_general, retencion_defecto)
VALUES ('TU-TALLER-ID', 21, 0);
```

---

## 🏗️ ARQUITECTURA DEL SISTEMA

### Arquitectura Limpia (Clean Architecture)

```
┌─────────────────────────────────────┐
│         UI Layer (Next.js)          │
│  src/app/dashboard/**               │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│      Application Layer              │
│  src/application/use-cases/**       │
│  src/actions/** (Server Actions)    │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│       Domain Layer                  │
│  src/domain/entities/**             │
│  src/domain/value-objects/**        │
│  src/domain/types/**                │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│    Infrastructure Layer             │
│  src/infrastructure/repositories/** │
│  src/lib/supabase/**                │
└─────────────────────────────────────┘
```

### Capas y Responsabilidades

#### 1. UI Layer
- **Ubicación**: `src/app/dashboard/**`
- **Tecnología**: Next.js 15, React Server Components, Client Components
- **Responsabilidad**: Presentación e interacción con el usuario

#### 2. Application Layer
- **Ubicación**: `src/application/use-cases/**`, `src/actions/**`
- **Responsabilidad**: Orquestación de casos de uso, validación, server actions

#### 3. Domain Layer
- **Ubicación**: `src/domain/**`
- **Responsabilidad**: Lógica de negocio, entidades, value objects, reglas

#### 4. Infrastructure Layer
- **Ubicación**: `src/infrastructure/**`
- **Responsabilidad**: Comunicación con BD, APIs externas, servicios

---

## 💰 GENERADOR DE FACTURAS

### Sistema Standalone (Recomendado para Producción)

**Ubicación**: `/dashboard/facturas/generar`

#### Características

✅ **Numeración Automática Correlativa**
- Por serie (F, P, R, S)
- Por año (reseteo automático cada año)
- Atómica (FOR UPDATE lock en PostgreSQL)
- Multi-tenant (cada taller tiene su contador)

✅ **Flujo Simplificado**
- Todo en una página
- No requiere crear borrador primero
- Asigna número solo al emitir
- Genera PDF automáticamente

✅ **Configuración Completa**
- Selección de serie
- Datos del cliente (auto-creación si no existe)
- Líneas dinámicas con IVA configurable
- Descuentos por línea
- Notas y condiciones de pago

#### Ejemplo de Uso

```typescript
// URL
/dashboard/facturas/generar

// Flow
1. Seleccionar serie: F (Facturas Ordinarias)
2. Datos cliente:
   - Nombre: "Cliente SL"
   - NIF: "B12345678"
   - Email: cliente@email.com (opcional)
3. Añadir líneas:
   - Descripción: "Cambio aceite"
   - Cantidad: 1
   - Precio: 50€
   - IVA: 21%
4. Click "Emitir Factura"
5. Sistema asigna: F-2026-000001
6. PDF se abre automáticamente
7. Factura guardada en BD
```

#### Numeración Correlativa

```
Serie F en 2026:
- Primera factura:  F-2026-000001
- Segunda factura:  F-2026-000002
- Tercera factura:  F-2026-000003

Serie P en 2026:
- Primera factura:  P-2026-000001  (contador independiente)
- Segunda factura:  P-2026-000002

Serie R en 2026:
- Primera factura:  R-2026-000001  (contador independiente)
```

#### Backend API

**Endpoint**: `/api/facturas/generar-standalone`

**Método**: POST

**Body**:
```json
{
  "serie": "F",
  "clienteNombre": "Cliente SL",
  "clienteNIF": "B12345678",
  "clienteDireccion": "Calle Principal, 123",
  "clienteEmail": "cliente@email.com",
  "fechaEmision": "2026-01-29",
  "fechaVencimiento": null,
  "lineas": [
    {
      "descripcion": "Cambio aceite",
      "cantidad": 1,
      "precioUnitario": 50,
      "descuento": 0,
      "iva": 21
    }
  ],
  "notas": "Forma de pago: transferencia"
}
```

**Response**:
```json
{
  "success": true,
  "facturaId": "uuid",
  "numeroFactura": "F-2026-000001",
  "serie": "F",
  "total": 60.5
}
```

#### Seguridad del RPC

```sql
CREATE OR REPLACE FUNCTION asignar_numero_factura(
  p_taller_id UUID,
  p_serie TEXT,
  p_año INTEGER
) RETURNS JSON AS $$
DECLARE
  v_ultimo_numero INTEGER;
  v_siguiente_numero INTEGER;
BEGIN
  -- FOR UPDATE: Lock de fila hasta fin de transacción
  SELECT ultimo_numero INTO v_ultimo_numero
  FROM series_facturacion
  WHERE taller_id = p_taller_id
    AND serie = p_serie
    AND año = p_año
  FOR UPDATE;  -- 🔒 GARANTIZA ATOMICIDAD

  v_siguiente_numero := v_ultimo_numero + 1;

  UPDATE series_facturacion
  SET ultimo_numero = v_siguiente_numero
  WHERE taller_id = p_taller_id
    AND serie = p_serie
    AND año = p_año;

  RETURN json_build_object(
    'numero_completo', p_serie || '-' || p_año || '-' || LPAD(v_siguiente_numero::TEXT, 6, '0'),
    'numero', v_siguiente_numero
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 🔒 SEGURIDAD MULTI-TENANT

### Arquitectura de 3 Capas

#### 1. Server Actions (Primera Línea)

```typescript
// src/actions/**/accion.ts
export async function miAction() {
  // ✅ SIEMPRE obtener usuario con fallback
  const usuario = await obtenerUsuarioConFallback()
  if (!usuario) {
    return { success: false, error: 'No autenticado' }
  }

  const tallerId = usuario.taller_id
  // Pasar taller_id a capa inferior
}
```

#### 2. Use Cases (Validación)

```typescript
// src/application/use-cases/**/caso-de-uso.ts
export class MiCasoDeUso {
  async execute(input: Input, tallerId: string) {
    // Validar que tallerId esté presente
    if (!tallerId) {
      throw new AppError('taller_id requerido')
    }

    // Delegar a repositorio
    return this.repository.metodo(input, tallerId)
  }
}
```

#### 3. Repositories (Filtro Explícito)

```typescript
// src/infrastructure/repositories/**/repository.ts
async obtenerPorId(id: string, tallerId: string) {
  const { data, error } = await supabase
    .from('tabla')
    .select('*')
    .eq('id', id)
    .eq('taller_id', tallerId)  // ✅ SIEMPRE filtrar por taller
    .single()

  return data
}
```

#### 4. Database RLS (Última Defensa)

```sql
-- Política RLS en cada tabla
CREATE POLICY "Ver solo datos del taller" ON tabla
  FOR SELECT USING (
    taller_id = get_my_taller_id()
  );

CREATE POLICY "Modificar solo datos del taller" ON tabla
  FOR ALL USING (
    taller_id = get_my_taller_id()
  );
```

### Verificación de Seguridad

```bash
# ✅ Verificar que TODAS las queries incluyen taller_id
grep -r "\.from(" src/actions/ | grep -v "taller_id"

# ✅ Verificar RLS habilitado
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('facturas', 'ordenes_reparacion', 'clientes', 'vehiculos', 'citas');

# ✅ Verificar políticas RLS existen
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public';
```

---

## 🛠️ TROUBLESHOOTING

### Error: "RPC asignar_numero_factura not found"

**Solución**:
```sql
-- Ejecutar en Supabase SQL Editor
-- Copiar contenido de: supabase/migrations/rpc_asignar_numero_factura.sql
```

### Error: "Column 'serie' does not exist"

**Solución**:
```sql
-- Ejecutar migración
ALTER TABLE series_facturacion
ADD COLUMN IF NOT EXISTS serie VARCHAR(20),
ADD COLUMN IF NOT EXISTS año INTEGER;

UPDATE series_facturacion
SET serie = prefijo,
    año = 2026
WHERE serie IS NULL;
```

### Error: "No series found"

**Solución**:
```sql
-- Crear series iniciales (ver sección Migraciones)
INSERT INTO series_facturacion ...
```

### PDF No Se Genera

**Verificar**:
1. Factura se creó correctamente: `/dashboard/facturas`
2. Consola del navegador (F12): Ver errores
3. Logs del servidor: Terminal de `npm run dev`
4. API endpoint funciona: `/api/facturas/[id]/pdf`

**Solución**:
```bash
# Reinstalar dependencia PDF
npm install @react-pdf/renderer@latest
```

### Dashboard No Carga (Métricas)

**Causa**: Filtro `deleted_at` en tabla sin esa columna.

**Verificación**:
```sql
-- Ver qué tablas tienen deleted_at
SELECT table_name, column_name
FROM information_schema.columns
WHERE column_name = 'deleted_at';
```

**Solución**: Ya corregido en `src/actions/dashboard/obtener-metricas.action.ts`

### Error: "Número de factura inválido"

**Causa**: Datos legacy con formato incorrecto.

**Solución**: Ya corregido con try-catch en `src/infrastructure/repositories/supabase/factura.mapper.ts`

---

## 🧪 TESTING

### Testing Manual Sistemático

#### Test 1: Dashboard Principal

```bash
1. npm run dev
2. Ir a /dashboard
3. Verificar que carga sin errores
4. Métricas se muestran correctamente
5. No hay errores en consola (F12)
6. No hay errores en servidor
```

**Esperado**:
- ✅ Órdenes activas: X
- ✅ Facturas emitidas: X
- ✅ Clientes activos: X
- ✅ Gráficos cargan

#### Test 2: Generador de Facturas

```bash
1. Ir a /dashboard/facturas/generar
2. Serie: F
3. Cliente: "Test Cliente SL"
4. NIF: "B12345678"
5. Línea:
   - Descripción: "Prueba"
   - Cantidad: 1
   - Precio: 100€
   - IVA: 21%
6. Click "Emitir Factura"
```

**Esperado**:
- ✅ Número: F-2026-000001
- ✅ Total: 121€ (100 + 21 IVA)
- ✅ PDF se abre
- ✅ Aparece en /dashboard/facturas

#### Test 3: Numeración Correlativa

```bash
1. Crear segunda factura (mismo proceso)
2. Verificar: F-2026-000002

3. Cambiar a serie P
4. Crear factura
5. Verificar: P-2026-000001  (contador independiente)

6. Volver a serie F
7. Crear factura
8. Verificar: F-2026-000003  (continúa desde 2)
```

#### Test 4: Cada Módulo

Para cada uno:
- `/dashboard/ordenes`
- `/dashboard/facturas`
- `/dashboard/clientes`
- `/dashboard/vehiculos`
- `/dashboard/citas`

**Verificar**:
1. ✅ Listado carga
2. ✅ Crear nuevo funciona
3. ✅ Editar funciona
4. ✅ Eliminar funciona (soft delete)
5. ✅ No hay errores en consola

### Testing Automatizado

```bash
# Unit tests (si existen)
npm run test

# Build test
npm run build

# Type check
npm run type-check
```

---

## 🚀 DEPLOY

### Preparación Pre-Deploy

```bash
# 1. Verificar que todo funciona local
npm run dev

# 2. Build exitoso
npm run build

# 3. Ejecutar migraciones en producción (Supabase)
# Ver sección "Migraciones Necesarias"

# 4. Crear series iniciales en producción
# Ver sección "Migraciones Necesarias"

# 5. Configurar variables de entorno en Vercel/Hosting
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_APP_URL=https://tu-dominio.com
```

### Deploy a Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy a producción
vercel --prod
```

### Variables de Entorno en Vercel

Dashboard → Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_APP_URL
```

### Verificación Post-Deploy

```bash
1. Abrir https://tu-dominio.com
2. Login con usuario de prueba
3. Ir a /dashboard/facturas/generar
4. Crear factura de prueba
5. Verificar numeración: F-2026-000001
6. Verificar PDF se genera
7. Verificar en Supabase que se guardó
```

---

## 🔧 MANTENIMIENTO

### Logs y Monitoreo

#### Logs del Servidor
```bash
# En desarrollo
npm run dev
# Ver consola para logs con ❌ y ✅

# En producción (Vercel)
# Dashboard → Functions → Ver logs
```

#### Logs de Supabase
```
Dashboard → Logs → Postgres Logs
```

#### Errores Comunes en Logs

```typescript
// ❌ Error en obtenerFacturaAction
// ✅ Factura creada en borrador
// ⚠️ NIF inválido (legacy)
```

### Backup de Base de Datos

```bash
# Supabase automático: Cada día
# Manual:
# Dashboard → Settings → Backups → Create backup
```

### Limpieza de Datos Legacy

```sql
-- Facturas con número inválido
SELECT id, numero_factura
FROM facturas
WHERE numero_factura NOT LIKE '_-____-______';

-- Clientes con NIF inválido
SELECT id, nombre, nif
FROM clientes
WHERE LENGTH(nif) < 9;

-- Corregir o eliminar según caso
```

### Monitoreo de Numeración

```sql
-- Ver estado de series
SELECT
  t.nombre as taller,
  s.serie,
  s.año,
  s.ultimo_numero,
  s.activa
FROM series_facturacion s
JOIN talleres t ON t.id = s.taller_id
ORDER BY t.nombre, s.serie;

-- Ver últimas facturas emitidas
SELECT
  numero_factura,
  serie,
  fecha_emision,
  total,
  estado
FROM facturas
ORDER BY created_at DESC
LIMIT 20;
```

---

## 📚 RECURSOS ADICIONALES

### Documentación Técnica

- `ARQUITECTURA_CLEAN.md` - Detalles de arquitectura limpia
- `BACKEND_ARQUITECTURA.md` - Estructura del backend
- `DEPLOY.md` - Guía detallada de deploy

### Guías de Usuario

- `GUIA_VISUAL_FLUJO_APP.md` - Flujo visual de la aplicación
- `GUIA-FACTURAS-PRODUCCION.md` - Guía específica de facturas

### Auditorías y Reportes

- `AUDITORIA-RESULTADOS.md` - Resultados de auditoría completa
- `AUDITORIA-FACTURAS.md` - Auditoría específica de facturas

---

## ✅ CHECKLIST PRODUCCIÓN

Antes de ir a producción, verificar:

- [ ] ✅ Migración 001_fix_series_facturacion.sql ejecutada
- [ ] ✅ RPC asignar_numero_factura creado
- [ ] ✅ Series iniciales creadas (F, P, R)
- [ ] ✅ Variables de entorno configuradas
- [ ] ✅ Build exitoso (`npm run build`)
- [ ] ✅ Testing manual completado
- [ ] ✅ Generador de facturas funciona
- [ ] ✅ Numeración correlativa verificada
- [ ] ✅ PDF se genera correctamente
- [ ] ✅ RLS habilitado en todas las tablas
- [ ] ✅ Sin errores en consola del navegador
- [ ] ✅ Sin errores en logs del servidor
- [ ] ✅ Backup de BD configurado

---

## 🆘 SOPORTE

### Errores Críticos

Si algo no funciona:

1. **Revisar logs del servidor**: Terminal donde corre `npm run dev`
2. **Consola del navegador**: F12 → Console → Ver errores
3. **Logs de Supabase**: Dashboard → Logs → Postgres/API logs
4. **Archivos de auditoría**: `AUDITORIA-RESULTADOS.md`

### Plan B: Reset de Facturas

⚠️ **SOLO SI TODO FALLA Y NO HAY DATOS IMPORTANTES**

```sql
-- Borrar facturas de prueba
DELETE FROM lineas_factura
WHERE factura_id IN (
  SELECT id FROM facturas WHERE estado = 'borrador'
);

DELETE FROM facturas WHERE estado = 'borrador';

-- Resetear series
UPDATE series_facturacion
SET ultimo_numero = 0
WHERE año = 2026;
```

---

## 📝 HISTORIAL DE CAMBIOS

### 2026-01-29
- ✅ Auditoría completa de la aplicación
- ✅ Seguridad: Verificación de queries taller_id
- ✅ Protección de mappers contra datos legacy
- ✅ Mejora de error handling en 29 actions
- ✅ Generador de facturas standalone operativo
- ✅ Numeración correlativa garantizada
- ✅ Documentación consolidada

---

**Última actualización**: 2026-01-29
**Versión**: 1.0
**Branch**: `claude/refactor-saas-architecture-5fW7k`
**Estado**: ✅ PRODUCCIÓN READY
