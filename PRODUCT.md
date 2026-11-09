# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Aplicación web instalable (PWA: `public/manifest.json`, `public/sw.js`). Se usa en ordenador y en móvil; no hay app nativa.

## Users

- **Dueño/a del taller**, la misma persona en dos situaciones:
  - **En la oficina**, desde el ordenador: crea y revisa órdenes, prepara presupuestos, factura, cobra y lleva la agenda.
  - **En el taller**, desde el móvil y entre trabajo y trabajo: consulta y actualiza órdenes, añade fotos y horas, da citas y envía presupuestos por WhatsApp.
- **Cliente final del taller** (secundario): no tiene cuenta. Solo ve, por enlace o WhatsApp, el presupuesto (y lo acepta) o la cita (y la añade a su calendario).

Otros roles (mecánicos, recepción) existen en el modelo de datos (`usuarios.rol`), pero hoy no está confirmado que los usen.

## Product Purpose

TallerAgil es el programa de gestión de un taller mecánico pequeño: órdenes de reparación, presupuestos, facturación, citas, clientes y vehículos en un solo sitio, en español y con la normativa fiscal española.

El éxito es que el taller pase de la orden al cobro sin papel ni pasos repetidos, con facturas correctas y conformes desde la primera emisión, y que funcione igual en la oficina que en el taller.

## Positioning

Su diferencia es la combinación, no una sola función:

- **Factura rápida y cumplimiento.** Cobrar y emitir en segundos, con numeración correlativa protegida y Veri*Factu.
- **Pensado también para el móvil.** Se trabaja desde el taller, no solo desde la oficina.
- **El cliente aprueba online.** Presupuesto por enlace o WhatsApp; la aceptación queda registrada con fecha, IP y la versión exacta que vio el cliente.
- **Sencillo.** Menos que un ERP y utilizable sin formación.

## Operating Context

- Un mismo usuario alterna entre escritorio y móvil a lo largo del día, a menudo con prisa y con el cliente delante.
- La comunicación con el cliente final pasa por WhatsApp (teléfonos españoles, prefijo 34) y por enlaces públicos.
- Documentos: orden de trabajo, presupuesto y factura en PDF (descarga, impresión y envío).
- La agenda se sincroniza con Google Calendar y se exporta a Outlook o a archivos `.ics`.
- Hay datos reales de un taller en producción. Las pruebas se hacen solo con talleres QA ficticios.

## Capabilities and Constraints

- **Órdenes de reparación:** asistente de alta paso a paso, estados de la orden, líneas de mano de obra, piezas y suplidos, fotos, horas estimadas y reales, y PDF.
- **Presupuestos públicos:** enlace con token; si el taller cambia algo después de enviarlo, la aceptación se rechaza; caducan a los 90 días.
- **Facturación:**
  - series por taller con formato `PREFIJO-NNN`;
  - factura desde orden, cobro rápido y factura rápida (serie FS);
  - IVA por orden, con los suplidos siempre al 0 %;
  - facturas emitidas inmutables, anulación sin borrado y Veri*Factu (AEAT).
- **Citas:** calendario de mes, semana y día; WhatsApp al cliente; sincronización con Google Calendar.
- **Multi-taller:** cada taller ve solo sus datos (RLS en Supabase). Hay planes y prueba gratuita.
- **Técnicas:** Next.js con Supabase (Postgres), desplegado en Railway.
- **Formatos de España:** moneda `1.234,50 €`, fechas `dd/mm/aaaa` y zona horaria `Europe/Madrid`.
- **Por decidir:** idiomas distintos del español, roles distintos del dueño y uso por parte de mecánicos.

## Brand Commitments

Ninguno fijo. El nombre (TallerAgil), el logo y el estilo actuales se pueden replantear.

## Evidence on Hand

- Un taller real usa la aplicación en producción, con facturas emitidas.
- No hay testimonios, casos de estudio, cifras de clientes ni precios publicados confirmados. No inventarlos.
- Las capturas y los datos del taller en producción son privados. No usarlos en materiales, ejemplos ni en el repositorio, que es público.

## Product Principles

1. **Lo fiscal no se equivoca.** Numeración, IVA y facturas emitidas tienen que ser correctos e inmutables antes que cómodos.
2. **Del taller a la oficina sin cambiar de herramienta.** Cada flujo tiene que funcionar en el móvil y en el escritorio.
3. **Menos pasos hasta el cobro.** Lo frecuente (orden, presupuesto, factura, cita) va en el menor número de pasos, sin pedir el mismo dato dos veces.
4. **El cliente final ve lo justo y claro.** Enlaces públicos sin cuenta, comprensibles a la primera y con constancia de lo que aceptó.
5. **Nunca romper lo que ya funciona en producción.** Los cambios deben ser compatibles con los datos existentes.

## Accessibility & Inclusion

Sin requisito formal confirmado. En la práctica:

- uso en el móvil dentro del taller;
- botones de solo icono que necesitan un nombre accesible (pendiente según el recorrido automático).
