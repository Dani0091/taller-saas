/**
 * TypeScript Types & Interfaces para Verifactu & AEAT
 *
 * Define todas las estructuras de datos para:
 * - Comunicación con AEAT
 * - Cola de envíos
 * - Configuración de certificados
 * - Respuestas de AEAT
 */

// ============================================================================
// CONFIGURACIÓN AEAT
// ============================================================================

export interface AEATConfig {
  /** URL del webservice SOAP de AEAT */
  webserviceUrl: string
  /** Entorno: 'test' o 'production' */
  environment: 'test' | 'production'
  /** Timeout en milisegundos */
  timeout?: number
  /** Reintentos máximos */
  maxRetries?: number
}

// ============================================================================
// CERTIFICADO DIGITAL
// ============================================================================

export interface CertificateConfig {
  /** Certificado en formato base64 (PKCS#12) */
  certificateB64: string
  /** Contraseña del certificado (encriptada) */
  passwordEncrypted: string
  /** Clave para desencriptar contraseña */
  encryptionKey: string
}

export interface LoadedCertificate {
  /** Buffer del certificado (P12 binario) */
  buffer: Buffer
  /** Contraseña descifrada */
  password: string
}

// ============================================================================
// RESPUESTA DE AEAT
// ============================================================================

export type AEATResponseStatus = 'enviado' | 'aceptado' | 'rechazado' | 'error'

export interface AEATResponse {
  /** Si la operación fue exitosa */
  exitoso: boolean
  /** Estado del registro en AEAT */
  estado: AEATResponseStatus
  /** Código Seguro de Verificación (si aceptado) */
  csv?: string
  /** Mensajes de AEAT (errores o advertencias) */
  mensajes: string[]
  /** Timestamp de la respuesta */
  timestamp: string
  /** Número de referencia del envío */
  numeroReferencia?: string
  /** XML completo de respuesta (para auditoría) */
  xmlRespuesta?: string
}

// ============================================================================
// COLA DE ENVÍOS
// ============================================================================

export type SubmissionQueueState = 'pendiente' | 'enviando' | 'completado' | 'error' | 'fallido_permanente'

export interface SubmissionQueueItem {
  id: string
  facturaId: string
  tallerId: string
  numeroVerifactu: string
  xmlAEnviar: string
  estado: SubmissionQueueState
  intentos: number
  proximoReintento: string | null
  errorMensaje: string | null
  respuestaAeat: AEATResponse | null
  csvAeat: string | null
  createdAt: string
  updatedAt: string
  createdBy?: string
}

export interface CreateSubmissionQueueItemDTO {
  facturaId: string
  tallerId: string
  numeroVerifactu: string
  xmlAEnviar: string
  createdBy?: string
}

export interface UpdateSubmissionQueueItemDTO {
  estado?: SubmissionQueueState
  intentos?: number
  proximoReintento?: string | null
  errorMensaje?: string | null
  respuestaAeat?: AEATResponse | null
  csvAeat?: string | null
}

// ============================================================================
// CONFIGURACIÓN DE TALLER (Certificados)
// ============================================================================

export interface TallerVerifactuConfig {
  tallerId: string
  certificadoVerifactuB64?: string
  certificadoVerifactuPasswordEncrypted?: string
  verifactuEnabled: boolean
  nifSoftwareSif?: string
  nombreLegal?: string
}

// ============================================================================
// RESPUESTA DE API
// ============================================================================

export interface VerifactuStatusResponse {
  numeroVerificacion: string
  estado: SubmissionQueueState
  csv?: string
  ultimoError?: string
  intentos: number
  proximoReintento?: string
  fechaEnvio?: string
  respuestaAeat?: AEATResponse
}

export interface VerifactuRetryResponse {
  success: boolean
  mensaje: string
  nuevoEstado: SubmissionQueueState
}

export interface VerifactuSubmissionResult {
  facturaId: string
  numeroVerifactu: string
  exitoso: boolean
  csv?: string
  error?: string
  timestamp: string
}

// ============================================================================
// WORKER/CRON JOB
// ============================================================================

export interface WorkerStats {
  totalProcesados: number
  exitosos: number
  errores: number
  reintentos: number
  timestamp: string
}

export interface CronJobConfig {
  /** Intervalo en milisegundos */
  interval: number
  /** Máximo de items a procesar por cron */
  maxItemsPerRun: number
  /** Tiempo máximo de ejecución */
  maxExecutionTime: number
}

// ============================================================================
// ERRORES ESPECÍFICOS
// ============================================================================

export class AEATError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message)
    this.name = 'AEATError'
  }
}

export class CertificateError extends Error {
  constructor(message: string, public details?: any) {
    super(message)
    this.name = 'CertificateError'
  }
}

export class SubmissionQueueError extends Error {
  constructor(message: string, public details?: any) {
    super(message)
    this.name = 'SubmissionQueueError'
  }
}

// ============================================================================
// CONSTANTES DE BACKOFF
// ============================================================================

export const BACKOFF_CONFIG = {
  /** Multiplicador para backoff exponencial */
  multiplier: 2,
  /** Intento base en minutos */
  baseMinutes: 2,
  /** Máximo de reintentos */
  maxRetries: 5,
  /** Función para calcular próximo intento */
  calculateNextRetry: (intentos: number): Date => {
    const minutosEspera = BACKOFF_CONFIG.baseMinutes * Math.pow(BACKOFF_CONFIG.multiplier, intentos)
    return new Date(Date.now() + minutosEspera * 60 * 1000)
  },
}

// ============================================================================
// LOGGING TYPES
// ============================================================================

export interface VerifactuLog {
  timestamp: string
  facturaId?: string
  numeroVerifactu?: string
  nivel: 'info' | 'warn' | 'error' | 'debug'
  mensaje: string
  datos?: any
}
