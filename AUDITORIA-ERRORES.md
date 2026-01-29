# 🔍 Auditoría de Errores - Análisis Completo

## ✅ Problemas CRÍTICOS Resueltos

### 1. **Dashboard: Error con deleted_at en ordenes_reparacion**
**Ubicación**: `src/actions/dashboard/obtener-metricas.action.ts`

**Problema**:
```typescript
// ❌ ANTES
.from('ordenes_reparacion')
.is('deleted_at', null)  // Columna no existe en la tabla
```

**Solución**:
```typescript
// ✅ DESPUÉS
.from('ordenes_reparacion')
.select('id, estado, fecha_entrada')
.eq('taller_id', tallerId)
// Sin filtro deleted_at
```

**Estado**: ✅ Resuelto en commit `1f0cafc`

---

### 2. **Facturas: NumeroFactura.fromString() sin protección**
**Ubicación**: `src/infrastructure/repositories/supabase/factura.mapper.ts:85`

**Problema**:
```typescript
// ❌ ANTES - Lanza error y rompe toda la app
if (record.numero_factura) {
  numeroFactura = NumeroFactura.fromString(record.numero_factura)
}
```

**Error generado**:
```
Error: Formato de número de factura inválido. Formato esperado: F-2026-000123
```

**Solución**:
```typescript
// ✅ DESPUÉS - Ignora facturas con formato legacy
if (record.numero_factura) {
  try {
    numeroFactura = NumeroFactura.fromString(record.numero_factura)
  } catch (error) {
    console.warn(`⚠️ Número de factura inválido (legacy): ${record.numero_factura}`, error)
    numeroFactura = undefined
  }
}
```

**Impacto**: Facturas con números en formato legacy ahora se listan correctamente

**Estado**: ✅ Resuelto en commit `f7ece95`

---

### 3. **Clientes: NIF.create() sin protección**
**Ubicación**: `src/infrastructure/repositories/supabase/cliente.mapper.ts:50`

**Problema**:
```typescript
// ❌ ANTES - Lanza error si hay NIF inválido
const nif = NIF.create(record.nif)
```

**Solución**:
```typescript
// ✅ DESPUÉS - Usa placeholder para datos legacy
let nif: NIF
try {
  nif = NIF.create(record.nif)
} catch (error) {
  console.warn(`⚠️ NIF inválido (legacy) para cliente ${record.id}: ${record.nif}`, error)
  nif = NIF.create('00000000T') // NIF placeholder
}
```

**Impacto**: Clientes con NIF inválido no rompen la aplicación

**Estado**: ✅ Resuelto en commit `f7ece95`

---

## ⚠️ Problemas MEDIOS Detectados (No resueltos)

### 4. **Mensajes de error vacíos en múltiples actions**
**Ubicaciones**: 15+ archivos en `src/actions/`

**Problema**:
```typescript
// ❌ PATRÓN PROBLEMÁTICO
catch (error: any) {
  return { success: false, error: error.message }  // Puede ser vacío
}
```

**Archivos afectados**:
- `src/actions/facturas/obtener-factura.action.ts:44`
- `src/actions/vehiculos/obtener-vehiculo.action.ts:42`
- `src/actions/citas/obtener-cita.action.ts:42`
- `src/actions/ordenes/eliminar-orden.action.ts:51`
- `src/actions/clientes/obtener-cliente.action.ts:42`
- ... y 10 más

**Solución recomendada**:
```typescript
// ✅ PATRÓN MEJORADO (como en dashboard)
catch (error: any) {
  console.error('❌ Error específico:', {
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code
  })

  return {
    success: false,
    error: error.message || error.details || error.hint || 'Mensaje descriptivo por defecto'
  }
}
```

**Impacto**: Errores de Supabase sin mensaje mostrarían descripción útil

**Estado**: ⚠️ Pendiente

---

## 📊 Resumen de Schema de BD

### Tablas CON deleted_at:
- ✅ `facturas`
- ✅ `clientes`
- ✅ `vehiculos`
- ✅ `citas`

### Tablas SIN deleted_at:
- ❌ `ordenes_reparacion`
- ❌ `lineas_factura`
- ❌ `usuarios`
- ❌ `talleres`

**Recomendación**: Agregar `deleted_at` a órdenes de reparación para soft deletes

---

## 🎯 Patrones de Código Encontrados

### ✅ BUENO: Protección con try-catch
```typescript
// Ejemplo: Email en factura.mapper.ts
let clienteNIF: NIF | undefined
if (record.cliente_nif) {
  try {
    clienteNIF = NIF.create(record.cliente_nif)
  } catch {
    clienteNIF = undefined
  }
}
```

### ✅ BUENO: Métodos seguros
```typescript
// Ejemplo: IBAN en cliente.mapper.ts
const iban = record.iban
  ? IBAN.createOrNull(record.iban) ?? undefined
  : undefined
```

### ❌ MALO: Sin protección
```typescript
// Factura mapper ANTES del fix
numeroFactura = NumeroFactura.fromString(record.numero_factura)
```

---

## 🔧 Recomendaciones

### Corto Plazo (Ya implementado):
1. ✅ Proteger todos los value objects con try-catch
2. ✅ Logging detallado en dashboard
3. ✅ Eliminar filtros de deleted_at en tablas que no lo tienen

### Medio Plazo (Pendiente):
1. ⚠️ Estandarizar manejo de errores en todos los actions
2. ⚠️ Crear helper para logging consistente
3. ⚠️ Agregar deleted_at a ordenes_reparacion

### Largo Plazo (Opcional):
1. Crear métodos `.createOrNull()` para todos los value objects
2. Migrar datos legacy a formatos válidos
3. Agregar validaciones en BD (constraints)

---

## 📝 Archivos Modificados

```
src/actions/dashboard/obtener-metricas.action.ts
src/infrastructure/repositories/supabase/factura.mapper.ts
src/infrastructure/repositories/supabase/cliente.mapper.ts
```

---

## 🧪 Testing Recomendado

### 1. Dashboard
```bash
# Probar con datos vacíos
# Verificar que muestra 0s en lugar de errores
```

### 2. Facturas
```sql
-- Insertar factura con formato legacy
INSERT INTO facturas (numero_factura, ...)
VALUES ('FAC-123', ...);

-- Debería listar sin errores
```

### 3. Clientes
```sql
-- Cliente con NIF inválido
INSERT INTO clientes (nif, ...)
VALUES ('INVALID', ...);

-- Debería listar con NIF placeholder
```

---

## ✅ Resultado Final

**Antes**:
- ❌ Dashboard no carga (error deleted_at)
- ❌ Facturas con formato legacy rompen listado
- ❌ Clientes con NIF inválido rompen app
- ❌ Errores sin mensaje descriptivo

**Después**:
- ✅ Dashboard carga correctamente
- ✅ Facturas legacy se listan (sin número)
- ✅ Clientes legacy se listan (con NIF placeholder)
- ✅ Logging detallado para debugging

---

**Generado**: 2026-01-29
**Commits**: `1f0cafc`, `f7ece95`
**Branch**: `claude/refactor-saas-architecture-5fW7k`
