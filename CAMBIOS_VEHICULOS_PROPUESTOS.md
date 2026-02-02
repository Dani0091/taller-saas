# 📋 CAMBIOS PROPUESTOS - MÓDULO VEHÍCULOS

**Fecha:** 2026-01-29
**Objetivo:** Sincronizar con esquema REAL de Supabase según JSON proporcionado

---

## 🔍 ANÁLISIS DEL ESQUEMA REAL

### ✅ COLUMNAS QUE SÍ EXISTEN EN SUPABASE (25 columnas)

Según el JSON proporcionado, la tabla `vehiculos` tiene:

```
✅ CAMPOS BÁSICOS:
- id (uuid)
- taller_id (uuid)
- cliente_id (uuid)
- matricula (text)
- marca (text)
- modelo (text)
- año (integer) ⭐ CON Ñ
- color (text)
- version (varchar) ⭐ NUEVA

✅ CAMPOS TÉCNICOS:
- vin (text) ⭐ SÍ EXISTE
- bastidor_vin (text) ⭐ SÍ EXISTE
- numero_motor (text) ⭐ SÍ EXISTE
- tipo_combustible (text) ⭐ SÍ EXISTE
- kilometros (integer) ⭐ SÍ EXISTE
- potencia_cv (numeric) ⭐ SÍ EXISTE
- cilindrada (integer) ⭐ SÍ EXISTE
- carroceria (text) ⭐ SÍ EXISTE
- emisiones (text) ⭐ SÍ EXISTE
- fecha_matriculacion (date) ⭐ SÍ EXISTE

✅ CAMPOS DE METADATOS:
- notas (text) ⭐ SÍ EXISTE
- fotos (jsonb) ⭐ NUEVO
- documentos (jsonb) ⭐ NUEVO
- historial_reparaciones (jsonb) ⭐ NUEVO
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
```

### ❌ COLUMNAS QUE NO EXISTEN EN SUPABASE

```
❌ NO EXISTEN (no aparecen en el JSON):
- deleted_at ❌
- ficha_tecnica_url ❌
- permiso_circulacion_url ❌
- datos_ocr ❌
- ocr_procesado ❌
- ocr_fecha ❌
```

---

## 🔧 CAMBIO #1: vehiculo.repository.ts (5 funciones)

### 📍 SELECT ACTUAL (INCOMPLETO)
```typescript
// Líneas: 79, 110, 230, 278, 468
.select('id, taller_id, cliente_id, matricula, marca, modelo, año, color, created_at, updated_at, deleted_at')
```

**Problemas:**
- ❌ Incluye `deleted_at` que NO existe
- ❌ Falta `vin` que SÍ existe
- ❌ Falta `kilometros` que SÍ existe
- ❌ Falta `tipo_combustible` que SÍ existe
- ❌ Falta otros 11 campos que SÍ existen

### ✅ SELECT PROPUESTO (COMPLETO)
```typescript
.select(`
  id,
  taller_id,
  cliente_id,
  matricula,
  marca,
  modelo,
  año,
  color,
  version,
  vin,
  bastidor_vin,
  numero_motor,
  tipo_combustible,
  kilometros,
  potencia_cv,
  cilindrada,
  carroceria,
  emisiones,
  fecha_matriculacion,
  notas,
  fotos,
  documentos,
  historial_reparaciones,
  created_at,
  updated_at
`)
```

**Cambios:**
- ➕ Agregados 15 campos que SÍ existen
- ➖ Eliminado `deleted_at` que NO existe

---

## 🔧 CAMBIO #2: vehiculo.mapper.ts

### 📍 COMENTARIO ACTUAL (INCORRECTO)
```typescript
// Líneas 14-16
/**
 * ESQUEMA REAL DE SUPABASE (solo estos campos existen):
 * - id, taller_id, cliente_id, matricula, marca, modelo, año, color
 *
 * Los demás campos se mantienen opcionales para compatibilidad legacy
 */
```

### ✅ COMENTARIO PROPUESTO (CORRECTO)
```typescript
/**
 * ESQUEMA REAL DE SUPABASE (según JSON 2026-01-29):
 *
 * ✅ EXISTEN (25 columnas):
 * - Básicos: id, taller_id, cliente_id, matricula, marca, modelo, año, color, version
 * - Técnicos: vin, bastidor_vin, numero_motor, tipo_combustible, kilometros
 * - Especificaciones: potencia_cv, cilindrada, carroceria, emisiones, fecha_matriculacion
 * - Metadatos: notas, fotos, documentos, historial_reparaciones
 * - Timestamps: created_at, updated_at
 *
 * ❌ NO EXISTEN (legacy, mantener opcionales por compatibilidad):
 * - deleted_at, ficha_tecnica_url, permiso_circulacion_url
 * - datos_ocr, ocr_procesado, ocr_fecha
 */
```

### 📍 VehiculoDbRecord ACTUAL
```typescript
export type VehiculoDbRecord = {
  id: string
  taller_id: string
  cliente_id?: string | null
  matricula: string
  marca?: string | null
  modelo?: string | null
  año?: number | null
  color?: string | null
  // Campos adicionales (pueden no existir en BD actual) ❌ COMENTARIO INCORRECTO
  kilometros?: number | null
  vin?: string | null
  // ... etc
}
```

### ✅ VehiculoDbRecord PROPUESTO
```typescript
export type VehiculoDbRecord = {
  // ✅ Campos que SÍ existen en Supabase
  id: string
  taller_id: string
  cliente_id?: string | null
  matricula: string
  marca?: string | null
  modelo?: string | null
  año?: number | null
  color?: string | null
  version?: string | null

  // ✅ Campos técnicos que SÍ existen
  vin?: string | null
  bastidor_vin?: string | null
  numero_motor?: string | null
  tipo_combustible?: string | null
  kilometros?: number | null
  potencia_cv?: number | null
  cilindrada?: number | null
  carroceria?: string | null
  emisiones?: string | null
  fecha_matriculacion?: string | null
  notas?: string | null

  // ✅ Campos JSONB que SÍ existen (NUEVOS)
  fotos?: Record<string, any> | null
  documentos?: Record<string, any> | null
  historial_reparaciones?: Record<string, any> | null

  // ✅ Timestamps que SÍ existen
  created_at?: string
  updated_at?: string

  // ❌ Campos legacy (NO existen en DB, mantener para compatibilidad con código viejo)
  deleted_at?: string | null  // ❌ NO existe en DB
  ficha_tecnica_url?: string | null  // ❌ NO existe en DB
  permiso_circulacion_url?: string | null  // ❌ NO existe en DB
  datos_ocr?: Record<string, any> | null  // ❌ NO existe en DB
  ocr_procesado?: boolean  // ❌ NO existe en DB
  ocr_fecha?: string | null  // ❌ NO existe en DB
}
```

---

## 🔧 CAMBIO #3: vehiculo.mapper.ts - toDomain()

### 📍 CAMBIOS EN MAPEO
Agregar mapeo para los 3 campos JSONB nuevos:

```typescript
// Línea ~115 (después de otros campos)
fotos: record.fotos ?? undefined,
documentos: record.documentos ?? undefined,
historialReparaciones: record.historial_reparaciones ?? undefined,
```

---

## 🔧 CAMBIO #4: vehiculo.mapper.ts - toPersistence()

### 📍 CAMBIOS EN PERSISTENCIA
Agregar los 3 campos JSONB nuevos:

```typescript
// Línea ~150 (antes de deleted_at)
fotos: plainObject.fotos ?? null,
documentos: plainObject.documentos ?? null,
historial_reparaciones: plainObject.historialReparaciones ?? null,
```

---

## 🔧 CAMBIO #5: Función contarPorTipoCombustible()

### ❌ ESTADO ACTUAL
La función está DESHABILITADA porque pensé que `tipo_combustible` NO existía.

### ✅ ESTADO PROPUESTO
HABILITAR la función porque `tipo_combustible` SÍ existe en la DB.

```typescript
// Línea ~535
async contarPorTipoCombustible(tallerId: string): Promise<Record<TipoCombustible, number>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('vehiculos')
      .select('tipo_combustible')
      .eq('taller_id', tallerId)

    if (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }

    // Contar por tipo
    const counts: Record<string, number> = {}
    Object.values(TipoCombustible).forEach(tipo => {
      counts[tipo] = 0
    })

    data?.forEach(record => {
      if (record.tipo_combustible) {
        counts[record.tipo_combustible] = (counts[record.tipo_combustible] || 0) + 1
      }
    })

    return counts as Record<TipoCombustible, number>

  } catch (error) {
    throw SupabaseErrorMapper.toDomainError(error)
  }
}
```

---

## 🔧 CAMBIO #6: Eliminar referencias a deleted_at

### 📍 UBICACIONES A CAMBIAR

**vehiculo.repository.ts:**

Línea ~283:
```typescript
// ❌ ACTUAL:
if (!filtros.incluirEliminados) {
  query = query.is('deleted_at', null)
}

// ✅ PROPUESTO (eliminar este filtro):
// Campo deleted_at no existe en Supabase
```

Línea ~191-206:
```typescript
// ❌ ACTUAL: Función eliminar() usa deleted_at
async eliminar(id: string, tallerId: string): Promise<void> {
  const { error } = await supabase
    .from('vehiculos')
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('taller_id', tallerId)
}

// ✅ PROPUESTO (DELETE real en lugar de soft delete):
async eliminar(id: string, tallerId: string): Promise<void> {
  const { error } = await supabase
    .from('vehiculos')
    .delete()
    .eq('id', id)
    .eq('taller_id', tallerId)
}
```

Línea ~223-262:
```typescript
// ❌ ACTUAL: Función restaurar() usa deleted_at
async restaurar(...)

// ✅ PROPUESTO: ELIMINAR función restaurar() completa
// (No se puede restaurar si hacemos DELETE real)
```

Línea ~467-470:
```typescript
// ❌ ACTUAL: Función listarEliminados()
async listarEliminados(...)

// ✅ PROPUESTO: ELIMINAR función listarEliminados() completa
// (No hay eliminados lógicos sin deleted_at)
```

---

## 📊 RESUMEN DE CAMBIOS

| Archivo | Línea(s) | Tipo de Cambio | Impacto |
|---------|----------|----------------|---------|
| `vehiculo.repository.ts` | 79, 110, 230, 278, 468 | SELECT ampliado (+15 campos, -1 campo) | Alto |
| `vehiculo.repository.ts` | 283 | Eliminar filtro deleted_at | Medio |
| `vehiculo.repository.ts` | 191-206 | Cambiar soft delete → hard delete | Alto |
| `vehiculo.repository.ts` | 223-262 | ELIMINAR función restaurar() | Alto |
| `vehiculo.repository.ts` | 460-495 | ELIMINAR función listarEliminados() | Alto |
| `vehiculo.repository.ts` | 535-575 | HABILITAR contarPorTipoCombustible() | Bajo |
| `vehiculo.mapper.ts` | 14-18 | Actualizar comentario | Bajo |
| `vehiculo.mapper.ts` | 19-48 | Reorganizar VehiculoDbRecord | Medio |
| `vehiculo.mapper.ts` | ~115 | Agregar mapeo fotos/documentos/historial | Bajo |
| `vehiculo.mapper.ts` | ~150 | Agregar persist fotos/documentos/historial | Bajo |

---

## ⚠️ DECISIONES CRÍTICAS REQUERIDAS

### 🔴 DECISIÓN #1: ¿Qué hacer con deleted_at?

**Opción A:** Hard Delete (eliminar registros realmente)
- ✅ Más simple, sin campo deleted_at
- ❌ Pérdida de datos permanente
- ❌ No se pueden recuperar vehículos eliminados

**Opción B:** Mantener Soft Delete pero crear columna
- ✅ Datos reversibles
- ✅ Auditoría completa
- ❌ Requiere migración SQL para agregar columna

**Mi recomendación:** Opción B + Migración SQL

### 🔴 DECISIÓN #2: ¿Eliminar funciones restaurar() y listarEliminados()?

Si eliges Hard Delete (Opción A), estas funciones no tienen sentido.
Si eliges Soft Delete (Opción B), mantenlas.

---

## 🚀 SIGUIENTE PASO

**Por favor, decide:**

1. ¿Quieres que agregue la columna `deleted_at` a Supabase (Soft Delete)?
2. ¿O prefieres eliminar registros permanentemente (Hard Delete)?

Una vez decidas, aplicaré los cambios correspondientes.

---

## 📋 VALIDACIÓN DE NOMBRES

### ✅ CONFIRMADO - Nombres correctos según JSON:
- ✅ `año` (con ñ, no "anio" ni "year")
- ✅ `kilometros` (no "kilometraje")
- ✅ `bastidor_vin` (no solo "vin" para bastidor)
- ✅ `tipo_combustible` (no "combustible")
- ✅ `vin` (número VIN del vehículo)

**Nota:** El mapper ya usa estos nombres correctos. Solo falta actualizar los SELECTs.
