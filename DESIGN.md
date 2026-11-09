---
name: TallerAgil
description: Gestión del taller mecánico, de la orden al cobro, en la oficina y en el móvil.
colors:
  primary: "#0369a1"
  primary-foreground: "#ffffff"
  ring: "#0284c7"
  background: "#f8fafc"
  foreground: "#0f172a"
  card: "#ffffff"
  muted: "#f1f5f9"
  muted-foreground: "#64748b"
  accent: "#f1f5f9"
  border: "#e2e8f0"
  success: "#15803d"
  warning: "#b45309"
  destructive: "#dc2626"
  sidebar: "#0f172a"
  sidebar-accent: "#1e293b"
  sidebar-primary: "#38bdf8"
typography:
  page-title:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
  section-title:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  input:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
  data:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "0.875rem"
    fontWeight: 600
    fontFeature: "tnum"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "8px 16px"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "8px 16px"
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    height: "36px"
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "8px 12px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    padding: "16px"
  chip-filter:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.full}"
    height: "36px"
    padding: "4px 12px"
  chip-filter-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.full}"
  nav-item-active:
    backgroundColor: "{colors.sidebar-accent}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.xl}"
    padding: "12px 16px"
---

# Design System: TallerAgil

## Overview

**Creative North Star: "El banco de trabajo ordenado"**

TallerAgil es la herramienta de un taller pequeño: la usa la misma persona en la oficina, con el cliente delante, y en el taller, con el móvil y las manos ocupadas. El sistema se parece a un banco de trabajo bien ordenado: cada herramienta en su sitio, a la vista y sin adornos. Lo que importa (la matrícula, el estado de la orden, el total) se lee de un vistazo; lo demás se calla.

Es una interfaz de trabajo (modo Operate): densa cuando hace falta, familiar y consistente de una pantalla a otra. La marca vive en los detalles precisos (un solo azul, números alineados, estados con nombre), no en decoración. Superficies claras sobre un fondo gris muy suave, un menú oscuro que separa navegación de contenido, y color solo para acciones y estados.

Rechazos confirmados en el código: degradados y resplandores de color (se quitaron del menú y la cabecera), emojis como iconos, el azul cielo de antes con texto blanco (2,8:1) y el blanco sobre amarillo o cian en los estados.

**Key Characteristics:**
- Un solo azul de acción (`primary`) con contraste AA; los estados usan verde, ámbar y rojo oscuros.
- Fuente del sistema en todo; monoespaciada solo para matrículas, números de orden y factura.
- Tarjetas blancas con borde fino y sombra mínima sobre fondo `background`.
- Objetivos táctiles de 44 px en campos y 36 px en botones; nada se desborda en horizontal en móvil.
- Movimiento corto (150–200 ms) que comunica un cambio, y nunca si el usuario pide menos movimiento.

## Colors

Restringido: neutros fríos de la familia slate, un azul de acción y tres colores de estado.

### Primary
- **Azul Taller** (#0369a1): botones principales, pestaña y filtro activos, enlaces, foco de selección, cifras destacadas. 5,9:1 sobre blanco. Fondos suaves con opacidad: `bg-primary/5` (zonas de alta), `bg-primary/10` (chips, insignias).
- **Anillo de foco** (#0284c7): `ring` en todos los controles con `focus-visible` (3 px al 50 %).

### Neutral
- **Tinta** (#0f172a): texto principal y títulos.
- **Gris pizarra** (#64748b): texto secundario, etiquetas, iconos en reposo (4,8:1).
- **Papel** (#f8fafc): fondo de página. Las tarjetas (#ffffff) se apoyan en él.
- **Niebla** (#f1f5f9): `muted` y `accent`; hover de botones outline y ghost, fila seleccionada.
- **Línea** (#e2e8f0): bordes de tarjetas, campos y separadores.
- **Noche de menú** (#0f172a) con **elemento activo** (#1e293b) e icono activo **cielo** (#38bdf8, 7,8:1).

### Estados
- **Verde hecho** (#15803d): `success`. Guardado, cobrado, coincidencias, «Guardar orden». 5,0:1.
- **Ámbar aviso** (#b45309): `warning`. Precio pendiente, suplidos sin IVA, configuración incompleta. 5,0:1.
- **Rojo error** (#dc2626): `destructive`. Errores, anular, borrar. 4,8:1.

### Datos y estados de las órdenes
Paleta categórica validada para daltonismo con el script de dataviz (adyacentes: CVD ≥ 9, visión normal ≥ 24), en este orden:
- **Naranja «por empezar»** (#eb6834): recibido, en diagnóstico, presupuestado, aprobado.
- **Azul «en reparación»** (#2a78d6): en_progreso.
- **Aqua «terminadas»** (#1baf7a): finalizado. Por debajo de 3:1, así que nunca va sin su nombre y su número.
- **Violeta «facturadas»** (#6250d6): facturado.
- **Gris** (gray-400): cancelado.

Los mismos colores marcan el estado en los listados, en la ficha, en el buscador y en el inicio. Siempre son un punto o una marca junto al texto, nunca el color del texto.

### Named Rules
**The One Voice Rule.** El azul de acción es el único color de marca. Ningún otro tono (sky, cyan, purple, teal…) aparece en la interfaz; si algo necesita color, es un estado y usa `success`, `warning` o `destructive`.

**The Text-On-Color Rule.** Nunca texto blanco sobre un color claro. Los estados de las órdenes se muestran como texto con un punto de color, no como píldoras saturadas con texto blanco.

## Typography

**Fuente:** la del sistema (`ui-sans-serif, system-ui, …`). Una sola familia para títulos, botones, etiquetas y datos.
**Datos:** `ui-monospace` solo para matrículas, números de orden o factura y VIN.

**Character:** neutra y legible a la primera, en la pantalla del ordenador y en un móvil al sol.

### Hierarchy
- **Título de página** (700, 1,5rem): una vez por pantalla, en la cabecera.
- **Título de sección** (600, 1,125rem): tarjetas y bloques de la ficha.
- **Cuerpo** (400, 0,875rem, 1,5): texto, celdas y la mayoría de controles.
- **Campos** (400, 1rem en móvil, 0,875rem desde `md`): 16 px en móvil para que iOS no amplíe al enfocar.
- **Etiqueta** (500, 0,75rem): etiquetas de campos y metadatos, en gris pizarra.
- **Importes** con `tabular-nums` y formato español (`1.234,50 €`, `45,00`).

### Named Rules
**The Sentence Case Rule.** Botones y títulos en minúscula de frase («Nueva orden», «Guardar cambios»). Las mayúsculas sostenidas quedan para insignias muy cortas.

## Layout

Rejilla de 4 px. Páginas con margen de 16 px en móvil y 24–32 px en escritorio. Menú lateral fijo de 256 px desde `lg`; por debajo, menú deslizante y cabecera con botón de menú.

- La ficha de orden es un panel lateral de hasta 512 px que en móvil ocupa toda la pantalla. Arriba la cabecera y el estado, en medio el contenido con scroll y abajo las acciones fijas.
- Listados: tarjetas apiladas (órdenes, clientes, vehículos); facturas en tabla en escritorio y tarjetas en móvil, paginadas en el servidor (25 por página).
- Filtros como chips con scroll horizontal propio. En móvil se pliegan tras un botón «Filtros (n)».
- Nada provoca desplazamiento horizontal de la página; lo comprueba el recorrido automático en móvil.
- **Un solo título por pantalla**, el `h1` de la cabecera. Las acciones principales de cada página («Nueva orden», «Guardar cambios») van en la cabecera, a la derecha del título (`AccionesPagina`). Las páginas no repiten título ni descripción.
- Pantallas de alta y de detalle: un enlace discreto «← Volver a …» (`EnlaceVolver`) encima del contenido.
- Listados: una columna en móvil, dos desde `md` y tres desde `2xl`, con tarjetas compactas de altura uniforme. Facturas usa tarjetas en móvil y tabla desde `md`.
- Carga con esqueletos de la forma del contenido, no un spinner en el centro.

## Elevation & Depth

Plano por defecto, con capas tonales: papel (#f8fafc) → tarjeta blanca con borde → menú desplegable con sombra.

### Shadow Vocabulary
- **Reposo** (`shadow-xs` / `shadow-sm`): tarjetas, botones outline y campos.
- **Flotante** (`shadow-lg`): menús desplegables y listas de resultados.
- **Panel** (`shadow-xl`): la ficha de orden sobre el velo negro al 50 %.

### Named Rules
**The No-Glow Rule.** Ninguna sombra de color ni halo sin desplazamiento. La profundidad se marca con borde, tono y sombras grises con desplazamiento.

## Shapes

Esquinas suavemente redondeadas: 8 px en botones y campos, 10–14 px en tarjetas y paneles, círculo completo en chips, avatares y puntos de estado. Bordes de 1 px en color `border`. Ningún borde lateral de color de más de 1 px en tarjetas, filas o avisos.

## Components

### Buttons
- **Forma:** esquinas de 8 px, 36 px de alto (32 px `sm`, 40 px `lg`, 56 px `xl` en los pasos del asistente).
- **Primary:** fondo azul taller y texto blanco. Hover al 90 %.
- **Outline / Ghost:** fondo papel con borde, o transparente. Hover a niebla.
- **Destructive:** rojo error para anular y borrar, siempre con confirmación.
- **Solo icono:** siempre con `aria-label`. Objetivo de 36 px como mínimo en móvil.
- **Foco:** anillo de 3 px de `ring` al 50 %.

### Chips (filtros)
- **Reposo:** blanco con borde y texto tinta. **Activo:** azul taller con texto blanco.

### Cards / Containers
- **Esquinas:** 14 px. **Fondo:** blanco. **Borde:** 1 px línea. **Sombra:** reposo.
- **Relleno:** 16 px (24 px en tarjetas de página de escritorio).
- Zonas de alta (añadir línea, añadir vehículo): `bg-primary/5` con borde discontinuo `primary/30`.

### Inputs / Fields
- **Estilo:** borde línea, 44 px de alto como mínimo, esquinas de 8 px, texto de 16 px en móvil.
- **Foco:** borde `ring` y anillo de 3 px al 50 %.
- **Error:** borde y anillo `destructive`. El mensaje va debajo, con `role="alert"`.
- **Textos de ejemplo:** según el contexto («1234 BCD», «12345678Z», «45,00»), nunca «0.00».

### Navigation
- **Menú lateral:** fondo noche. Elemento activo en #1e293b con el icono en cielo y `aria-current="page"`. Reposo en gris; hover al 60 %.
- **Pestañas de la ficha:** `role="tab"` con icono de trazo y texto. La activa lleva subrayado de 2 px y texto azul taller.

### Estado de la orden (componente propio)
Botón neutro con un punto de color del estado y su nombre. Al abrirlo muestra una lista (`role="listbox"`) con el estado actual marcado. Una orden facturada lo muestra bloqueado, con un candado.

### Buscador global
Atajo Ctrl+K / ⌘K. En escritorio es un campo en la cabecera y en móvil una lupa. Agrupa resultados de órdenes, vehículos, clientes y facturas, y con la búsqueda vacía muestra accesos para crear.

### Hojas en móvil (vaul)
El menú se abre como hoja lateral y los filtros como hoja inferior con asa. Se cierran arrastrando o tocando fuera, y la acción principal queda abajo («Ver 22 facturas»).

### Gráficos e indicadores
- Una cifra principal por vista (≥ 2,25rem, sans, `tabular-nums`) con la variación firmada frente a un periodo con nombre. Verde si sube y rojo si baja, siempre con flecha.
- Columnas de 24 px como máximo, esquinas superiores de 4 px, rejilla fina continua. El periodo actual va en `primary` y los anteriores en un azul atenuado. Tooltip por barra y tabla para lectores de pantalla.
- Cifras animadas con number-flow, que respeta prefers-reduced-motion.

## Do's and Don'ts

### Do:
- **Do** usar los tokens (`primary`, `success`, `warning`, `destructive`, `muted-foreground`, `border`) en lugar de colores de la paleta de Tailwind.
- **Do** dar fondo suave a los estados con opacidad del token (`bg-success/10`, `border-warning/30`).
- **Do** poner `aria-label` a todo botón de solo icono y asociar cada etiqueta a su campo.
- **Do** escribir importes con coma decimal y `tabular-nums`.
- **Do** limitar las transiciones a 150–250 ms y dejar que `prefers-reduced-motion` las anule.

### Don't:
- **Don't** usar sky, cyan, teal, indigo, purple o violet para la interfaz. El único azul de acción es `primary`. La paleta de datos solo marca estados y series.
- **Don't** repetir en la página el título que ya está en la cabecera.
- **Don't** usar degradados, texto con degradado ni sombras de color o resplandores.
- **Don't** usar emojis como iconos; los iconos son de lucide, con un único trazo.
- **Don't** poner texto blanco sobre amarillo, cian o verde claro.
- **Don't** usar bordes laterales de color de más de 1 px en tarjetas, filas o avisos.
