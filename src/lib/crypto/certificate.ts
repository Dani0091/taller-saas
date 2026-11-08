/**
 * Certificate Management - Carga y manejo de certificados PKCS#12
 *
 * Responsabilidades:
 * - Decodificar certificados en base64
 * - Desencriptar contraseñas
 * - Validar certificados
 * - Preparar para firma XML
 */

import crypto from 'crypto'
import { CertificateError, LoadedCertificate, CertificateConfig } from '@/lib/verifactu/types'

// ============================================================================
// ENCRIPTACIÓN/DESENCRIPTACIÓN DE CONTRASEÑAS
// ============================================================================

/**
 * Encriptar contraseña del certificado
 * Se almacena así en la BD para no guardar en texto plano
 */
export function encryptPassword(password: string, encryptionKey: string): string {
  try {
    // Usar el encryptionKey como base para derivar una clave simétrica
    const hash = crypto.createHash('sha256').update(encryptionKey).digest()

    // Generar IV aleatorio
    const iv = crypto.randomBytes(16)

    // Encriptar
    const cipher = crypto.createCipheriv('aes-256-cbc', hash, iv)
    let encrypted = cipher.update(password, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    // Retornar IV + encrypted (el IV es necesario para desencriptar)
    return `${iv.toString('hex')}:${encrypted}`
  } catch (error) {
    throw new CertificateError('Error encriptando contraseña', { originalError: error })
  }
}

/**
 * Desencriptar contraseña del certificado
 */
export function decryptPassword(encryptedPassword: string, encryptionKey: string): string {
  try {
    const [ivHex, encrypted] = encryptedPassword.split(':')

    if (!ivHex || !encrypted) {
      throw new Error('Formato de contraseña encriptada inválido')
    }

    const hash = crypto.createHash('sha256').update(encryptionKey).digest()
    const iv = Buffer.from(ivHex, 'hex')

    const decipher = crypto.createDecipheriv('aes-256-cbc', hash, iv)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (error) {
    throw new CertificateError('Error desencriptando contraseña', { originalError: error })
  }
}

// ============================================================================
// CARGA DE CERTIFICADOS
// ============================================================================

/**
 * Cargar certificado PKCS#12 desde base64 y prepararlo para uso
 */
export async function loadCertificateFromB64(
  certificateB64: string,
  passwordEncrypted: string,
  encryptionKey: string
): Promise<LoadedCertificate> {
  try {
    // Validar entrada
    if (!certificateB64 || !passwordEncrypted || !encryptionKey) {
      throw new Error('Certificado, contraseña o clave de encriptación faltantes')
    }

    // Decodificar base64
    const certificateBuffer = Buffer.from(certificateB64, 'base64')

    // Desencriptar contraseña
    const password = decryptPassword(passwordEncrypted, encryptionKey)

    return {
      buffer: certificateBuffer,
      password,
    }
  } catch (error) {
    if (error instanceof CertificateError) {
      throw error
    }
    throw new CertificateError('Error cargando certificado', { originalError: error })
  }
}

/**
 * Validar que un certificado es válido y no está expirado
 */
export function validateCertificate(certificateBuffer: Buffer): boolean {
  try {
    // Nota: Validación real requeriría parser de PKCS#12
    // Por ahora, solo validamos que sea un buffer válido
    if (!Buffer.isBuffer(certificateBuffer) || certificateBuffer.length === 0) {
      return false
    }

    // Certificados PKCS#12 típicamente comienzan con estos bytes
    const header = certificateBuffer.slice(0, 4).toString('hex').toLowerCase()
    // Puede ser: 3082 (DER), 308306 (PKCS#12)

    return /^3082|^3083|^3084|^3085|^3086/.test(header)
  } catch {
    return false
  }
}

/**
 * Convertir certificado de base64 a base64 (validar formato)
 */
export function validateBase64Certificate(certificateB64: string): boolean {
  try {
    // Intentar decodificar
    const buffer = Buffer.from(certificateB64, 'base64')
    // Validar que sea un certificado válido
    return validateCertificate(buffer)
  } catch {
    return false
  }
}

// ============================================================================
// ENCRIPTACIÓN DE CERTIFICADO COMPLETO
// ============================================================================

/**
 * Encriptar un certificado completo antes de almacenar en BD
 * (Nota: Por seguridad máxima, podrías hacer esto también)
 */
export function encryptCertificateB64(
  certificateB64: string,
  encryptionKey: string
): string {
  try {
    const hash = crypto.createHash('sha256').update(encryptionKey).digest()
    const iv = crypto.randomBytes(16)

    const cipher = crypto.createCipheriv('aes-256-cbc', hash, iv)
    let encrypted = cipher.update(certificateB64, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    return `${iv.toString('hex')}:${encrypted}`
  } catch (error) {
    throw new CertificateError('Error encriptando certificado', { originalError: error })
  }
}

/**
 * Desencriptar certificado
 */
export function decryptCertificateB64(
  encryptedCertB64: string,
  encryptionKey: string
): string {
  try {
    const [ivHex, encrypted] = encryptedCertB64.split(':')

    if (!ivHex || !encrypted) {
      throw new Error('Formato de certificado encriptado inválido')
    }

    const hash = crypto.createHash('sha256').update(encryptionKey).digest()
    const iv = Buffer.from(ivHex, 'hex')

    const decipher = crypto.createDecipheriv('aes-256-cbc', hash, iv)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (error) {
    throw new CertificateError('Error desencriptando certificado', { originalError: error })
  }
}

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Obtener información del certificado (sin requerir librerías complejas)
 * Nota: Para información completa, se necesitaría una librería como openssl.js
 */
export function getCertificateInfo(certificateBuffer: Buffer): {
  isValid: boolean
  size: number
  format: string
} {
  return {
    isValid: validateCertificate(certificateBuffer),
    size: certificateBuffer.length,
    format: 'PKCS#12',
  }
}

/**
 * Generar key hash para referencia (no es la contraseña)
 */
export function generateCertificateFingerprint(certificateB64: string): string {
  const buffer = Buffer.from(certificateB64, 'base64')
  return crypto.createHash('sha256').update(buffer).digest('hex').substring(0, 16)
}
