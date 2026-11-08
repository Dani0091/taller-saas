/**
 * @fileoverview Enlaces de WhatsApp (wa.me) para presupuestos, órdenes y citas
 * @description Única implementación. Antes había cuatro, y la de presupuestos
 * no añadía el prefijo de país: "600 123 456" abría wa.me/600123456, que
 * WhatsApp no asocia a ningún contacto español.
 */

/**
 * Teléfono en el formato que exige wa.me: solo dígitos y con código de país.
 * - 9 dígitos españoles (6, 7, 8 o 9 inicial) → se antepone 34.
 * - Prefijo internacional 00 → se quita.
 * - Ya con código de país (10–15 dígitos) → se deja.
 * Cualquier otra cosa → null (el enlace se abrirá sin destinatario).
 */
export function telefonoParaWhatsApp(telefono: string | null | undefined): string | null {
  if (!telefono) return null
  let digitos = telefono.replace(/\D/g, '')
  if (digitos.startsWith('00')) digitos = digitos.slice(2)
  if (/^[6789]\d{8}$/.test(digitos)) return `34${digitos}`
  if (/^\d{10,15}$/.test(digitos)) return digitos
  return null
}

/** Enlace wa.me con el mensaje. Sin teléfono válido, WhatsApp deja elegir el contacto. */
export function enlaceWhatsApp(telefono: string | null | undefined, mensaje: string): string {
  const numero = telefonoParaWhatsApp(telefono)
  const texto = encodeURIComponent(mensaje)
  return numero ? `https://wa.me/${numero}?text=${texto}` : `https://wa.me/?text=${texto}`
}
