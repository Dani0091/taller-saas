# Changelog

Todos los cambios importantes de este proyecto serán documentados aquí.

## [0.75.1] - 2026-11-08 · pre-alpha

Primera versión con numeración pre-alpha. Las entradas 1.x anteriores eran
informales; a partir de aquí se sigue SemVer desde 0.75.1.

### Facturación y numeración
- Números de factura >= 1000 sin truncar (`QA-1000`, no `QA-100`) y respuesta
  de la RPC validada antes de emitir; un solo punto de llamada a la RPC.
- Formato de producción `PREFIJO-NNN` reconocido como válido (sin avisos en logs).
- Una sola factura por orden aunque lleguen peticiones simultáneas
  (cobro rápido y factura desde orden); nunca se consume un número de más.
- Emisión idempotente ante doble clic.
- Serie por defecto: la configurada del taller (sin cambios de serie).
- Importes de factura validados (no negativos, numéricos y finitos).

### Órdenes y presupuestos
- Wizard de órdenes paso a paso; mejoras móviles.
- `/api/ordenes`: lista blanca de campos, vínculos solo con el propio taller y
  el estado "facturado" reservado a la emisión.
- Presupuesto público con caducidad, estados bloqueantes y aceptación idempotente.

### Seguridad y robustez
- Sesión obligatoria y taller tomado de la sesión en las rutas privadas.
- Proxy de imágenes restringido (host exacto, HTTPS, timeout, tamaño).
- Cuerpos JSON inválidos → 400 en lugar de 500.
- Healthcheck `/api/health` para el despliegue.

### Calidad
- Next 16.3.8 con comprobación de tipos en el build.
- 143 tests unitarios y 68 E2E (Playwright), incluidos 17 casos adversariales
  (aislamiento entre talleres, carreras, entradas inválidas).
- 22 archivos sin uso eliminados (−3.833 líneas).
- NIF históricos de clientes conservados sin sustituirlos por placeholders.

## [1.1.0] - 2025-01-13

### Correcciones Críticas

#### Error de Build TypeScript
- **Archivo**: `src/components/lineas-table.tsx:166`
- **Problema**: Error de tipos - `formData.tipo` estaba tipado como literal `'mano_obra'` en lugar de union type
- **Solución**: Añadido tipado explícito para soportar `'mano_obra' | 'pieza' | 'servicio' | 'consumible'`

#### Optimización para Móviles Low-RAM
- **Problema**: Crash en dispositivos Xiaomi y móviles con 2GB RAM al usar el escáner de fotos
- **Solución**:
  - Creado nuevo módulo `src/lib/image/compressor.ts`
  - Compresión automática de imágenes antes de subir (máx 500KB para móviles normales, 300KB para low-RAM)
  - Detección automática de dispositivos low-RAM por User Agent y `navigator.deviceMemory`
  - Actualizado `FotoUploader` para usar compresión automática

#### Borrado Lógico de Órdenes
- **Problema**: Eliminar una orden rompía la numeración secuencial
- **Solución**:
  - Implementado borrado lógico con campos `deleted_at` y `deleted_by`
  - Añadido campo `numero_visual` independiente del UUID para mostrar al usuario
  - Las órdenes eliminadas se ocultan pero mantienen su número
  - API actualizada para filtrar eliminadas por defecto

### Nuevas Funcionalidades

#### Sistema de Citas y Avisos
- Nueva tabla `citas` en base de datos
- API completa: `GET/POST /api/citas`, `GET/PUT/DELETE /api/citas/[id]`
- Tipos de cita: cita, recordatorio, aviso, ITV, revisión
- Estados: pendiente, confirmada, completada, cancelada, no asistió
- Componentes:
  - `CalendarioCitas`: Vista mensual con indicadores de citas
  - `FormularioCita`: Crear/editar citas con cliente y vehículo
- Nueva página: `/dashboard/citas`

#### Backend IA/OCR
- Nueva API: `POST /api/ocr/process`
- Procesamiento de documentos (albaranes, facturas, fotos)
- Rotación automática entre servicios gratuitos:
  1. Google Gemini (si `GEMINI_API_KEY` configurada)
  2. OpenRouter (si `OPENROUTER_API_KEY` configurada)
  3. Tesseract.js (siempre disponible, 100% gratuito)
- Extracción automática de: número documento, fecha, total, IVA, matrícula, kilometraje

#### Precios Diferenciados por Tipo de Cliente
- Nueva tabla `tarifas_cliente`
- API: `GET/POST /api/tarifas`
- Configuración por tipo: particular, empresa, autónomo, flota
- Campos: tarifa hora, tarifa urgente, descuentos en piezas/mano de obra, días de pago, límite de crédito

#### Historial de Cambios (Auditoría)
- Nueva tabla `historial_cambios`
- Registro automático de acciones: crear, actualizar, eliminar, restaurar
- Guarda datos anteriores y nuevos en JSON

### Migraciones de Base de Datos

**Archivo**: `supabase/migrations/001_borrado_logico_citas_precios.sql`

Incluye:
- Campos de borrado lógico en `ordenes_reparacion`
- Trigger para generar `numero_visual` automáticamente
- Tabla `historial_cambios` para auditoría
- Tabla `citas` para el sistema de citas
- Tabla `tarifas_cliente` para precios diferenciados
- Tabla `documentos_procesados` para OCR/IA
- Nuevos campos en `lineas_orden`: precio_coste, proveedor, referencia, tiempos
- Nuevos campos en `clientes`: fecha_nacimiento, segundo_telefono, preferencias

### Dependencias Actualizadas

- `baseline-browser-mapping`: actualizado a v2.9.14 (elimina warning de build)

### Configuración

#### Variables de Entorno Requeridas (Producción)

```bash
# Supabase (obligatorio)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Telegram (para subir fotos)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# IA/OCR (opcional, al menos uno recomendado)
GEMINI_API_KEY=
OPENROUTER_API_KEY=
```

### Archivos Creados

```
src/
├── app/
│   ├── api/
│   │   ├── citas/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── ocr/
│   │   │   └── process/route.ts
│   │   └── tarifas/
│   │       └── route.ts
│   └── dashboard/
│       └── citas/
│           └── page.tsx
├── components/
│   └── dashboard/
│       └── citas/
│           ├── calendario-citas.tsx
│           └── formulario-cita.tsx
├── lib/
│   └── image/
│       └── compressor.ts
└── types/
    └── citas.ts

supabase/
└── migrations/
    └── 001_borrado_logico_citas_precios.sql
```

### Archivos Modificados

- `src/components/lineas-table.tsx` - Fix tipado TypeScript
- `src/components/dashboard/ordenes/foto-uploader.tsx` - Añadida compresión de imágenes
- `src/app/api/ordenes/route.ts` - Añadido borrado lógico y numero_visual
- `next.config.ts` - Configuración para Tesseract.js en servidor
- `package.json` - Actualización de dependencias

---

## [1.0.0] - Versión inicial

- Sistema de gestión de talleres mecánicos
- Gestión de clientes, vehículos, órdenes y facturas
- Presupuestos públicos con firma digital
- OCR básico con Tesseract.js
- Integración con Telegram para fotos
- Cumplimiento VERIFACTU (preparado)
