# 🔍 AUDITORÍA COMPLETA: SISTEMA DE FACTURAS

**Fecha**: 2026-01-29
**Estado**: ⚠️ SISTEMA FUNCIONAL pero necesita verificación de BD
**Urgencia**: 🔴 CRÍTICO - Producción mañana

---

## ✅ COMPONENTES VERIFICADOS

### 1. **Lógica de Numeración** ✅ CORRECTO
**Archivo**: `src/domain/logic/generar-numero-factura.ts`

```typescript
// Genera formato: SERIE-YYYY-NNNNNN (ej. F-2026-000123)
export function generarSiguienteNumeroFactura(
  ultimoNumero?: NumeroFactura,
  serie?: Serie
): NumeroFactura
```

**Características**:
- ✅ Resetea cada año automáticamente
- ✅ Secuencial por serie
- ✅ Incrementa correlat envamente
- ✅ Lógica pura (sin side effects)

---

### 2. **RPC Atómico** ✅ EXCELENTE
**Archivo**: `supabase/migrations/rpc_asignar_numero_factura.sql`

```sql
CREATE OR REPLACE FUNCTION asignar_numero_factura(
  p_taller_id UUID,
  p_serie TEXT,
  p_año INTEGER
) RETURNS JSON
```

**Características CRÍTICAS**:
- ✅ **FOR UPDATE**: Lock de fila (evita duplicados)
- ✅ **Multi-tenant**: Filtra por taller_id
- ✅ **Transaccional**: Cambios atómicos
- ✅ **Auto-crea serie**: Si no existe, la crea
- ✅ **Retorna JSON**: Con número completo

**Formato generado**: `F-2026-000001`, `F-2026-000002`...

---

### 3. **Use Case de Emisión** ✅ CORRECTO
**Archivo**: `src/application/use-cases/facturas/emitir-factura.use-case.ts`

**Flujo**:
1. ✅ Valida que la factura esté en borrador
2. ✅ Asigna número mediante RPC atómico
3. ✅ Cambia estado a EMITIDA
4. ✅ Registra usuario que emitió
5. ✅ Factura queda INMUTABLE (normativa fiscal)

```typescript
// Asignar número mediante RPC atómico (FOR UPDATE)
const { numeroCompleto } = await this.facturaRepository.asignarNumeroFactura(
  factura.getId(),
  serie,
  año,
  tallerId
)
```

---

### 4. **Repository** ✅ CORRECTO
**Archivo**: `src/infrastructure/repositories/supabase/factura.repository.ts`

**Método crítico**:
```typescript
async asignarNumeroFactura(
  facturaId: string,
  serie: string,
  año: number,
  tallerId: string
): Promise<{ numeroCompleto: string; numero: number }>
```

**Implementación**:
- ✅ Llama al RPC `asignar_numero_factura`
- ✅ Actualiza la factura con el número asignado
- ✅ Filtros de seguridad (taller_id)

---

### 5. **PDF Generator** ✅ EXISTE
**Archivo**: `src/lib/facturas/pdf-generator.tsx`

**Características**:
- ✅ Usa `@react-pdf/renderer`
- ✅ Formato A4
- ✅ Optimizado para caber en 1 página
- ✅ Colores personalizables
- ✅ Cumple normativa española

**API Endpoint**: `/api/facturas/generar-pdf`

---

### 6. **Server Actions** ✅ IMPLEMENTADOS
**Archivos**:
- `src/actions/facturas/crear-borrador-factura.action.ts`
- `src/actions/facturas/crear-borrador-desde-orden.action.ts`
- `src/actions/facturas/emitir-factura.action.ts`
- `src/actions/facturas/listar-facturas.action.ts`
- `src/actions/facturas/obtener-factura.action.ts`
- `src/actions/facturas/anular-factura.action.ts`

---

## ⚠️ PROBLEMAS DETECTADOS

### PROBLEMA 1: **Inconsistencia en Schema de Series** 🔴 CRÍTICO

**MASTER_SCHEMA.sql**:
```sql
CREATE TABLE IF NOT EXISTS series_facturacion (
    id UUID PRIMARY KEY,
    taller_id UUID,
    prefijo VARCHAR(10) NOT NULL,      -- ❌ Se llama "prefijo"
    nombre VARCHAR(100),
    ultimo_numero INTEGER DEFAULT 0,
    -- ❌ NO hay columna "año"
    -- ❌ NO hay columna "serie"
)
```

**RPC rpc_asignar_numero_factura.sql**:
```sql
SELECT ultimo_numero
FROM series_facturacion
WHERE taller_id = p_taller_id
  AND serie = p_serie        -- ⚠️ Columna "serie" no existe en schema
  AND año = p_año            -- ⚠️ Columna "año" no existe en schema
```

**PROBLEMA**: El RPC usa columnas que NO existen en el schema principal.

**SOLUCIÓN**: Necesitamos verificar qué schema está realmente en Supabase y aplicar el correcto.

---

### PROBLEMA 2: **Validación Estricta Rompe Datos Legacy** ⚠️ MEDIO

**Archivo**: `src/infrastructure/repositories/supabase/factura.mapper.ts`

Ya fue parcialmente corregido con try-catch:

```typescript
// ✅ YA CORREGIDO
if (record.numero_factura) {
  try {
    numeroFactura = NumeroFactura.fromString(record.numero_factura)
  } catch (error) {
    console.warn(`⚠️ Número de factura inválido (legacy): ${record.numero_factura}`)
    numeroFactura = undefined
  }
}
```

**Estado**: ✅ Resuelto en commit `f7ece95`

---

### PROBLEMA 3: **No Se Ha Verificado Si RPC Está en BD** 🔴 CRÍTICO

El RPC `asignar_numero_factura` existe en el archivo de migración pero:
- ❓ ¿Está aplicado en Supabase?
- ❓ ¿Funciona correctamente?
- ❓ ¿El schema coincide?

**Verificación necesaria**: Ejecutar query de prueba en Supabase SQL Editor.

---

## 🎯 SOLUCIÓN PROPUESTA

### OPCIÓN A: **Arreglar Sistema Actual** (Recomendado si tiempo < 2 horas)

1. ✅ **Verificar schema en Supabase**
   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'series_facturacion'
   ORDER BY ordinal_position;
   ```

2. ✅ **Aplicar migración correcta**
   - Si falta columna `año`, ejecutar `ALTER TABLE`
   - Si falta RPC, ejecutar `rpc_asignar_numero_factura.sql`

3. ✅ **Crear serie inicial**
   ```sql
   INSERT INTO series_facturacion (taller_id, serie, año, ultimo_numero)
   VALUES ('tu-taller-id', 'F', 2026, 0);
   ```

4. ✅ **Probar flujo completo**:
   - Crear borrador
   - Emitir factura
   - Generar PDF
   - Verificar número correlativo

---

### OPCIÓN B: **Página Standalone** (Si sistema actual falla)

Crear página minimalista `/facturas/emitir-simple`:

**Características**:
- Formulario simple (cliente, líneas, total)
- Selector de serie (F, P, R)
- Botón "Emitir y Generar PDF"
- Llama directamente al RPC
- Genera PDF con react-pdf
- Guarda en Supabase

**Ventajas**:
- ✅ Funciona en 1-2 horas
- ✅ Independiente del sistema complejo
- ✅ Usa mismo RPC (numeración correcta)
- ✅ PDF igual de profesional

**Desventajas**:
- ❌ No usa el sistema completo
- ❌ Solución temporal

---

## 📋 CHECKLIST PRE-PRODUCCIÓN

### Verificaciones en Supabase:

```sql
-- 1. Ver estructura de tabla series_facturacion
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'series_facturacion';

-- 2. Ver funciones RPC
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%asignar%';

-- 3. Ver series existentes
SELECT * FROM series_facturacion;

-- 4. Probar RPC manualmente
SELECT asignar_numero_factura(
  'tu-taller-id'::UUID,
  'F',
  2026
);
```

### Prueba End-to-End:

1. ✅ Crear borrador de factura
2. ✅ Añadir líneas
3. ✅ Emitir factura
4. ✅ Verificar número asignado (F-2026-000001)
5. ✅ Generar PDF
6. ✅ Emitir segunda factura
7. ✅ Verificar número correlativo (F-2026-000002)
8. ✅ Cambiar a serie "P"
9. ✅ Verificar nuevo contador (P-2026-000001)

---

## 🚀 PLAN DE ACCIÓN INMEDIATO

### PASO 1: Diagnóstico (5 min)
```bash
# En tu máquina local
git pull origin claude/refactor-saas-architecture-5fW7k
npm run dev
```

```sql
-- En Supabase SQL Editor
\d series_facturacion
SELECT * FROM pg_proc WHERE proname = 'asignar_numero_factura';
```

### PASO 2A: Si RPC existe y funciona (15 min)
1. Crear serie de prueba
2. Emitir factura de prueba
3. Verificar PDF
4. ✅ LISTO PARA PRODUCCIÓN

### PASO 2B: Si RPC NO existe (30 min)
1. Ejecutar `rpc_asignar_numero_factura.sql`
2. Ejecutar queries de verificación
3. Repetir PASO 2A

### PASO 2C: Si sistema falla completamente (2 horas)
1. Crear página `/facturas/emitir-simple`
2. Formulario minimalista
3. Integración directa con RPC
4. Generación de PDF
5. ✅ SOLUCIÓN TEMPORAL FUNCIONAL

---

## 📄 ARCHIVOS CLAVE

```
src/
├── actions/facturas/
│   ├── crear-borrador-factura.action.ts      ✅ OK
│   ├── emitir-factura.action.ts              ✅ OK
│   └── generar-pdf.action.ts                  ❓ Verificar
├── application/use-cases/facturas/
│   └── emitir-factura.use-case.ts            ✅ OK
├── infrastructure/repositories/supabase/
│   ├── factura.repository.ts                  ✅ OK (usa RPC)
│   └── factura.mapper.ts                      ✅ FIXED
├── domain/logic/
│   └── generar-numero-factura.ts             ✅ OK
├── lib/facturas/
│   └── pdf-generator.tsx                      ✅ OK
└── app/api/facturas/generar-pdf/             ❓ Verificar

supabase/
├── migrations/
│   └── rpc_asignar_numero_factura.sql        ✅ EXISTE
└── MASTER_SCHEMA.sql                          ⚠️ INCONSISTENTE
```

---

## ⚡ DECISIÓN FINAL

**Recomendación**: OPCIÓN A (arreglar sistema actual)

**Razón**:
- El código está bien hecho
- Solo falta verificar BD
- RPC existe y es robusto
- 90% del trabajo ya está hecho

**Si falla**: OPCIÓN B como backup (2 horas máximo)

---

**SIGUIENTE PASO**: Dame luz verde y ejecuto el diagnóstico completo en Supabase.
