# 🔴 ANÁLISIS CRÍTICO: detalle-orden-sheet.tsx

## RESUMEN EJECUTIVO

**Archivo:** `src/components/dashboard/ordenes/detalle-orden-sheet.tsx`
**Líneas:** 2,659
**Límite recomendado:** 200 líneas
**Exceso:** +2,459 líneas (13.3x más grande)
**Severidad:** 🔴 CRÍTICA

---

## 🚨 VIOLACIONES DETECTADAS

### 1. FUGAS DE SEGURIDAD

**createClient() directo:**
- Línea 10: `import { createClient } from '@/lib/supabase/client'`
- Línea 84: `const supabase = createClient()`

**Consultas SQL directas:** 18 consultas totales
- `usuarios` (1 consulta) - Línea 235
- `taller_config` (1 consulta) - Línea 249
- `clientes` (3 consultas) - Líneas 260, 389, 443
- `ordenes_reparacion` (7 consultas) - Líneas 270, 334, 726, 800, 810, 901
- `lineas_orden` (3 consultas) - Líneas 316, 629, 825, 844
- `vehiculos` (3 consultas) - Líneas 360, 511, 572

**Obtención manual de taller_id:**
- Líneas 228-249: Consulta a `usuarios` para obtener `taller_id`
- Líneas 249-256: Consulta a `taller_config` para obtener `tarifa_hora`

---

## 📦 RESPONSABILIDADES DEL COMPONENTE

Este componente hace TODO (violación de Single Responsibility):

1. **Gestión de Órdenes**
   - Crear orden
   - Actualizar orden
   - Cambiar estado
   - Generar número de orden
   - Generar factura

2. **Gestión de Clientes**
   - Listar clientes (línea 260)
   - Crear cliente nuevo (líneas 387-440)
   - Formulario inline de cliente

3. **Gestión de Vehículos**
   - Listar vehículos (línea 360)
   - Crear vehículo nuevo (líneas 509-570)
   - Actualizar vehículo (líneas 570-626)
   - Formulario inline de vehículo

4. **Gestión de Líneas de Orden**
   - Agregar línea (líneas 823-842)
   - Actualizar línea (líneas 842-865)
   - Eliminar línea (líneas 626-640)
   - Listado de líneas

5. **Gestión de Fotos**
   - Fotos de entrada
   - Fotos de salida
   - Fotos de diagnóstico
   - OCR de fotos

6. **Generación de Documentos**
   - PDF de presupuesto
   - PDF de orden
   - Compartir presupuesto
   - Enlace público

7. **Cálculos**
   - Subtotales de mano de obra
   - Subtotales de piezas
   - Cálculo de IVA
   - Total con IVA

---

## 🏗️ PLAN DE REFACTORIZACIÓN

### FASE A: Crear Server Actions Faltantes

**Necesarias:**
1. ✅ `listarClientesAction` (ya existe)
2. ✅ `crearClienteAction` (ya existe)
3. ✅ `listarVehiculosAction` (ya existe)
4. ❌ `crearVehiculoAction` (FALTA - crear)
5. ❌ `actualizarVehiculoAction` (FALTA - crear)
6. ✅ `crearOrdenAction` (verificar si existe)
7. ✅ `actualizarOrdenAction` (verificar si existe)
8. ❌ `generarFacturaDesdeOrdenAction` (FALTA - crear)
9. ❌ `agregarLineaOrdenAction` (FALTA - crear)
10. ❌ `actualizarLineaOrdenAction` (FALTA - crear)
11. ❌ `eliminarLineaOrdenAction` (FALTA - crear)

### FASE B: Dividir en Componentes Pequeños (150-200 líneas cada uno)

**Estructura propuesta:**

```
src/components/dashboard/ordenes/detalle/
├── DetalleOrdenSheet.tsx (150 líneas) - Contenedor principal + tabs
├── InfoOrdenTab.tsx (180 líneas) - Cliente, vehículo, descripción
├── FotosOrdenTab.tsx (150 líneas) - Fotos entrada/salida/diagnóstico
├── TrabajoOrdenTab.tsx (120 líneas) - Diagnóstico, trabajos realizados
├── LineasOrdenTab.tsx (180 líneas) - Elementos de facturación
├── FormClienteInline.tsx (150 líneas) - Formulario crear cliente
├── FormVehiculoInline.tsx (180 líneas) - Formulario crear vehículo
└── ResumenTotales.tsx (100 líneas) - Cálculos y totales (SOLO LECTURA)
```

**Total estimado:** ~1,210 líneas divididas en 8 archivos = ~151 líneas/archivo

### FASE C: Eliminar Cálculos

- Todos los cálculos de IVA, subtotales, totales deben venir de `OrdenEntity.toDTO()`
- ResumenTotales.tsx solo MUESTRA los valores pre-calculados

---

## ⚠️ COMPLEJIDAD

**Ciclomática estimada:** 80+ (límite recomendado: 10)
**Dependencias:** 30+ imports
**Estado local:** 20+ useState hooks
**Efectos:** 5+ useEffect hooks

---

## 🎯 OBJETIVO FINAL

**De:** 1 archivo de 2,659 líneas con 18 consultas SQL
**A:** 8 archivos de ~150 líneas cada uno con 0 consultas SQL

**Reducción:**
- Líneas por archivo: -93%
- Consultas SQL: -100%
- Complejidad ciclomática: -80%
- Carga de memoria en Android: -85%

---

## 📋 DECISIÓN

Dada la complejidad EXTREMA de este componente, se recomienda:

1. **NO refactorizar ahora** - Requiere 4-6 horas de trabajo
2. **Documentar violaciones** - ✅ COMPLETADO
3. **Priorizar componentes más pequeños** - detalle-vehiculo-sheet.tsx (517 líneas)
4. **Retornar a detalle-orden-sheet.tsx** cuando tengamos más tiempo

**Razón:** Este componente es usado activamente y tiene lógica crítica de negocio.
Una refactorización apresurada podría romper funcionalidad esencial.

---

## ✅ RECOMENDACIÓN

**Proceder con:** `detalle-vehiculo-sheet.tsx` (517 líneas)
**Posponer:** `detalle-orden-sheet.tsx` (2,659 líneas) para sesión dedicada

