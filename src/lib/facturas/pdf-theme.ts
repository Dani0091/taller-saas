/**
 * TEMA DE COLORES PARA PDF DE FACTURAS
 *
 * Dos sistemas de color conviven en el PDF:
 *
 * 1. Marca (branding): colorPrimario/colorSecundario vienen de
 *    `taller_config` (configurables por el usuario en Ajustes >
 *    Personalización) y se pasan como props a PDFFactura. Se aplican a
 *    cabecera, bloque cliente, tabla de líneas y totales.
 *    PDF_BRAND_THEME_DEFAULT sólo cubre el caso sin configuración.
 *
 * 2. Vehículo: paleta neutra fija, intencionalmente independiente del
 *    color de marca del taller. El bloque de vehículo es información
 *    operativa (identifica el vehículo de un vistazo), no un elemento
 *    de marca, así que no debe cambiar de color por taller.
 */

export const PDF_VEHICLE_THEME = {
  borderColor: '#6b7280',
  backgroundColor: '#f3f4f6',
  textColor: '#1f2937',
  matriculaColor: '#1f2937',
} as const

export interface PDFBrandTheme {
  colorPrimario: string
  colorSecundario: string
}

export const PDF_BRAND_THEME_DEFAULT: PDFBrandTheme = {
  colorPrimario: '#0284c7',
  colorSecundario: '#0369a1',
}
