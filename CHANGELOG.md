# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

## [2025-01-13] - Correcciones Críticas y Nuevas Funcionalidades

### Correcciones de Build
- **Fix TypeScript error** en `lineas-table.tsx:166`: Corregido tipo de `formData.tipo` de `'mano_obra' as const` a `LineaOrden['tipo']` para permitir comparaciones con otros tipos ('pieza', 'consumible')
- **Actualizado `baseline-browser-mapping`** a versión 2.9.14 para eliminar warnings de datos obsoletos

### Optimizaciones para Móviles (Xiaomi, low-RAM)
- **Nuevo compresor de imágenes** (`/lib/utils/image-compressor.ts`):
  - Compresión adaptativa según RAM del dispositivo
  - Límite de 800x800px y calidad 60% para dispositivos con ≤4GB RAM
  - Detección automática de dispositivos Xiaomi, Redmi, POCO
  - Liberación agresiva de memoria tras procesar

### Backend OCR (Evita crashes en móviles)
- **Nueva API `/api/ocr/process`**: Procesamiento de OCR en servidor
  - Integración con Gemini 2.0 Flash (gratis)
  - Fallback a OCR.space si Gemini falla
  - Extracción de matrículas españolas y kilometraje
  - Variables de entorno: `GEMINI_API_KEY`, `OCR_SPACE_API_KEY`

### Sistema de Órdenes Mejorado
- **Borrado lógico** (soft delete): Las órdenes ya no se eliminan, se marcan con `deleted_at`
  - Campo `motivo_eliminacion` para auditoría
  - Campo `eliminado_por` para trazabilidad
  - Función `restaurarOrden()` para recuperar órdenes eliminadas
- **Numeración visual** independiente del ID:
  - Campo `numero_visual` auto-incrementado por taller
  - Trigger automático en INSERT
  - La numeración NO se rompe al eliminar órdenes

### Nuevas Migraciones SQL (`supabase/migrations/20250113_complete_upgrade.sql`)

#### Tablas nuevas:
- **`citas`**: Sistema de citas y avisos con calendario
  - Tipos: revision, reparacion, entrega, presupuesto, itv
  - Estados: pendiente, confirmada, completada, cancelada
  - Recordatorios y colores para calendario
- **`tarifas_cliente`**: Precios diferenciados por tipo de cliente
  - Descuentos en mano de obra y piezas por tipo
  - Tarifa hora especial por tipo de cliente
  - Condiciones de pago personalizadas
- **`historial_ordenes`**: Auditoría de cambios en órdenes
  - Qué campo cambió, valor anterior/nuevo
  - Usuario y fecha de cada cambio

#### Campos nuevos en `ordenes_reparacion`:
- `deleted_at`: Timestamp de borrado lógico
- `numero_visual`: Número amigable para el usuario
- `motivo_eliminacion`: Razón del borrado
- `eliminado_por`: UUID del usuario que eliminó

#### Campos nuevos en `lineas_orden`:
- `precio_coste`: Precio de coste de piezas
- `proveedor`: Nombre del proveedor
- `referencia`: Referencia del artículo
- `tarifa_hora_aplicada`: Tarifa usada (histórico)
- `horas_calculadas`: Horas auto-calculadas

#### Campos nuevos en `clientes`:
- `tarifa_id`: Referencia a tarifa especial
- `descuento_especial`: Descuento personalizado

### Vistas SQL creadas:
- `v_ordenes_activas`: Órdenes no eliminadas con datos de cliente/vehículo
- `v_citas_hoy`: Citas del día actual

### Variables de Entorno Necesarias (Railway)
```
TELEGRAM_BOT_TOKEN=tu_token
TELEGRAM_CHAT_ID=tu_chat_id
GEMINI_API_KEY=tu_api_key (opcional, para OCR)
OCR_SPACE_API_KEY=tu_api_key (opcional, fallback)
```

---

## Cómo aplicar la migración SQL

1. Ve a Supabase Dashboard → SQL Editor
2. Copia el contenido de `supabase/migrations/20250113_complete_upgrade.sql`
3. Ejecuta la migración
4. Verifica con:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'ordenes_reparacion'
AND column_name IN ('deleted_at', 'numero_visual');
```
