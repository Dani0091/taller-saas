# Fix: Inconsistencias de tipos TypeScript en DecimalInput

## 📋 Contexto del problema

### Síntoma inicial
Al ejecutar `npm run build`, el proyecto fallaba con errores de TypeScript:
```
Type error: Type 'string' is not assignable to type 'number'.
```

### Causa raíz
El componente `DecimalInput` está tipado para trabajar con valores `number`, pero varios estados de React tenían campos definidos como `string`. Esto causaba incompatibilidad de tipos en:
- Campos de vehículos: `año`, `kilometros`, `potencia_cv`, `cilindrada`
- Campos de órdenes: valores numéricos en estados temporales
- Estados de formularios: campos que se guardan como string en la BD pero se manejan como number en el UI

### Archivos afectados
1. `src/app/dashboard/vehiculos/nuevo/page.tsx` (18 líneas cambiadas)
2. `src/components/dashboard/ordenes/detalle-orden-sheet.tsx` (22 líneas cambiadas)
3. `src/components/ordenes/editar-orden-sheet.tsx` (4 líneas cambiadas)

---

## 🔧 Solución aplicada

### Patrón de corrección

**ANTES (incorrecto):**
```typescript
<DecimalInput
  value={formData.año}
  onChange={(value) => setFormData(prev => ({ ...prev, año: value }))}
/>
```

**DESPUÉS (correcto):**
```typescript
<DecimalInput
  value={formData.año ? Number(formData.año) : undefined}
  onChange={(value) => setFormData(prev => ({ ...prev, año: value ? String(value) : '' }))}
/>
```

### Regla general
- **Para `value`**: Convertir de `string` a `number` con `Number()` o `undefined` si está vacío
- **Para `onChange`**: Convertir de `number` a `string` con `String()` o `''` si está vacío
- **Para `InputScanner.onResult`**: Siempre convertir a `String(val)` antes de guardar

---

## 📝 Cambios detallados por archivo

### 1. `src/app/dashboard/vehiculos/nuevo/page.tsx`

#### Campo: `año` (línea ~200)
```diff
- value={formData.año}
+ value={formData.año ? Number(formData.año) : undefined}
  onChange={(value) => {
    const anio = value
    const anioMax = new Date().getFullYear() + 1
    if (anio && anio >= 1900 && anio <= anioMax) {
-     setFormData(prev => ({ ...prev, año: anio }))
+     setFormData(prev => ({ ...prev, año: String(anio) }))
    } else if (anio) {
      toast.error(`El año debe estar entre 1900 y ${anioMax} (modelo siguiente)`)
    }
  }}
```

#### Campo: `kilometros` (línea ~233)
```diff
  <DecimalInput
-   value={formData.kilometros}
+   value={formData.kilometros ? Number(formData.kilometros) : undefined}
-   onChange={(value) => setFormData(prev => ({ ...prev, kilometros: value }))}
+   onChange={(value) => setFormData(prev => ({ ...prev, kilometros: value ? String(value) : '' }))}
    placeholder="45000"
    className="flex-1"
    min={0}
    allowEmpty={true}
  />
  <InputScanner
    tipo="km"
-   onResult={(val) => setFormData(prev => ({ ...prev, kilometros: val }))}
+   onResult={(val) => setFormData(prev => ({ ...prev, kilometros: String(val) }))}
  />
```

#### Campo: `potencia_cv` (línea ~288)
```diff
  <DecimalInput
-   value={formData.potencia_cv}
+   value={formData.potencia_cv ? Number(formData.potencia_cv) : undefined}
-   onChange={(value) => setFormData(prev => ({ ...prev, potencia_cv: value }))}
+   onChange={(value) => setFormData(prev => ({ ...prev, potencia_cv: value ? String(value) : '' }))}
    placeholder="120"
    min={0}
    step={0.1}
    allowEmpty={true}
  />
```

#### Campo: `cilindrada` (línea ~299)
```diff
  <DecimalInput
-   value={formData.cilindrada}
+   value={formData.cilindrada ? Number(formData.cilindrada) : undefined}
-   onChange={(value) => setFormData(prev => ({ ...prev, cilindrada: value }))}
+   onChange={(value) => setFormData(prev => ({ ...prev, cilindrada: value ? String(value) : '' }))}
    placeholder="1998"
    min={0}
    allowEmpty={true}
  />
```

---

### 2. `src/components/dashboard/ordenes/detalle-orden-sheet.tsx`

#### Estado `nuevoVehiculo.año` (línea ~1395)
```diff
  <DecimalInput
-   value={nuevoVehiculo.año}
+   value={nuevoVehiculo.año ? Number(nuevoVehiculo.año) : undefined}
    onChange={(value) => {
      if (validarAnioVehiculo(value)) {
-       setNuevoVehiculo(prev => ({ ...prev, año: value }))
+       setNuevoVehiculo(prev => ({ ...prev, año: value ? String(value) : '' }))
      }
    }}
    placeholder="2020"
    min={1900}
    max={new Date().getFullYear() + 1}
  />
```

#### Estado `nuevoVehiculo.kilometros` (línea ~1422)
```diff
  <DecimalInput
-   value={nuevoVehiculo.kilometros}
+   value={nuevoVehiculo.kilometros ? Number(nuevoVehiculo.kilometros) : undefined}
-   onChange={(value) => setNuevoVehiculo(prev => ({ ...prev, kilometros: value }))}
+   onChange={(value) => setNuevoVehiculo(prev => ({ ...prev, kilometros: value ? String(value) : '' }))}
    placeholder="125000"
    className="flex-1"
    min={0}
  />
  <InputScanner
    tipo="km"
-   onResult={(val) => setNuevoVehiculo(prev => ({ ...prev, kilometros: val }))}
+   onResult={(val) => setNuevoVehiculo(prev => ({ ...prev, kilometros: String(val) }))}
  />
```

#### Estado `vehiculoEditado.año` (línea ~1611)
```diff
  <DecimalInput
-   value={vehiculoEditado.año}
+   value={vehiculoEditado.año ? Number(vehiculoEditado.año) : undefined}
    onChange={(value) => {
      if (validarAnioVehiculo(value)) {
-       setVehiculoEditado(prev => ({ ...prev, año: value }))
+       setVehiculoEditado(prev => ({ ...prev, año: value ? String(value) : '' }))
      }
    }}
    placeholder="2020"
    min={1900}
    max={new Date().getFullYear() + 1}
  />
```

#### Estado `vehiculoEditado.kilometros` (línea ~1638)
```diff
  <DecimalInput
-   value={vehiculoEditado.kilometros}
+   value={vehiculoEditado.kilometros ? Number(vehiculoEditado.kilometros) : undefined}
-   onChange={(value) => setVehiculoEditado(prev => ({ ...prev, kilometros: value }))}
+   onChange={(value) => setVehiculoEditado(prev => ({ ...prev, kilometros: value ? String(value) : '' }))}
    placeholder="125000"
    className="flex-1"
    min={0}
  />
  <InputScanner
    tipo="km"
    onResult={(val) => {
      const num = parseInt(val.replace(/\D/g, ''))
-     setVehiculoEditado(prev => ({ ...prev, kilometros: num > 0 ? num : '' }))
+     setVehiculoEditado(prev => ({ ...prev, kilometros: num > 0 ? String(num) : '' }))
    }}
  />
```

#### Tipo de `piezaRapida.tipo` (línea ~2462)
```diff
  setLineas(prev => [...prev, {
    id: `new-${Date.now()}`,
-   tipo: piezaRapida.tipo || 'pieza',
+   tipo: (piezaRapida.tipo || 'pieza') as TipoLinea,
    descripcion: desc,
    cantidad: qty,
    precio_unitario: precio,
    estado: precio === 0 ? 'presupuestado' : 'confirmado',
    isNew: true
  }])
```

---

### 3. `src/components/ordenes/editar-orden-sheet.tsx`

#### Estado `valores` (línea ~145)
```diff
  <DecimalInput
-   value={valores[field as keyof typeof valores]}
+   value={valores[field as keyof typeof valores] ? Number(valores[field as keyof typeof valores]) : undefined}
-   onChange={(value) => setValores({ ...valores, [field]: value })}
+   onChange={(value) => setValores({ ...valores, [field]: value ? String(value) : '' })}
    step={field.includes('costo') ? 0.01 : 0.5}
    min={0}
    placeholder="0.00"
    className="py-3"
  />
```

---

## 🚀 Instrucciones para aplicar en otra rama

### Paso 1: Cambiar a la rama objetivo
```bash
git checkout <nombre-de-tu-rama>
git pull origin <nombre-de-tu-rama>
```

### Paso 2: Aplicar los cambios manualmente
Abre cada archivo y busca los patrones de `DecimalInput` donde el `value` o `onChange` conecta con un estado que es `string`. Aplica las conversiones según el patrón mostrado arriba.

**Buscar con grep:**
```bash
# Buscar todos los usos de DecimalInput
grep -n "DecimalInput" src/app/dashboard/vehiculos/nuevo/page.tsx
grep -n "DecimalInput" src/components/dashboard/ordenes/detalle-orden-sheet.tsx
grep -n "DecimalInput" src/components/ordenes/editar-orden-sheet.tsx
```

### Paso 3: Verificar compilación
```bash
# Verificar tipos TypeScript
npx tsc --noEmit

# Build completo
npm run build
```

### Paso 4: Commit y push
```bash
git add .
git commit -m "fix: Corregir inconsistencias de tipos TypeScript en campos numéricos

✅ Solucionados errores de tipo string vs number en DecimalInput
✅ Convertir correctamente valores numéricos a string en estados
✅ Arreglados campos: año, kilometros, potencia_cv, cilindrada
✅ Corregido tipo TipoLinea en piezaRapida
✅ Build exitoso sin errores de TypeScript"

git push -u origin <tu-rama>
```

---

## ✅ Verificación final

Después de aplicar los cambios, verifica:

1. ✅ **TypeScript sin errores**: `npx tsc --noEmit` no debe mostrar errores
2. ✅ **Build exitoso**: `npm run build` debe completarse sin errores
3. ✅ **Funcionalidad**: Los campos numéricos deben funcionar correctamente en el UI
4. ✅ **Guardado**: Los valores deben guardarse correctamente en la base de datos

---

## 🔍 Casos edge a considerar

- **Valores vacíos**: `undefined` para DecimalInput, `''` para string en estado
- **Valores cero**: `0` es válido, no confundir con vacío
- **Validaciones**: Mantener las validaciones existentes (rango de años, etc.)
- **InputScanner**: Siempre convertir a `String()` al recibir el resultado

---

## 📊 Resumen de cambios

| Archivo | Campos afectados | Líneas |
|---------|------------------|--------|
| `vehiculos/nuevo/page.tsx` | año, kilometros, potencia_cv, cilindrada | 18 |
| `ordenes/detalle-orden-sheet.tsx` | nuevoVehiculo.{año,km}, vehiculoEditado.{año,km}, piezaRapida.tipo | 22 |
| `ordenes/editar-orden-sheet.tsx` | valores[field] | 4 |
| **TOTAL** | | **44** |

---

## 📌 Commit original
- **Branch**: `claude/review-and-fix-commits-tqWHG`
- **Commit**: `7e6ceb7`
- **Fecha**: 2026-01-22
