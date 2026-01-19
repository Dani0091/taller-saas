# 📘 GUÍA COMPLETA DE ACTUALIZACIÓN - Taller SaaS
**Fecha:** 19 de Enero de 2025
**Branch:** `claude/fix-invoice-pdf-number-aLPOS`

---

## 🎯 RESUMEN DE CAMBIOS

### **✅ Correcciones Críticas**
1. ✅ **Error 500** al crear factura desde orden → SOLUCIONADO
2. ✅ **Duplicación de número de factura** (SRSR101 → SR101) → CORREGIDO
3. ✅ **Notas legales** ahora son personalizables en el PDF
4. ✅ **Valores por defecto** mejorados (Valencia, sin hardcoded)

### **✨ Nuevas Funcionalidades**
1. ✅ **Horas de trabajo extendidas** hasta 100+ horas
2. ✅ **Nombres de fotos simplificados** (Foto Frontal, Foto Trasera)
3. ✅ **Upload de foto en notas internas** para documentación
4. ✅ **Sistema de Suplidos y Reembolsos** completo
5. ✅ **Auto-rellenado de precio hora** desde configuración

### **🎨 Mejoras de UX**
1. ✅ "Líneas" renombrado a "Elementos"
2. ✅ Serie de facturación con UI mejorada
3. ✅ Tooltips explicativos para suplidos/reembolsos
4. ✅ PDF con identificación visual de suplidos

---

## 📦 COMMITS REALIZADOS

### Commit 1: `9036d16` - Correcciones críticas en facturas y PDFs
- Fix duplicación número factura
- Notas legales personalizables
- UI mejorada para series
- "Líneas" → "Elementos"

### Commit 2: `425b1be` - Corregir error 500 y mejorar UX
- ARREGLADO error 500 al crear factura
- Migración SQL para campos faltantes
- Valores por defecto mejorados

### Commit 3: `ead2f77` - Mapeo completo y auto-rellenado
- Restaurar mapeo completo de líneas
- Auto-rellenado de precio hora
- Migración para suplidos/reembolsos

### Commit 4: `bffc19f` - UX mejorada para órdenes
- Horas extendidas (hasta 100h)
- Nombres de fotos simplificados
- Upload de foto en notas
- UI para suplidos/reembolsos

### Commit 5: `40ea458` - Mejoras en PDF
- Endpoint generar-pdf completo
- Renderizado de suplidos en PDF

---

## 🗄️ SCRIPTS SQL PARA APLICAR

### **1. Migración: Soporte para Suplidos y Reembolsos**

```sql
-- ============================================================================
-- MIGRACIÓN: Añadir soporte para Suplidos y Reembolsos
-- Fecha: 2025-01-19
-- Descripción: Configurar tipo_linea para manejar suplidos y reembolsos
-- ============================================================================

-- Añadir comentario explicativo al campo tipo_linea
COMMENT ON COLUMN lineas_factura.tipo_linea IS 'Tipo de línea: servicio (normal con IVA), suplido (sin IVA, directo al total), reembolso (con IVA, suma a base)';

-- Crear índice para mejorar consultas por tipo
CREATE INDEX IF NOT EXISTS idx_lineas_factura_tipo_linea ON lineas_factura(tipo_linea);

-- Función helper para calcular totales con suplidos
CREATE OR REPLACE FUNCTION calcular_total_factura_con_suplidos(p_factura_id UUID)
RETURNS TABLE (
    subtotal NUMERIC,
    total_iva NUMERIC,
    total_suplidos NUMERIC,
    total_final NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        -- Subtotal: suma de base_imponible de servicios y reembolsos (NO suplidos)
        COALESCE(SUM(CASE WHEN tipo_linea IN ('servicio', 'reembolso') THEN base_imponible ELSE 0 END), 0) as subtotal,
        -- IVA: suma de iva_importe de servicios y reembolsos
        COALESCE(SUM(CASE WHEN tipo_linea IN ('servicio', 'reembolso') THEN iva_importe ELSE 0 END), 0) as total_iva,
        -- Suplidos: suma de total_linea de suplidos (sin IVA)
        COALESCE(SUM(CASE WHEN tipo_linea = 'suplido' THEN total_linea ELSE 0 END), 0) as total_suplidos,
        -- Total final: subtotal + IVA + suplidos
        COALESCE(SUM(CASE WHEN tipo_linea IN ('servicio', 'reembolso') THEN total_linea ELSE total_linea END), 0) as total_final
    FROM lineas_factura
    WHERE factura_id = p_factura_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calcular_total_factura_con_suplidos IS 'Calcula totales de factura considerando suplidos que no llevan IVA';
```

**✅ Aplicar en:** Supabase SQL Editor → Run

---

## 🔧 CONFIGURACIÓN DE GOOGLE CLOUD VISION (OCR)

### **Por qué cambiar de Tesseract a Google Cloud Vision:**
- ✅ Mejor precisión en matrícula y VIN
- ✅ Sin problemas de memoria
- ✅ Tier gratuito: **1,000 peticiones/mes GRATIS**
- ✅ Rápido y escalable

### **Pasos para Configurar:**

#### **1. Crear Proyecto en Google Cloud**
```bash
1. Ir a: https://console.cloud.google.com/
2. Crear nuevo proyecto: "taller-saas-ocr"
3. Anotar el Project ID
```

#### **2. Habilitar Vision API**
```bash
1. En el proyecto, ir a: APIs & Services > Library
2. Buscar: "Cloud Vision API"
3. Click "Enable"
```

#### **3. Crear Credenciales (Service Account)**
```bash
1. Ir a: IAM & Admin > Service Accounts
2. Click "Create Service Account"
   - Name: "ocr-service"
   - Role: "Cloud Vision API User"
3. Click "Create Key" → JSON
4. Descargar archivo JSON (guardar seguro)
```

#### **4. Configurar en Supabase**

**Opción A: Variables de Entorno (Recomendado)**
```bash
# En Supabase Dashboard → Settings → Secrets
GOOGLE_VISION_API_KEY=<tu-api-key>
GOOGLE_PROJECT_ID=<tu-project-id>
```

**Opción B: Tabla de Configuración**
```sql
-- Añadir campos a taller_config
ALTER TABLE taller_config
ADD COLUMN IF NOT EXISTS google_vision_api_key TEXT,
ADD COLUMN IF NOT EXISTS google_vision_enabled BOOLEAN DEFAULT FALSE;
```

#### **5. Actualizar Código de OCR**

Crear archivo: `/home/user/taller-saas/src/lib/ocr/google-vision-service.ts`

```typescript
import { ImageAnnotatorClient } from '@google-cloud/vision'

// Inicializar cliente
const client = new ImageAnnotatorClient({
  credentials: JSON.parse(process.env.GOOGLE_VISION_CREDENTIALS || '{}')
})

export async function extraerTextoConVision(base64Image: string) {
  try {
    const [result] = await client.textDetection({
      image: { content: base64Image.split(',')[1] }
    })

    const detections = result.textAnnotations || []
    const texto = detections[0]?.description || ''

    // Detectar matrícula con regex mejorado
    const matriculaMatch = texto.match(/\b[0-9]{4}\s?[A-Z]{3}\b/i)

    return {
      texto,
      matricula: matriculaMatch ? matriculaMatch[0].replace(/\s/g, '') : null,
      confianza: detections[0]?.confidence || 0
    }
  } catch (error) {
    console.error('Error en Vision API:', error)
    throw error
  }
}
```

#### **6. Instalar Dependencias**
```bash
npm install @google-cloud/vision
# o
bun add @google-cloud/vision
```

---

## 📊 GUÍA DE FLUJOS DE LA APLICACIÓN

### **FLUJO 1: Crear Orden de Reparación**
```
1. Dashboard → Órdenes → Nueva Orden
2. Seleccionar Cliente (crear si no existe)
3. Seleccionar Vehículo (crear si no existe)
4. Tab "Info" → Datos básicos
5. Tab "Fotos" → Subir fotos del vehículo
   - Foto Frontal
   - Foto Trasera
   - Lateral Izquierdo
   - Lateral Derecho
6. Tab "Trabajo" → Descripción y diagnóstico
   - Notas internas
   - Upload de hoja de orden (opcional)
7. Tab "Elementos" → Añadir líneas
   - Mano de obra (precio auto-rellenado)
   - Piezas / Recambios
   - Servicios externos
   - Suplidos (ITV, multa, etc.)
   - Reembolsos (compras por cliente)
8. Guardar orden
```

### **FLUJO 2: Crear Factura desde Orden**
```
1. Abrir orden completada/aprobada
2. Click "Generar Factura"
3. Sistema automáticamente:
   - Crea factura con serie correcta
   - Mapea todas las líneas (mano obra, piezas, suplidos)
   - Calcula totales:
     * Servicios/Reembolsos → Base + IVA
     * Suplidos → Directo al total SIN IVA
4. Factura en estado "Borrador"
5. Cambiar a "Emitida" cuando esté lista
```

### **FLUJO 3: Configurar Series de Facturación**
```
1. Configuración → Configuración de Facturación
2. "Serie por Defecto" → Para auto-creación
3. "Series Adicionales" → Para casos específicos
   - Crear serie "FA" para facturas normales
   - Crear serie "RE" para rectificativas
   - Crear serie "AB" para abonos
4. El sistema usa automáticamente la serie correcta
```

### **FLUJO 4: Personalizar PDF de Facturas**
```
1. Configuración → Datos de la Empresa
   - Subir logo (aparece en PDF)
   - Datos fiscales completos

2. Configuración → Colores de Marca
   - Color primario (cabecera PDF)
   - Color secundario (acentos)

3. Configuración → Datos Bancarios
   - Notas Legales / Pie de Factura
   - Este texto aparece en TODAS las facturas
   - Ejemplo: "Garantía de 2 años en reparaciones"
```

### **FLUJO 5: OCR para Matrícula/VIN**
```
1. Al crear vehículo → Botón cámara junto a campos
2. Tomar foto de:
   - Matrícula
   - Bastidor/VIN
   - Kilometraje
3. Sistema procesa con OCR
4. Rellena campos automáticamente
5. Verificar y ajustar si necesario
```

---

## 🧮 LÓGICA DE CÁLCULO DE FACTURAS

### **Tipos de Líneas:**

#### **1. Servicio / Mano de Obra / Pieza**
```
Base Imponible = Cantidad × Precio
IVA = Base Imponible × (% IVA / 100)
Total Línea = Base Imponible + IVA

✅ Suma a Base Imponible
✅ Lleva IVA
```

#### **2. Reembolso**
```
Base Imponible = Total del Ticket
IVA = Base Imponible × (% IVA / 100)
Total Línea = Base Imponible + IVA

✅ Suma a Base Imponible
✅ Lleva IVA
```

#### **3. Suplido**
```
Base Imponible = 0 (NO suma a base)
IVA = 0 (SIN IVA)
Total Línea = Cantidad × Precio

❌ NO suma a Base Imponible
❌ NO lleva IVA
✅ Suma DIRECTO al Total Final
```

### **Cálculo Total de Factura:**
```sql
Subtotal = Σ(Servicios + Reembolsos)
IVA Total = Subtotal × (% IVA / 100)
Total Suplidos = Σ(Suplidos)
TOTAL FACTURA = Subtotal + IVA + Suplidos
```

---

## ✅ CHECKLIST DE VERIFICACIÓN

### **Antes de Empezar Mañana:**
- [ ] Aplicar migración SQL en Supabase
- [ ] Verificar que facturas se crean correctamente
- [ ] Probar crear factura desde orden
- [ ] Verificar PDF se genera sin duplicación
- [ ] Revisar que suplidos aparecen correctamente
- [ ] Configurar Google Cloud Vision (opcional)

### **Al Crear Primera Orden:**
- [ ] Cliente se crea/selecciona correctamente
- [ ] Vehículo se asocia bien
- [ ] Fotos se suben con nombres correctos
- [ ] Horas de mano de obra muestran hasta 100h
- [ ] Precio hora se auto-rellena desde config
- [ ] Suplidos/reembolsos funcionan

### **Al Generar Primera Factura:**
- [ ] Número de factura es correcto (ej: FA001, no FAFA001)
- [ ] Líneas se copian completas de la orden
- [ ] Suplidos aparecen con prefijo "💸 SUPLIDO:"
- [ ] Totales calculan correctamente
- [ ] PDF incluye logo y colores personalizados
- [ ] Notas legales aparecen en el PDF

---

## 🆘 TROUBLESHOOTING

### **Error: "Error 500 al crear factura"**
**Solución:** Aplicar migración SQL de suplidos

### **Número de factura duplicado (SRSR101)**
**Solución:** Ya corregido en commit `9036d16`

### **Horas de mano de obra limitadas a 8h**
**Solución:** Ya corregido en commit `bffc19f`

### **OCR no detecta matrícula**
**Soluciones:**
1. Mejorar iluminación de la foto
2. Tomar foto más cerca
3. Configurar Google Cloud Vision (mejor precisión)

### **Suplidos suman con IVA incorrectamente**
**Solución:** Verificar que tipo_linea sea 'suplido' (no 'servicio')

---

## 📞 SOPORTE

- **Documentación:** Este archivo
- **Migraciones:** `/supabase/migrations/`
- **Branch:** `claude/fix-invoice-pdf-number-aLPOS`
- **Commits:** Ver historial con `git log --oneline`

---

## 🚀 PRÓXIMOS PASOS (Futuro)

1. **Integración con Verifactu** (cumplimiento fiscal)
2. **Firma electrónica de presupuestos**
3. **Notificaciones automáticas** por email/SMS
4. **Dashboard de métricas** y KPIs
5. **App móvil** para mecánicos

---

**¡Todo listo para mañana! 🎉**
