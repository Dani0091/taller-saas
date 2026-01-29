# ✅ Campos Personalizables de Facturas - Revisión Completa

## Resumen

Se han revisado y **habilitado correctamente** todos los campos personalizables de facturas que estaban en la configuración pero no eran editables desde la interfaz.

## ✨ Cambios Realizados

### 1. **Interfaz de Usuario** (src/app/dashboard/configuracion/page.tsx)

Se agregó una nueva sección **"Personalización de Facturas"** con los siguientes campos editables:

#### 📋 Campos Disponibles:

1. **IBAN (Cuenta Bancaria)**
   - Formato: ES00 0000 0000 0000 0000 0000
   - Se muestra automáticamente en facturas con método de pago "Transferencia"
   - Campo de texto monoespaciado para fácil lectura

2. **Condiciones de Pago**
   - Texto corto que aparece en todas las facturas
   - Ejemplo: "Pago a 30 días desde la fecha de emisión"
   - Se muestra en el bloque de información de pago del PDF

3. **Notas Legales / Texto Adicional**
   - Texto más largo para información legal, garantías, términos
   - Ejemplo: "Garantía de 12 meses en todas las reparaciones. No se aceptan devoluciones de piezas especiales."
   - Aparece en una sección destacada al final del PDF

4. **Color Primario**
   - Selector de color visual + input de código hexadecimal
   - Usado en encabezados, bordes y elementos principales del PDF
   - Default: #0284c7 (azul cielo)

5. **Color Secundario**
   - Selector de color visual + input de código hexadecimal
   - Usado en totales y elementos de énfasis del PDF
   - Default: #0369a1 (azul oscuro)

### 2. **Base de Datos** (Verificada)

Todos los campos están correctamente definidos en `taller_config`:

```sql
-- Campos verificados en MASTER_SCHEMA.sql
iban VARCHAR(34)
condiciones_pago TEXT DEFAULT 'Pago a 30 días'
notas_factura TEXT
notas_legales TEXT
color_primario VARCHAR(7) DEFAULT '#0ea5e9'
color_secundario VARCHAR(7) DEFAULT '#f97316'
```

### 3. **API Backend** (Ya funcional)

El endpoint `/api/taller/config/actualizar` ya acepta y guarda todos estos campos:
- ✅ `iban`
- ✅ `condiciones_pago`
- ✅ `notas_factura`
- ✅ `color_primario`
- ✅ `color_secundario`

### 4. **Generación de PDFs** (Ya implementado)

El generador de PDFs (`/api/facturas/generar-pdf`) ya utiliza estos campos:

```typescript
condicionesPago: factura.condiciones_pago || tallerConfig?.condiciones_pago || null
notasLegales: tallerConfig?.notas_factura || null
iban: tallerConfig?.iban || null
colorPrimario: tallerConfig?.color_primario || '#0284c7'
colorSecundario: tallerConfig?.color_secundario || '#0369a1'
```

## 🚀 Cómo Usar

### Paso 1: Acceder a Configuración

1. Ir a **Dashboard → Configuración**
2. Desplazarse hasta la sección **"Personalización de Facturas"**

### Paso 2: Completar los Campos

```
IBAN: ES91 2100 0418 4502 0005 1332
Condiciones de Pago: Pago a 30 días desde la fecha de emisión
Notas Legales: Garantía de 12 meses en todas las reparaciones.
               No se aceptan devoluciones de piezas especiales.
               Taller autorizado por la DGT.
```

### Paso 3: Personalizar Colores (Opcional)

- Usar el selector de color o escribir código hexadecimal
- Los cambios se reflejan inmediatamente en nuevos PDFs

### Paso 4: Guardar

- Hacer clic en **"Guardar cambios"** en la parte superior
- Los nuevos valores se aplicarán a todas las facturas futuras

## 📄 Dónde Aparecen en las Facturas

### IBAN
- **Ubicación**: Bloque "Datos para el pago"
- **Condición**: Solo si el método de pago es "Transferencia bancaria"
- **Formato**: Monoespaciado para fácil lectura

### Condiciones de Pago
- **Ubicación**: Bloque "Datos para el pago"
- **Siempre visible**: Sí (si tiene contenido)

### Notas Legales
- **Ubicación**: Sección propia antes del footer
- **Estilo**: Fondo gris claro, texto pequeño
- **Propósito**: Información legal, garantías, términos

### Colores
- **Color Primario**:
  - Borde superior del documento
  - Headers de tablas
  - Bordes de bloques de información

- **Color Secundario**:
  - Textos de énfasis en headers
  - Total final (fondo degradado)
  - Footer (títulos de secciones)

## 🔧 Verificación de Base de Datos

Si necesitas verificar que tu base de datos tiene todos los campos, ejecuta:

```bash
# Ver el script de verificación
cat supabase/migrations/verificar_campos_personalizables_facturas.sql
```

O ejecuta directamente en Supabase SQL Editor:

```sql
-- Verificar campos existentes
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'taller_config'
AND column_name IN ('iban', 'condiciones_pago', 'notas_factura', 'color_primario', 'color_secundario')
ORDER BY column_name;
```

## ✅ Estado del Sistema

| Componente | Estado | Notas |
|------------|--------|-------|
| Schema DB | ✅ Correcto | Todos los campos presentes |
| API Backend | ✅ Funcional | Acepta y guarda valores |
| Interfaz Usuario | ✅ Completado | Inputs agregados y funcionales |
| Generador PDF | ✅ Implementado | Usa los valores correctamente |
| Documentación | ✅ Completa | Este archivo |

## 📝 Ejemplos de Uso

### Taller General
```
Condiciones: Pago al contado o 50% anticipo + 50% a la entrega
Notas: Garantía de 6 meses. Piezas originales o de calidad equivalente.
```

### Taller Premium
```
Condiciones: Pago a 30 días para empresas, al contado para particulares
Notas: Garantía extendida de 24 meses en todas las reparaciones.
       Servicio de asistencia en carretera incluido durante el período de garantía.
       Taller oficial autorizado por las principales marcas.
```

### Taller de Flotas
```
Condiciones: Facturación mensual según contrato marco
Notas: Descuentos aplicados según acuerdo comercial vigente.
       Servicio 24/7 disponible para flota premium.
       Reportes mensuales de mantenimiento incluidos.
```

## 🎨 Personalización de Marca

Los colores permiten adaptar las facturas a tu identidad corporativa:

```
Marca Deportiva:
- Primario: #dc2626 (rojo intenso)
- Secundario: #991b1b (rojo oscuro)

Marca Ecológica:
- Primario: #16a34a (verde)
- Secundario: #15803d (verde oscuro)

Marca Clásica:
- Primario: #1e40af (azul marino)
- Secundario: #1e3a8a (azul oscuro)
```

## 🔄 Próximos Pasos

1. **Ir a Configuración** y completar los campos según las necesidades de tu taller
2. **Generar una factura de prueba** para ver cómo se visualizan los cambios
3. **Ajustar colores** si es necesario para que coincidan con tu marca
4. **Revisar el PDF generado** y asegurarse de que todo se ve profesional

---

**Fecha de actualización**: 2026-01-29
**Archivo**: `CAMPOS_PERSONALIZABLES_FACTURAS.md`
