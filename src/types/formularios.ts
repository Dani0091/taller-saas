/**
 * @fileoverview Tipos de formulario centralizados para toda la aplicación
 * @description Define las interfaces para formularios con tipos consistentes para evitar errores de string/number
 * @note Si necesitas un tipo mixto (string | number), usa union types en la interfaz
 */

// ============================================================================
// INTERFACES DE FORMULARIOS CENTRALIZADAS
// ============================================================================

/**
 * ✅ CORRECCIÓN: Formulario de Vehículo - Tipos alineados con master-converter
 * año, kilometros, potencia_cv, cilindrada deben ser number | null según DatabaseSchema
 */
export interface VehiculoFormulario {
  matricula: string
  marca: string | null
  modelo: string | null
  año: number | null  // ✅ Cambiado a number | null
  color: string | null
  kilometros: number | null  // ✅ Cambiado a number | null
  tipo_combustible: string | null
  potencia_cv: number | null
  cilindrada: number | null
  vin: string | null
  carroceria: string | null
}

/**
 * Formulario de Cliente - Tipos consistentes
 */
export interface ClienteFormulario {
  nombre: string
  apellidos: string
  nif: string
  email: string | null
  telefono: string | null
  direccion: string | null
  poblacion: string | null
  provincia: string | null
  cod_postal: string | null
  iban: string | null
}

/**
 * Formulario de Orden de Reparación - Tipos específicos para órdenes
 */
export interface OrdenFormulario {
  estado: string
  cliente_id: string | null
  vehiculo_id: string | null
  descripcion_problema: string
  diagnostico: string
  trabajos_realizados: string
  notas: string
  presupuesto_aprobado_por_cliente: boolean
  tiempo_estimado_horas: number
  tiempo_real_horas: number
  subtotal_mano_obra: number
  subtotal_piezas: number
  iva_amount: number
  total_con_iva: number
  fotos_entrada: string
  fotos_salida: string
  fotos_diagnostico: string
  nivel_combustible: string | null
  renuncia_presupuesto: boolean
  accion_imprevisto: string
  recoger_piezas: boolean
  danos_carroceria: boolean
  coste_diario_estancia: number | null
  kilometros_entrada: number | null
}

/**
 * Formulario de Factura - Tipos financieros estrictos
 */
export interface FacturaFormulario {
  numero_factura: string
  cliente_id: string | null
  serie_factura: string | null
  base_imponible: number
   iva: number
  total: number
  metodo_pago: string | null
  fecha_emision: string
  fecha_vencimiento: string
  notas_factura: string | null
  condiciones_pago: string | null
  persona_contacto: string | null
  telefono_contacto: string | null
}

/**
 * Formulario de Configuración del Taller - Tipos específicos
 */
export interface ConfiguracionFormulario {
  tarifa_hora: number
  incluye_iva: boolean
  porcentaje_iva: number
  tarifa_con_iva: boolean
  nombre_empresa: string | null
  cif: string | null
  direccion: string | null
  telefono: string | null
  email: string | null
  logo_url: string | null
  serie_factura: string | null
  numero_factura_inicial: number | null
  iban: string | null
  condiciones_pago: string | null
  notas_factura: string | null
  color_primario: string | null
  color_secundario: string | null
}

/**
 * Tipos genéricos para formularios con validación
 */
export interface ValidacionCampo {
  min?: number
  max?: number
  step?: number
  required?: boolean
  mensajeError?: string
}

/**
 * Estado genérico de formulario con tipado estricto
 */
export interface EstadoFormulario<T> {
  data: T
  errors: Record<string, string>
  loading: boolean
  isDirty: boolean
}

// ============================================================================
// VALORES POR DEFECTO PARA FORMULARIOS
// ============================================================================

export const VALORES_POR_DEFECTO = {
  vehiculo: {
    matricula: '',
    marca: null,
    modelo: null,
    año: new Date().getFullYear() as number | null,  // ✅ Año actual como default
    color: null,
    kilometros: null,  // ✅ null por defecto
    tipo_combustible: null,
    potencia_cv: null,
    cilindrada: null,
    vin: null,
    carroceria: null
  } as VehiculoFormulario,
  
  orden: {
    estado: 'recibido',
    cliente_id: null,
    vehiculo_id: null,
    descripcion_problema: '',
    diagnostico: '',
    trabajos_realizados: '',
    notas: '',
    presupuesto_aprobado_por_cliente: false,
    tiempo_estimado_horas: 0,
    tiempo_real_horas: 0,
    subtotal_mano_obra: 0,
    subtotal_piezas: 0,
    iva_amount: 0,
    total_con_iva: 0,
    fotos_entrada: '',
    fotos_salida: '',
    fotos_diagnostico: '',
    nivel_combustible: null,
    renuncia_presupuesto: false,
    accion_imprevisto: 'avisar',
    recoger_piezas: false,
    danos_carroceria: false,
    coste_diario_estancia: null,
    kilometros_entrada: 0,
  } as OrdenFormulario,
  
  factura: {
    numero_factura: '',
    cliente_id: null,
    serie_factura: null,
    base_imponible: 0,
    iva: 0,
    total: 0,
    metodo_pago: null,
    fecha_emision: '',
    fecha_vencimiento: '',
    notas_factura: null,
    condiciones_pago: null,
    persona_contacto: null,
    telefono_contacto: null,
  } as FacturaFormulario,
  
  configuracion: {
    tarifa_hora: 45,
    incluye_iva: true,
    porcentaje_iva: 21,
    tarifa_con_iva: false,
    nombre_empresa: null,
    cif: null,
    direccion: null,
    telefono: null,
    email: null,
    logo_url: null,
    serie_factura: 'FA',
    numero_factura_inicial: 1,
    iban: null,
    condiciones_pago: null,
    notas_factura: null,
    color_primario: '#3b82f6',
    color_secundario: '#10b981',
  } as ConfiguracionFormulario,
}

// ============================================================================
// EXPORTACIONES POR CONVENIENCIA
// ============================================================================

export type { 
  VehiculoFormulario,
  ClienteFormulario, 
  OrdenFormulario, 
  FacturaFormulario, 
  ConfiguracionFormulario,
  VALORES_POR_DEFECTO
} from './formularios'

// ============================================================================
// TIPOS GENÉRICOS DE VALIDACIÓN
// ============================================================================

export type TipoDatoCampo = 'string' | 'number' | 'boolean' | 'date'

export interface DatoValidado<T = any> {
  valor: T
  esValido: boolean
  mensaje?: string
}

/**
 * Valida si un dato cumple con el tipo esperado
 */
export function validarCampo<T>(
  valor: any, 
  tipo: TipoDatoCampo, 
  opciones?: ValidacionCampo
): DatoValidado<T> {
  if (valor === null || valor === undefined) {
    return { valor: null, esValido: true, mensaje: '' }
  }

  const tipoEsperado = tipo === 'number' && typeof valor === 'string'
    ? 'number' : tipo

  if (typeof valor !== tipoEsperado && valor !== null) {
    return { valor: null, esValido: false, mensaje: `Se espera ${tipoEsperado} pero se recibió ${typeof valor}` }
  }

  // Para booleanos, acepta strings "true"/"false" y booleanos reales
  if (tipo === 'boolean' && typeof valor === 'string') {
    const valorBool = valor.toLowerCase()
    if (valorBool === 'true' || valorBool === 'false') {
      return { valor: valorBool === 'true', esValido: true }
    }
    return { valor: false, esValido: false, mensaje: 'Se espera "true" o "false"' }
  }

  // Para fechas, acepta strings ISO 8601
  if (tipo === 'date' && typeof valor === 'string') {
    const fecha = new Date(valor)
      const fechaValida = !isNaN(fecha.getTime())
      return { 
        valor: fechaValida ? fecha : null, 
        esValido: fechaValida
      }
    }

  // Por defecto, es válido
  return { valor, esValido: true }
}

// ============================================================================
// UTILIDADES DE CONVERSIÓN SEGURA
// ============================================================================

/**
 * Convierte string a número de forma segura
 */
export const stringANumber = (valor: string): number | null => {
  if (!valor || valor.trim() === '') return 0
  
  const limpio = valor.replace(/[^\d.-]/g, '')
  const num = parseFloat(limpio)
  
  if (isNaN(num)) return null
  return Math.round(num * 100) / 100
}

/**
 * Convierte número a string de forma segura
 */
export const numberAString = (valor: number | null): string => {
  if (valor === null || valor === undefined) return ''
  return valor.toString()
}

/**
 * Formatea número para mostrar
 */
export const formatNumber = (num: number, decimales = 2): string => {
  if (num === null || isNaN(num)) return '0'
  return num.toFixed(decimales)
}

/**
 * Valida rango de un número
 */
export const validarRango = (valor: number, min?: number, max?: number): DatoValidado<number> => {
  if (valor === null || isNaN(valor)) {
    return { valor: null, esValido: true }
  }
  
  let esValido = true
  const error = []

  if (min !== undefined && valor < min) {
    error.push(`El valor debe ser mayor o igual a ${min}`)
    esValido = false
  }
  
  if (max !== undefined && valor > max) {
    error.push(`El valor debe ser menor o igual a ${max}`)
    esValido = false
  }

  return {
    valor: valor,
    esValido,
    mensaje: error.join(', ')
  }
}

/**
 * Crea un manejador de cambios para formularios
 */
export const crearManejadorDeCambios = (
  initialState: any,
  onUpdate?: () => void,
  debounceMs = 300
) => {
  let timeoutId: NodeJS.Timeout | null

  const actualizarEstado = (updates: Partial<Record<string, any>>) => {
    if (onUpdate) onUpdate(updates)
    
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      onUpdate(updates)
    }, debounceMs)
  }

  return actualizarEstado
}

/**
 * Hook personalizado para manejo de formulario con validaciones
 */
export function useFormulario<T extends Record<string, any>>(
  initialState: T,
  opciones?: {
    validateOnChange?: boolean
    validateOnBlur?: boolean
    debounceMs?: number
    onDirty?: (isDirty: boolean) => void
    onUpdate?: (updates: Partial<Record<string, any>>) => void
  }
) {
  const [formData, setFormData] = useState<T>(initialState)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isDirty, setIsDirty] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const actualizarCampo = useCallback((
    campo: string,
    valor: any,
    opciones?: ValidacionCampo
  ) => {
    if (opciones?.validateOnChange && !opciones.allowEmpty && valor === null) {
      setFormData(prev => ({ ...prev, [campo]: null }))
      setErrors(prev => ({
        ...prev,
        [campo]: opciones.mensajeError || 'Este campo es requerido'
      }))
      return
    }

    // Para números, validar conversión segura
    const validado = validarCampo(valor, opciones?.tipo || 'string')
    if (!validado.esValido) {
      setErrors(prev => ({ ...prev, [campo]: validado.mensaje }))
      return
    }

    // Si es válido, actualizar estado
    setFormData(prev => ({ ...prev, [campo]: validado.valor }))
    
    if (opciones?.onBlur) {
      opciones.onBlur?.()
    }
    
    if (opciones?.onDirty) {
      setIsDirty(true)
    }
    
    if (opciones?.onUpdate) {
      opciones.onUpdate({ [campo]: valor })
    }
  }, [formData, errors, isDirty, setErrors, isSubmitting])

  const resetFormulario = useCallback(() => {
    setFormData(initialState)
    setErrors({})
    setIsDirty(false)
    setIsSubmitting(false)
  }, [initialState, setFormData, errors, isDirty, setErrors, isSubmitting])

  return {
    formData,
    errors,
    isDirty,
    isSubmitting,
    setFormData,
    setErrors,
    setIsDirty,
    setIsSubmitting,
    resetFormulario
  }
}

// ============================================================================
// ✅ INTERFACES ADICIONALES - Formularios específicos
// ============================================================================

/**
 * Formulario de Vehículo Nuevo - Para crear desde cero
 */
export interface VehiculoNuevoFormulario extends Omit<VehiculoFormulario, 'id' | 'taller_id'> {
  // Hereda todo de VehiculoFormulario excepto id y taller_id
  taller_id?: string  // Opcional para inicialización
}

/**
 * Formulario de Vehículo Edición - Para actualizar existente
 */
export type VehiculoEdicionFormulario = Omit<VehiculoFormulario, 'taller_id'> & {
  taller_id?: string  // Opcional para edición
}

/**
 * Formulario de Nueva Orden - Para crear desde cero
 */
export interface OrdenNuevoFormulario extends Omit<OrdenFormulario, 'id' | 'numero_orden'> {
  // Hereda todo de OrdenFormulario excepto id y numero_orden
}

/**
 * Formulario de Nueva Factura - Para crear desde cero
 */
export interface FacturaNuevoFormulario extends Omit<FacturaFormulario, 'id'> {
  // Hereda todo de FacturaFormulario excepto id
}

// ============================================================================
// ✅ VALORES POR DEFECTO - No duplicados
// ============================================================================

// ============================================================================
// TIPOS GENÉRICOS
// ============================================================================

/**
 * Tipo genérico para formulario con ID
 */
export interface FormularioConID<T> {
  id?: string | number | null
  [key: string]: T;
}

/**
 * Estado genérico de formulario
 */
export interface EstadoFormulario<T> {
  data: T;
  errors: Record<string, string>;
  loading: boolean;
  isDirty: boolean;
}

/**
 * Configuración de validación para campos numéricos
 */
export interface ValidacionNumerica {
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
  mensajeError?: string;
}

// ============================================================================
// EXPORTS POR CONVENIENCIA
// ============================================================================

export type { 
  VehiculoFormulario, 
  ClienteFormulario, 
  OrdenFormulario, 
  FacturaFormulario, 
  ConfiguracionFormulario,
  VehiculoNuevoFormulario,
  VehiculoEdicionFormulario,
  OrdenNuevoFormulario,
  FacturaNuevoFormulario,
  VALORES_POR_DEFECTO
} from './database.types';