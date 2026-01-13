/**
 * VALIDACIONES COMUNES
 * Helpers para validar datos en formularios
 */

/**
 * Valida un NIF español (DNI de persona física)
 * Formato: 8 dígitos + 1 letra
 */
export function validarNIF(nif: string): boolean {
  if (!nif) return false

  const nifLimpio = nif.toUpperCase().replace(/[\s-]/g, '')

  // Formato: 8 dígitos + 1 letra
  const regex = /^[0-9]{8}[A-Z]$/
  if (!regex.test(nifLimpio)) return false

  // Verificar letra de control
  const letras = 'TRWAGMYFPDXBNJZSQVHLCKE'
  const numero = parseInt(nifLimpio.substring(0, 8), 10)
  const letraCalculada = letras[numero % 23]
  const letraProporcionada = nifLimpio.charAt(8)

  return letraCalculada === letraProporcionada
}

/**
 * Valida un NIE español (Número de Identidad de Extranjero)
 * Formato: X/Y/Z + 7 dígitos + 1 letra
 */
export function validarNIE(nie: string): boolean {
  if (!nie) return false

  const nieLimpio = nie.toUpperCase().replace(/[\s-]/g, '')

  // Formato: X/Y/Z + 7 dígitos + letra
  const regex = /^[XYZ][0-9]{7}[A-Z]$/
  if (!regex.test(nieLimpio)) return false

  // Convertir primera letra a número para cálculo
  let nieNumerico = nieLimpio
    .replace('X', '0')
    .replace('Y', '1')
    .replace('Z', '2')

  // Verificar letra de control
  const letras = 'TRWAGMYFPDXBNJZSQVHLCKE'
  const numero = parseInt(nieNumerico.substring(0, 8), 10)
  const letraCalculada = letras[numero % 23]
  const letraProporcionada = nieLimpio.charAt(8)

  return letraCalculada === letraProporcionada
}

/**
 * Valida un CIF español (Código de Identificación Fiscal de empresas)
 * Formato: 1 letra + 7 dígitos + 1 dígito/letra de control
 */
export function validarCIF(cif: string): boolean {
  if (!cif) return false

  const cifLimpio = cif.toUpperCase().replace(/[\s-]/g, '')

  // Formato básico: letra + 7 dígitos + control
  const regex = /^[ABCDEFGHJKLMNPQRSUVW][0-9]{7}[0-9A-J]$/
  if (!regex.test(cifLimpio)) return false

  // Cálculo del dígito de control
  const letra = cifLimpio.charAt(0)
  const digitos = cifLimpio.substring(1, 8)
  const control = cifLimpio.charAt(8)

  let sumaPares = 0
  let sumaImpares = 0

  for (let i = 0; i < 7; i++) {
    const digito = parseInt(digitos[i], 10)
    if (i % 2 === 0) {
      // Posiciones impares (1, 3, 5, 7)
      const doble = digito * 2
      sumaImpares += doble > 9 ? doble - 9 : doble
    } else {
      // Posiciones pares (2, 4, 6)
      sumaPares += digito
    }
  }

  const sumaTotal = sumaPares + sumaImpares
  const digitoControl = (10 - (sumaTotal % 10)) % 10
  const letraControl = 'JABCDEFGHI'[digitoControl]

  // Según el tipo de entidad, el control es dígito o letra
  const letrasConLetra = 'KPQRSNW'
  if (letrasConLetra.includes(letra)) {
    return control === letraControl
  }

  const letrasConDigito = 'ABEH'
  if (letrasConDigito.includes(letra)) {
    return control === digitoControl.toString()
  }

  // Para otros tipos, puede ser dígito o letra
  return control === digitoControl.toString() || control === letraControl
}

/**
 * Valida cualquier documento de identificación español (NIF, NIE o CIF)
 */
export function validarDocumentoIdentidad(documento: string): { valido: boolean; tipo: string | null } {
  if (!documento) {
    return { valido: false, tipo: null }
  }

  const docLimpio = documento.toUpperCase().replace(/[\s-]/g, '')

  // Detectar tipo y validar
  if (/^[0-9]{8}[A-Z]$/.test(docLimpio)) {
    return { valido: validarNIF(docLimpio), tipo: 'NIF' }
  }

  if (/^[XYZ][0-9]{7}[A-Z]$/.test(docLimpio)) {
    return { valido: validarNIE(docLimpio), tipo: 'NIE' }
  }

  if (/^[A-Z][0-9]{7}[0-9A-Z]$/.test(docLimpio)) {
    return { valido: validarCIF(docLimpio), tipo: 'CIF' }
  }

  return { valido: false, tipo: null }
}

/**
 * Valida formato de email
 */
export function validarEmail(email: string): boolean {
  if (!email) return false
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

/**
 * Valida formato de teléfono español
 */
export function validarTelefono(telefono: string): boolean {
  if (!telefono) return false
  const telLimpio = telefono.replace(/[\s-()]/g, '')
  // Acepta: +34XXXXXXXXX, 34XXXXXXXXX, XXXXXXXXX (9 dígitos)
  const regex = /^(\+?34)?[6789][0-9]{8}$/
  return regex.test(telLimpio)
}

/**
 * Valida formato de IBAN español
 */
export function validarIBAN(iban: string): boolean {
  if (!iban) return false

  const ibanLimpio = iban.toUpperCase().replace(/[\s-]/g, '')

  // IBAN español: ES + 2 dígitos de control + 20 dígitos
  if (!/^ES[0-9]{22}$/.test(ibanLimpio)) return false

  // Mover ES y dígitos de control al final
  const reorganizado = ibanLimpio.substring(4) + ibanLimpio.substring(0, 4)

  // Convertir letras a números (A=10, B=11, etc.)
  const numerico = reorganizado.replace(/[A-Z]/g, (letra) => {
    return (letra.charCodeAt(0) - 55).toString()
  })

  // Calcular módulo 97
  let resto = 0
  for (let i = 0; i < numerico.length; i++) {
    resto = parseInt(resto.toString() + numerico[i], 10) % 97
  }

  return resto === 1
}

/**
 * Formatea un NIF/NIE/CIF para mostrar
 */
export function formatearDocumento(documento: string): string {
  if (!documento) return ''
  return documento.toUpperCase().replace(/[\s-]/g, '')
}

/**
 * Formatea un IBAN para mostrar (grupos de 4)
 */
export function formatearIBAN(iban: string): string {
  if (!iban) return ''
  const limpio = iban.toUpperCase().replace(/[\s-]/g, '')
  return limpio.match(/.{1,4}/g)?.join(' ') || limpio
}
