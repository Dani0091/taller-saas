# Changelog

Todos los cambios importantes de este proyecto serán documentados aquí.

## [0.75.7] - 2026-11-10 · pre-alpha

Pantallas que se descuadraban en móvil, tablet o con nombres largos. Sin
cambios de base de datos.

### Corregido
- **Nueva factura:** un cliente con nombre largo ensanchaba el desplegable y
  empujaba el botón «Nuevo» fuera de la tarjeta. Los desplegables tienen
  ahora la misma altura y estilo que los campos de texto, y «Matrícula» queda
  alineada con el resto de la fila.
- **Clientes, órdenes y vehículos en móvil:** con un cliente de nombre largo,
  las tarjetas se salían de la pantalla y los botones Editar/Eliminar
  quedaban cortados.
- **Facturas en tablet:** la tabla necesitaba scroll lateral y escondía la
  columna «Acciones». Hasta 1024 px se muestran tarjetas (dos columnas en
  tablet). «4T 2026» ya no se parte en dos líneas.

### Pruebas
- Nuevo test de disposición: recorre 14 pantallas en móvil, tablet y
  escritorio y falla si algo se sale de su tarjeta o de la pantalla, si una
  tabla esconde columnas, si los campos de una fila no están alineados o si
  dos botones se pisan.

## [0.75.6] - 2026-11-10 · pre-alpha

Actualización de seguridad. Sin cambios visibles ni de base de datos.

### Seguridad
- **Next.js 16.3.8 → 16.4.6**: corrige dos fallos críticos de ejecución
  remota de código (GHSA-2464-fhr4-w9xw en la optimización de imágenes con
  SVG, GHSA-673q-mjm6-r5xr en funciones `use cache`) y uno alto de caída del
  servicio en Server Actions (GHSA-p3m5-59mp-jv5r).
- Optimizador de imágenes de Next desactivado: la app no lo usa y así
  `/_next/image` deja de estar expuesto.
- `ws` 8.22.2 y `source-map-js` 1.2.2 (dependencias indirectas con avisos altos).
- Pendiente: `zod`, cuya corrección exige pasar a zod 4 (cambio de API).

## [0.75.5] - 2026-11-09 · pre-alpha

Inicio con color y gráficos, trimestres de Hacienda con exportación, buscador
global, pantallas ordenadas en móvil y escritorio, y la ficha de orden más
segura y robusta.

### Inicio
- **Cifras corregidas**: «En reparación» y «Completadas» salían siempre 0 y
  «Pendientes» no contaba las órdenes en diagnóstico. Lo facturado ya no suma
  borradores ni facturas anuladas.
- Facturado del mes con la variación frente al anterior y gráfico de los
  últimos seis meses; órdenes por estado con color; pendiente de cobro.
- **Hacienda**: IVA y base del trimestre que toca, plazo del 303/130 y días
  que faltan, con enlace a exportarlo.

### Facturas
- **Trimestres para Hacienda**: los últimos cinco con su plazo de
  presentación (1T–3T hasta el día 20 del mes siguiente, 4T hasta el 30 de
  enero; fin de semana → lunes). **Exportar** descarga un ZIP con el PDF de
  cada factura y el libro de facturas emitidas en CSV para Excel.
- Importes como «1.383,95 €» en toda la app, también en los PDF.
- En móvil, tarjetas en lugar de tabla y filtros en una hoja inferior.

### Órdenes
- La ficha de orden ya no escribe en la base de datos desde el navegador:
  todo pasa por la API (taller de la sesión, cliente y vehículo del mismo
  taller, órdenes facturadas intocables, totales calculados en el servidor).
- Arreglados: el IVA 0 % dejaba el total al 21 % hasta otro guardado; un
  cambio justo después de un autoguardado se perdía; crear un cliente en el
  asistente quitaba el vehículo; el número de orden podía chocar; una orden
  sin cliente rompía el listado; «Editar vehículo» se abría vacío y borraba
  la matrícula al guardar.
- Listado en rejilla con el estado por color, búsqueda y recuento por estado.

### Seguridad
- Ninguna pantalla lee ni escribe tablas de la base de datos desde el
  navegador; la API de vehículos ya no acepta un cliente de otro taller.

### Vehículos y clientes
- Las matrículas no españolas o con otro formato ya no se muestran ni se
  guardan como «0000-XXX».
- Kilómetros como «120.000 km». Listados en rejilla.

### Interfaz
- **Buscador global** (Ctrl+K o la lupa en móvil): órdenes, vehículos,
  clientes y facturas desde cualquier pantalla.
- Un solo título por pantalla, en la cabecera, con las acciones principales
  a su derecha. Menú en móvil como hoja que se cierra arrastrando.
- Mismo sistema visual en ficha de orden, citas, configuración, formularios
  y menú: sin degradados, sin emojis como iconos, colores con contraste AA.

### Calidad
- Tests nuevos: ficha de orden de punta a punta y su API, inicio,
  exportación por trimestre (abriendo el ZIP), buscador y aislamiento entre
  talleres. Diseño documentado en DESIGN.md.

## [0.75.4] - 2026-11-09 · pre-alpha

Listado de facturas completo, IVA 0 % como opción real, citas conectadas con
vehículos y órdenes, y una interfaz más sobria, legible y accesible.

### Facturas
- **Listado completo y paginado**: antes cargaba solo las 100 más recientes y
  las demás no se veían ni se encontraban. 25 por página, con total real.
- **Búsqueda** por número, matrícula (también la escrita a mano), nombre o NIF
  del cliente; **filtro por serie**; periodo por días. Columna de cliente.
- **IVA 0 % (exento)** en «Nueva Factura»: antes se convertía en 21 %. El 21 %
  sigue exactamente igual. El PDF muestra el porcentaje real.
- Etiquetas del formulario asociadas a sus campos; «Total con IVA» (mostraba
  la base).

### Citas
- El fin no puede ser anterior al inicio (aviso y rechazo en la API); al mover
  el inicio, el fin se mueve con la misma duración.
- **Añadir vehículo** desde la propia cita; elegir el vehículo rellena el
  cliente.
- **Crear orden** desde la cita con su cliente y vehículo (una sola, aunque se
  pulse dos veces); «Ver orden» la abre.
- La API ya no acepta cliente, vehículo u orden de otro taller.

### Clientes
- Un cliente sin NIF ya no muestra ni guarda «00000000T».
- El NIF se muestra con su etiqueta (antes una chincheta).

### Interfaz
- Un solo azul principal con contraste AA (antes 2,8:1 en botones).
- Inicio: indicadores en dos bloques sobrios en lugar de 8 tarjetas de
  colores; «Nueva orden» abre el asistente directamente. «Dashboard» → «Inicio».
- Órdenes: el estado se lee como texto (antes solo un emoji).
- Fuera la campana de notificaciones, que no hacía nada.
- Botones de solo icono con nombre accesible; controles táctiles más grandes
  en móvil; filtros de facturas plegables en móvil.
- Textos de ejemplo según el contexto: sin «0.00» en año o kilómetros,
  matrícula 1234 BCD, NIF y CIF válidos, importes con coma.

### Calidad
- Recorrido automático de 12 pantallas también en móvil: sin errores, sin
  desbordes horizontales.
- Tests nuevos de listado de facturas, IVA 0 %, citas y órdenes, y una
  comprobación de todos los textos de ejemplo.

## [0.75.3] - 2026-11-08 · pre-alpha

Citas fiables de principio a fin, envíos por WhatsApp al número correcto,
presupuestos que el cliente acepta tal como los vio y numeración de facturas
protegida en base de datos.

> Requiere en Supabase lo aplicado el 2026-11-08 (SEC-02, A06 y A10). Sin
> ello la app sigue funcionando: numera con v3 y el presupuesto no se guarda.

### Citas
- **Hora correcta**: una cita a las 09:00 se guarda y se ve a las 09:00
  (antes quedaba 1-2 horas desplazada por la zona horaria).
- **Editar una cita** abre el formulario con sus datos (antes salía vacío y
  al guardar se creaba una cita duplicada).
- **WhatsApp al cliente** con fecha, hora, vehículo, dirección y enlaces para
  añadirla a su calendario (Google, Outlook o archivo .ics).
- **Google Calendar del taller**: al crear, editar o borrar una cita se
  sincroniza con el calendario del usuario que la guarda (si lo tiene conectado).
- **Exportar a calendario**: horas en UTC, citas de día completo correctas y
  los botones del menú ya no envían el formulario.
- Un solo botón **«Nueva cita»**, siempre visible, con el día seleccionado.
- La API de citas responde 404/400 (no 500) ante citas inexistentes o datos
  inválidos.

### Órdenes y presupuestos
- **WhatsApp de presupuesto y de orden** al teléfono del cliente con prefijo 34
  y sin textos vacíos ("Hola ,", "undefined").
- **El cliente acepta lo que vio**: si el taller cambia las líneas o el IVA
  con el enlace abierto, la aceptación se rechaza y la página muestra la
  versión nueva. Cada envío guarda total y versión de lo enviado.
- Presupuestos compartidos antes de esta versión se siguen pudiendo aceptar.

### Facturación
- **Numeración con v4**: solo se puede pedir número del propio taller y desde
  la 1000 no se trunca. Mismo formato `PREFIJO-NNN` y mismo contador: la
  siguiente factura es la que tocaba. Si v4 no está disponible o rechaza al
  usuario, se usa v3 y queda registrado en el log.
- **PDF de factura**: la librería de PDF (≈1,4 MB) se descarga al pulsar
  «Descargar PDF», no al abrir la página.

### Seguridad
- `taller/config/obtener` y `series/*` exigen sesión y usan el taller de la
  sesión (antes aceptaban un taller arbitrario).

### Calidad
- 255 tests unitarios y E2E ampliados (citas, WhatsApp, PDF, numeración,
  versión del presupuesto), estables en ejecuciones repetidas.

## [0.75.2] - 2026-11-08 · pre-alpha

Corrige caminos que ya estaban rotos en producción, encontrados con pruebas
de interfaz que rellenan formularios y pulsan cada botón.

### Corregido
- **Nuevo cliente**: el formulario no guardaba (enviaba a una ruta inexistente).
- **Citas**: los selectores de cliente y vehículo salían siempre vacíos.
- **Calendario**: una sola cita sin hora de fin (o con fin igual al inicio)
  impedía cargar todo el calendario. Ahora se muestra con 1 hora de duración,
  y al guardar sin fin se asigna 1 hora (sin desfases de zona horaria).
- **Configuración**: ya no da error 500 al abrirse.
- **Cabecera**: cada sección y subpágina muestra su título (antes "Dashboard").
- **Menú**: muestra la versión real de la aplicación.

### Calidad
- 169 tests unitarios y 79 E2E, estables en ejecuciones repetidas.
- Recorrido automático de 12 pantallas pulsando cada botón (sin errores JS,
  respuestas 5xx ni enlaces rotos).

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
