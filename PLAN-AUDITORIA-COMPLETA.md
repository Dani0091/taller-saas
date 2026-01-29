# 🔍 PLAN DE AUDITORÍA COMPLETA - ANTES DE PRODUCCIÓN

**Fecha**: 2026-01-29
**Objetivo**: Garantizar que TODO funcione perfecto mañana
**Scope**: Auditoría sistemática de toda la aplicación

---

## 📋 QUÉ VOY A REVISAR

### 1. **Problemas de Schema/BD** 🔴 CRÍTICO

#### 1.1 Columna `deleted_at` Inconsistente
**Ya encontrado**: ordenes_reparacion NO tiene deleted_at

**Voy a buscar**:
```bash
# En cada server action que use .is('deleted_at', null)
grep -r "\.is('deleted_at'" src/actions/
```

**Tablas a verificar**:
- ordenes_reparacion ❌ (NO tiene)
- facturas ✅ (SÍ tiene)
- clientes ✅ (SÍ tiene)
- vehiculos ✅ (SÍ tiene)
- citas ✅ (SÍ tiene)
- usuarios ❓ (verificar)
- lineas_factura ❓ (verificar)

**Fix**: Eliminar `.is('deleted_at', null)` donde la columna no exista

---

#### 1.2 Schema de `series_facturacion`
**Problema**: RPC usa columnas diferentes del MASTER_SCHEMA

**Verificar**:
- ¿Qué columnas tiene la tabla real en Supabase?
- ¿El RPC funciona con el schema actual?

**Fix**: Migración 001_fix_series_facturacion.sql (ya creada)

---

### 2. **Mappers Sin Protección** ⚠️ MEDIO

#### 2.1 Value Objects Sin Try-Catch
**Ya encontrado**:
- ✅ NumeroFactura.fromString() - ARREGLADO
- ✅ NIF.create() en clientes - ARREGLADO
- ❓ NIF.create() en facturas
- ❓ Email.create() en otros lugares
- ❓ IBAN.createOrNull()

**Voy a buscar**:
```bash
grep -rn "\.fromString\|\.create(" src/infrastructure/repositories/
```

**Fix**: Agregar try-catch a TODOS los value objects

---

### 3. **Server Actions Con Errores Vacíos** ⚠️ MEDIO

**Ya detectado**: 15+ actions con `error.message` sin fallback

**Voy a buscar**:
```bash
grep -rn "error.message" src/actions/ | grep "return.*error:"
```

**Fix**: Cambiar a:
```typescript
error: error.message || error.details || error.hint || 'Mensaje por defecto'
```

---

### 4. **Autenticación Inconsistente** ⚠️ MEDIO

**Voy a buscar**:
- Actions que NO usan `obtenerUsuarioConFallback()`
- Actions con solo `getUser()` pero sin fallback
- Falta de verificación de `taller_id`

```bash
grep -rn "supabase.auth.getUser()" src/actions/
grep -rn "obtenerUsuarioConFallback" src/actions/
```

**Fix**: Estandarizar a `obtenerUsuarioConFallback()` en TODOS los actions

---

### 5. **Validaciones de DTO** ⚠️ MEDIO

**Voy a buscar**:
- DTOs sin validación Zod
- Validaciones no aplicadas
- Errores de validación no capturados

```bash
grep -rn "safeParse" src/actions/
grep -rn "\.parse(" src/actions/
```

**Fix**: Asegurar que TODOS usen safeParse y manejen errores

---

### 6. **Queries Sin Filtro taller_id** 🔴 CRÍTICO SEGURIDAD

**Voy a buscar**:
- Queries SELECT sin `.eq('taller_id', ...)`
- Queries UPDATE sin filtro de taller
- Queries DELETE sin protección

```bash
grep -rn "\.from(" src/actions/ | grep -v "eq('taller_id'"
```

**Fix**: Agregar filtro taller_id a TODAS las queries

---

### 7. **RPC y Funciones de BD** ⚠️ MEDIO

**Voy a verificar**:
- ¿Qué RPC/funciones existen?
- ¿Están siendo usadas correctamente?
- ¿Hay RPC obsoletos?

```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public';
```

---

### 8. **Testing de Rutas Principales** 🔴 CRÍTICO

**Rutas a testear**:
1. `/dashboard` - Dashboard principal
2. `/dashboard/ordenes` - Listado de órdenes
3. `/dashboard/facturas` - Listado de facturas
4. `/dashboard/facturas/generar` - Generador standalone
5. `/dashboard/clientes` - Listado de clientes
6. `/dashboard/vehiculos` - Listado de vehículos
7. `/dashboard/citas` - Listado de citas

**Para cada ruta verificar**:
- ✅ Carga sin errores
- ✅ Server actions funcionan
- ✅ Datos se muestran correctamente
- ✅ No hay errores en consola

---

## 🎯 SOLUCIONES QUE VOY A IMPLEMENTAR

### SOLUCIÓN 1: Limpieza de Filtros deleted_at

```typescript
// SCRIPT: fix-deleted-at-filters.ts
// Buscar y comentar/eliminar filtros de deleted_at en tablas sin esa columna
```

---

### SOLUCIÓN 2: Protección Universal de Mappers

```typescript
// Template para TODOS los mappers:
static toDomain(record: DBRecord): Entity {
  // VALUE OBJECT con try-catch
  let valueObject: ValueObject
  try {
    valueObject = ValueObject.create(record.field)
  } catch (error) {
    console.warn(`⚠️ Valor inválido (legacy): ${record.field}`, error)
    valueObject = ValueObject.placeholder() // O undefined
  }

  return Entity.create({ valueObject })
}
```

---

### SOLUCIÓN 3: Error Handling Estandarizado

```typescript
// Template para TODOS los actions:
} catch (error: any) {
  console.error('❌ Error en [ACTION_NAME]:', {
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code
  })

  return {
    success: false,
    error: error.message || error.details || error.hint || 'Error al [ACCIÓN]'
  }
}
```

---

### SOLUCIÓN 4: Acceso Super-Usuario

**Crear**: `/dashboard/admin/generar-facturas`

**Características**:
- Selector de taller
- Bypass de autenticación de taller
- Acceso solo para rol 'admin'
- Mismo formulario del generador standalone
- Logs de auditoría (quién generó qué)

**Middleware**:
```typescript
// Verificar rol admin
const usuario = await obtenerUsuarioConFallback()
if (usuario.rol !== 'admin') {
  return redirect('/dashboard')
}
```

---

### SOLUCIÓN 5: Consolidación de Documentación

**Eliminar archivos obsoletos**:
- ❌ Eliminar: AUDITORIA-ERRORES.md (desactualizado)
- ❌ Eliminar: DIAGNOSTICO-PROXY.md (resuelto)
- ❌ Eliminar: INSTRUCCIONES-REFACTOR.md (obsoleto)

**Mantener/Crear**:
- ✅ AUDITORIA-FACTURAS.md (actualizar)
- ✅ GUIA-FACTURAS-PRODUCCION.md (mantener)
- ✅ README-PRODUCCION.md (NUEVO - consolidado)

**README-PRODUCCION.md** contendrá:
```markdown
# README PRODUCCIÓN

## 1. Inicio Rápido
## 2. Migraciones Necesarias
## 3. Configuración
## 4. Características Principales
## 5. Generador de Facturas
## 6. Troubleshooting
## 7. Estructura del Proyecto
## 8. Testing
## 9. Deploy
```

---

## 📊 PRIORIDADES

### 🔴 CRÍTICO (Arreglar AHORA)
1. Queries sin filtro taller_id (SEGURIDAD)
2. Filtros deleted_at en tablas incorrectas
3. Migración de series_facturacion
4. RPC asignar_numero_factura verificado

### ⚠️ IMPORTANTE (Arreglar HOY)
5. Mappers sin try-catch
6. Error messages vacíos
7. Autenticación inconsistente

### ℹ️ MEJORAS (Opcional)
8. Documentación consolidada
9. Acceso super-usuario
10. Tests automatizados

---

## 🧪 TESTING SISTEMÁTICO

### Test 1: Dashboard Principal
```bash
1. npm run dev
2. Ir a /dashboard
3. Verificar que carga sin errores
4. Ver consola del navegador (F12)
5. Ver logs del servidor
```

### Test 2: Cada Módulo
```bash
Para cada uno:
- /dashboard/ordenes
- /dashboard/facturas
- /dashboard/clientes
- /dashboard/vehiculos
- /dashboard/citas

Verificar:
1. Listado carga
2. Crear nuevo funciona
3. Editar funciona
4. Eliminar funciona (soft delete)
5. No hay errores en consola
```

### Test 3: Generador de Facturas
```bash
1. Ir a /dashboard/facturas/generar
2. Seleccionar serie F
3. Llenar datos de cliente
4. Añadir 3 líneas
5. Emitir factura
6. Verificar número: F-2026-000001
7. Verificar PDF se genera
8. Repetir y verificar F-2026-000002
```

---

## 📁 ARCHIVOS QUE VOY A MODIFICAR

### Crear:
```
src/app/dashboard/admin/generar-facturas/page.tsx
src/middleware/admin.ts
README-PRODUCCION.md
```

### Modificar:
```
src/actions/**/*.ts                    (error handling)
src/infrastructure/repositories/**/*   (mappers)
src/lib/auth/obtener-usuario-fallback.ts (mejorar logging)
```

### Eliminar:
```
AUDITORIA-ERRORES.md (obsoleto)
DIAGNOSTICO-PROXY.md (obsoleto)
INSTRUCCIONES-REFACTOR.md (obsoleto)
```

---

## ⏱️ TIEMPO ESTIMADO

| Tarea | Tiempo |
|-------|--------|
| Auditoría completa | 20 min |
| Fix queries taller_id | 15 min |
| Fix deleted_at filters | 10 min |
| Fix mappers | 15 min |
| Fix error handling | 20 min |
| Acceso super-usuario | 30 min |
| Testing completo | 30 min |
| Documentación | 20 min |
| **TOTAL** | **~2.5 horas** |

---

## ✅ RESULTADO ESPERADO

Al finalizar:

1. ✅ **SEGURIDAD**: Todas las queries filtran por taller_id
2. ✅ **ESTABILIDAD**: No hay errores de columnas inexistentes
3. ✅ **RESILIENCIA**: Datos legacy no rompen la app
4. ✅ **UX**: Mensajes de error descriptivos
5. ✅ **TESTING**: Todas las rutas principales funcionan
6. ✅ **PRODUCCIÓN**: Sistema listo para usar mañana
7. ✅ **DOCUMENTACIÓN**: README consolidado y actualizado
8. ✅ **EXTRA**: Acceso super-usuario implementado

---

## 🚀 PRÓXIMOS PASOS

1. **Aprobar este plan** ✋ (esperar confirmación)
2. Ejecutar auditoría
3. Implementar fixes
4. Testing completo
5. Commit final
6. Push a producción

---

**¿Procedo con la ejecución?**
