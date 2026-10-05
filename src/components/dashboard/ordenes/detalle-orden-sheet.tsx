/**
 * @fileoverview Componente Sheet para detalle de órdenes de reparación
 * @description Panel lateral deslizante para crear/editar órdenes de trabajo
 * Incluye: info del cliente/vehículo, fotos con OCR, trabajo realizado, elementos de facturación
 */
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { X, Save, Plus, Trash2, Loader2, FileText, ChevronDown, Check, Clock, Car, Printer, Share2, Link, Copy, UserPlus, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumberInput, createNumberChangeHandler, handleScannerNumber } from '@/components/ui/number-input'
import { InputScanner } from '@/components/ui/input-scanner'
import type { 
  VehiculoFormulario, 
  VehiculoNuevoFormulario,
  VehiculoEdicionFormulario 
} from '@/types/formularios'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { fotosToString, getFotoUrl, setFotoUrl, getFotoByKey } from '@/lib/utils'
import { ESTADOS_ORDEN, FRACCIONES_HORA, CANTIDADES, FOTOS_DIAGNOSTICO, FOTO_LABELS, type TipoFoto } from '@/lib/constants'
import { OrdenHeader } from './parts/OrdenHeader'
import { OrdenTotalSummary } from './parts/OrdenTotalSummary'
import { OrdenTrabajoTab } from './parts/OrdenTrabajoTab'
import { OrdenItemsTab } from './parts/OrdenItemsTab'
import { OrdenFotosTab } from './parts/OrdenFotosTab'
import { OrdenInfoTab } from './parts/OrdenInfoTab'
import { OrdenClienteStep } from './parts/OrdenClienteStep'
import { OrdenVehiculoStep, type VehiculoResultadoBusqueda } from './parts/OrdenVehiculoStep'
import { OrdenDescripcionStep } from './parts/OrdenDescripcionStep'
import { OrdenFooter } from './parts/OrdenFooter'
import { FotoUploader } from './foto-uploader'
import { OrdenPDFViewer } from './orden-pdf-viewer'
import { calcularTotalesOrdenAction } from '@/actions/ordenes/calcular-totales-orden.action'
import { TotalesOrdenDTO } from '@/application/dtos/orden.dto'

interface Orden {
  id?: string
  numero_orden?: string
  estado: string
  cliente_id: string
  vehiculo_id: string
  descripcion_problema?: string
  observaciones_cliente?: string
  diagnostico?: string
  trabajos_realizados?: string
  notas?: string
  presupuesto_aprobado_por_cliente?: boolean
  tiempo_estimado_horas?: number
  tiempo_real_horas?: number
  subtotal_mano_obra?: number
  subtotal_piezas?: number
  iva_amount?: number
  total_con_iva?: number
  fotos_entrada?: string
  fotos_salida?: string
  fotos_diagnostico?: string
  nivel_combustible?: string
  renuncia_presupuesto?: boolean
  accion_imprevisto?: string
  recoger_piezas?: boolean
  danos_carroceria?: string
  coste_diario_estancia?: number
  kilometros_entrada?: number
  kilometros_salida?: number
  fecha_prevista_entrega?: string | null
  iva_porcentaje?: number
}

const FORM_DATA_INICIAL: Orden = {
  estado: 'recibido',
  cliente_id: '',
  vehiculo_id: '',
  descripcion_problema: '',
  observaciones_cliente: '',
  diagnostico: '',
  trabajos_realizados: '',
  notas: '',
  presupuesto_aprobado_por_cliente: false,
  tiempo_estimado_horas: 0,
  tiempo_real_horas: 0,
  fotos_entrada: '',
  fotos_salida: '',
  fotos_diagnostico: '',
  nivel_combustible: '',
  renuncia_presupuesto: false,
  accion_imprevisto: 'avisar',
  recoger_piezas: false,
  danos_carroceria: '',
  coste_diario_estancia: undefined,
  kilometros_entrada: undefined,
  iva_porcentaje: 21,
}

interface DetalleOrdenSheetProps {
  ordenSeleccionada?: string | null
  ordenId?: string | null // Alias para ordenSeleccionada (retrocompatibilidad)
  ordenes?: any[]
  isOpen?: boolean // Control de visibilidad (opcional, no usado internamente)
  onClose: () => void
  onActualizar?: () => void
  onSuccess?: () => void // Alias para onActualizar (retrocompatibilidad)
  modoCrear?: boolean
  onOrdenCreada?: (ordenId: string) => void // Si se pasa, se llama tras crear en vez de onClose (para abrir la orden recién creada)
}

type TipoLinea = 'mano_obra' | 'pieza' | 'servicio' | 'suplido' | 'reembolso'

interface Linea {
  id: string
  tipo: TipoLinea
  descripcion: string
  cantidad: number
  precio_unitario: number
  estado?: 'presupuestado' | 'confirmado' | 'recibido'
  isNew?: boolean
}


export function DetalleOrdenSheet({
  ordenSeleccionada: ordenSeleccionadaProp,
  ordenId,
  onClose,
  onActualizar: onActualizarProp,
  onSuccess,
  modoCrear = false,
  onOrdenCreada
}: DetalleOrdenSheetProps) {
  // Soporte para alias de props (retrocompatibilidad)
  const ordenSeleccionada = ordenId || ordenSeleccionadaProp
  const onActualizar = onSuccess || onActualizarProp || (() => {})
  const router = useRouter()
  const supabase = createClient()
  const [cargando, setCargando] = useState(!modoCrear)
  const [guardando, setGuardando] = useState(false)
  const [generandoFactura, setGenerandoFactura] = useState(false)
  const [tab, setTab] = useState<'info' | 'fotos' | 'trabajo' | 'items'>('info')
  // Wizard mobile-first, sólo activo en modoCrear — edición sigue usando las tabs libres de arriba
  const [stepCrear, setStepCrear] = useState<1 | 2 | 3 | 4>(1)
  const [lineas, setLineas] = useState<Linea[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [vehiculos, setVehiculos] = useState<any[]>([])
  const [tallerId, setTallerId] = useState<string>('')
  const [tarifaHora, setTarifaHora] = useState<number>(45)
  const [ivaConfigTaller, setIvaConfigTaller] = useState<number>(21)
  const [seriesDisponibles, setSeriesDisponibles] = useState<{ id: string; nombre: string; prefijo: string; es_predeterminada: boolean }[]>([])
  const [serieSeleccionada, setSerieSeleccionada] = useState<string>('')
  const [ordenNumero, setOrdenNumero] = useState<string>('')
  const [mostrarEstados, setMostrarEstados] = useState(false)
  const [mostrarPDF, setMostrarPDF] = useState(false)
  const [compartiendo, setCompartiendo] = useState(false)
  const [enlacePresupuesto, setEnlacePresupuesto] = useState<string | null>(null)
  const [piezaRapida, setPiezaRapida] = useState({ tipo: 'pieza', descripcion: '', cantidad: 1, precio: 0 })
  const [guardadoAutomatico, setGuardadoAutomatico] = useState(false)
  const [totales, setTotales] = useState<TotalesOrdenDTO>({
    manoObra: 0,
    piezas: 0,
    servicios: 0,
    subtotal: 0,
    iva: 0,
    total: 0,
  })

  const [formData, setFormData] = useState<Orden>(FORM_DATA_INICIAL)

  const [nuevaLinea, setNuevaLinea] = useState<{
    tipo: TipoLinea
    descripcion: string
    cantidad: number
    precio_unitario: number
  }>({
    tipo: 'mano_obra',
    descripcion: '',
    cantidad: 1,
    precio_unitario: 0
  })

  // El tipo por defecto ya es 'mano_obra', así que el auto-relleno de precio del
  // <select> (que solo dispara en su onChange) nunca se ejecuta para ese caso inicial.
  // Sincronizamos aquí mientras el usuario no haya tocado el precio manualmente.
  useEffect(() => {
    if (nuevaLinea.tipo === 'mano_obra' && nuevaLinea.precio_unitario === 0) {
      setNuevaLinea(prev => ({ ...prev, precio_unitario: tarifaHora }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tarifaHora])

  // Estado para crear cliente nuevo
  const [mostrarFormCliente, setMostrarFormCliente] = useState(false)
  const [creandoCliente, setCreandoCliente] = useState(false)
  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: '',
    primer_apellido: '',
    segundo_apellido: '',
    nif: '',
    telefono: '',
    email: ''
  })

  // Estado para crear vehículo nuevo
  const [mostrarFormVehiculo, setMostrarFormVehiculo] = useState(false)
  const [creandoVehiculo, setCreandoVehiculo] = useState(false)
  const [nuevoVehiculo, setNuevoVehiculo] = useState<VehiculoNuevoFormulario>({
    matricula: '',
    marca: null,
    modelo: null,
    año: new Date().getFullYear(),
    color: null,
    kilometros: 0,
    tipo_combustible: null,
    vin: null,
    carroceria: null,
    cilindrada: null,
    potencia_cv: null
  })

  // Matricula-first search (autocomplete en vivo)
  const [matriculaInput, setMatriculaInput] = useState('')
  const [buscandoMatricula, setBuscandoMatricula] = useState(false)
  const [matriculaNoEncontrada, setMatriculaNoEncontrada] = useState(false)
  const [resultadosMatricula, setResultadosMatricula] = useState<VehiculoResultadoBusqueda[]>([])
  const [dropdownMatriculaAbierto, setDropdownMatriculaAbierto] = useState(false)
  const debounceMatriculaRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Último estado ya sincronizado con Google Calendar (evita llamar la API en cada autosave)
  const lastEstadoSincronizadoRef = useRef<string | null>(null)

  const sincronizarCalendarioSiCambioEstado = () => {
    if (!ordenSeleccionada) return
    if (lastEstadoSincronizadoRef.current === formData.estado) return
    lastEstadoSincronizadoRef.current = formData.estado
    // Best-effort, en segundo plano — nunca bloquea ni muestra error al usuario
    fetch('/api/calendar/google/events', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orden_id: ordenSeleccionada })
    }).catch(() => {})
  }

  // Estado para editar vehículo existente
  const [editandoVehiculo, setEditandoVehiculo] = useState(false)
  const [guardandoVehiculo, setGuardandoVehiculo] = useState(false)
  const [vehiculoEditado, setVehiculoEditado] = useState<VehiculoEdicionFormulario>({
    matricula: '',
    marca: null,
    modelo: null,
    año: new Date().getFullYear(),
    color: null,
    kilometros: 0,
    tipo_combustible: null,
    potencia_cv: null,
    cilindrada: null,
    vin: null,
    carroceria: null
  })

  // Cargar datos iniciales
  useEffect(() => {
    inicializar()
  }, [])

  // Persistencia del wizard de creación (localStorage) — solo en modoCrear, nunca al editar.
  // En vez de restaurar en silencio, se pregunta explícitamente: un borrador solo guarda
  // vehiculo_id (FK) sin el objeto vehículo cargado, así que restaurar sin más dejaba el
  // paso 1 en blanco (sin tarjeta de vehículo ni formulario) — confuso y bloqueante.
  const wizardRestauradoRef = useRef(false)
  const [mostrarModalBorrador, setMostrarModalBorrador] = useState(false)
  const borradorPendienteRef = useRef<{ formData: Partial<Orden>; stepCrear: 1 | 2 | 3 | 4 } | null>(null)

  useEffect(() => {
    if (!modoCrear) return
    try {
      const guardado = localStorage.getItem('orden_form_wizard')
      if (guardado) {
        const { formData: fd, stepCrear: sc } = JSON.parse(guardado)
        const tieneContenido = fd && (fd.vehiculo_id || fd.cliente_id || (fd.descripcion_problema && fd.descripcion_problema.trim()))
        if (tieneContenido) {
          borradorPendienteRef.current = { formData: fd, stepCrear: sc || 1 }
          setMostrarModalBorrador(true)
        } else {
          localStorage.removeItem('orden_form_wizard')
        }
      }
    } catch {
      // Ignorar borradores corruptos
    } finally {
      wizardRestauradoRef.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modoCrear])

  const continuarBorrador = async () => {
    const borrador = borradorPendienteRef.current
    setMostrarModalBorrador(false)
    if (!borrador) return

    const { formData: fd, stepCrear: sc } = borrador
    setFormData(prev => ({ ...prev, ...fd }))
    setStepCrear(sc)

    // Sin esto, `vehiculoSeleccionado` (vehiculos.find) no encuentra nada y el paso 1
    // se renderiza en blanco pese a tener vehiculo_id ya asignado.
    if (fd.vehiculo_id) {
      const { data } = await supabase
        .from('vehiculos')
        .select('id, matricula, marca, modelo, año, kilometros, vin')
        .eq('id', fd.vehiculo_id)
        .maybeSingle() as { data: any }
      if (data) {
        setVehiculos(prev => (prev.some((v: any) => v.id === data.id) ? prev : [...prev, data]))
      }
    }
    toast.info('Borrador restaurado')
  }

  const empezarDeNuevo = () => {
    localStorage.removeItem('orden_form_wizard')
    borradorPendienteRef.current = null
    setMostrarModalBorrador(false)
    setFormData(FORM_DATA_INICIAL)
    setStepCrear(1)
    setVehiculos([])
    setMostrarFormVehiculo(false)
  }

  useEffect(() => {
    if (!modoCrear || !wizardRestauradoRef.current || mostrarModalBorrador) return
    const t = setTimeout(() => {
      try {
        localStorage.setItem('orden_form_wizard', JSON.stringify({ formData, stepCrear }))
      } catch {
        // localStorage lleno o no disponible — no es crítico
      }
    }, 500)
    return () => clearTimeout(t)
  }, [modoCrear, formData, stepCrear, mostrarModalBorrador])

  // Cargar vehículos cuando cambia el cliente (solo si no hay vehículo seleccionado por matrícula)
  useEffect(() => {
    if (formData.cliente_id && tallerId) {
      cargarVehiculos(formData.cliente_id)
    } else if (!formData.vehiculo_id) {
      // Solo limpiar si no hay vehículo ya seleccionado (p.ej. desde búsqueda por matrícula)
      setVehiculos([])
      setMostrarFormVehiculo(false)
    }
  }, [formData.cliente_id, tallerId])

  // Auto-mostrar formulario de vehículo si el cliente no tiene ninguno
  useEffect(() => {
    if (formData.cliente_id && vehiculos.length === 0 && !formData.vehiculo_id) {
      setMostrarFormVehiculo(true)
    }
  }, [vehiculos, formData.cliente_id])

  // Autosave cuando cambian los datos principales (excepto líneas que se guardan manualmente)
  useEffect(() => {
    if (!modoCrear && ordenSeleccionada) {
      triggerAutosave()
    }
    
    // Cleanup
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
    }
  }, [
    formData.estado,
    formData.cliente_id,
    formData.vehiculo_id,
    formData.descripcion_problema,
    formData.diagnostico,
    formData.trabajos_realizados,
    formData.notas,
    formData.tiempo_estimado_horas,
    formData.tiempo_real_horas,
    formData.kilometros_entrada
  ])

  const inicializar = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('No autenticado')
        return
      }

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('taller_id')
        .eq('email', user.email)
        .single()

      if (!usuario) {
        toast.error('Usuario no encontrado')
        return
      }

      setTallerId(usuario.taller_id)

      // Cargar configuración del taller (para tarifa hora e IVA)
      const { data: tallerConfig } = await supabase
        .from('taller_config')
        .select('tarifa_hora, porcentaje_iva, serie_factura')
        .eq('taller_id', usuario.taller_id)
        .single()

      if (tallerConfig?.tarifa_hora) {
        setTarifaHora(tallerConfig.tarifa_hora)
      }
      if (tallerConfig?.porcentaje_iva) {
        setIvaConfigTaller(tallerConfig.porcentaje_iva)
      }

      // Cargar series de facturación configuradas (RS, SCR, ALP, FS...) para poder
      // elegir cuál usar al generar la factura desde esta orden.
      const { data: seriesData } = await supabase
        .from('series_factura')
        .select('id, nombre, prefijo, es_predeterminada')
        .eq('taller_id', usuario.taller_id)
        .order('nombre')

      if (seriesData && seriesData.length > 0) {
        setSeriesDisponibles(seriesData)
        const predeterminada = seriesData.find(s => s.es_predeterminada)
        setSerieSeleccionada(predeterminada?.prefijo || tallerConfig?.serie_factura || seriesData[0].prefijo)
      }

      // Cargar clientes
      const { data: clientesData } = await supabase
        .from('clientes')
        .select('id, nombre, apellidos, nif, telefono')
        .eq('taller_id', usuario.taller_id)
        .order('nombre')

      setClientes(clientesData || [])

      // Si estamos editando, cargar orden completa
      if (!modoCrear && ordenSeleccionada) {
        const { data: ordenData, error } = await supabase
          .from('ordenes_reparacion')
          .select('*')
          .eq('id', ordenSeleccionada)
          .single()

        if (error || !ordenData) {
          toast.error('Orden no encontrada')
          onClose()
          return
        }

        setOrdenNumero(ordenData.numero_orden)
        lastEstadoSincronizadoRef.current = ordenData.estado || 'recibido'
        setFormData({
          estado: ordenData.estado || 'recibido',
          cliente_id: ordenData.cliente_id || '',
          vehiculo_id: ordenData.vehiculo_id || '',
          descripcion_problema: ordenData.descripcion_problema || '',
          observaciones_cliente: ordenData.observaciones_cliente || '',
          diagnostico: ordenData.diagnostico || '',
          trabajos_realizados: ordenData.trabajos_realizados || '',
          notas: ordenData.notas || '',
          presupuesto_aprobado_por_cliente: ordenData.presupuesto_aprobado_por_cliente || false,
          tiempo_estimado_horas: ordenData.tiempo_estimado_horas || 0,
          tiempo_real_horas: ordenData.tiempo_real_horas || 0,
          subtotal_mano_obra: ordenData.subtotal_mano_obra || 0,
          subtotal_piezas: ordenData.subtotal_piezas || 0,
          iva_amount: ordenData.iva_amount || 0,
          total_con_iva: ordenData.total_con_iva || 0,
          fotos_entrada: fotosToString(ordenData.fotos_entrada),
          fotos_salida: fotosToString(ordenData.fotos_salida),
          fotos_diagnostico: fotosToString(ordenData.fotos_diagnostico),
          nivel_combustible: ordenData.nivel_combustible || '',
          renuncia_presupuesto: ordenData.renuncia_presupuesto || false,
          accion_imprevisto: ordenData.accion_imprevisto || 'avisar',
          recoger_piezas: ordenData.recoger_piezas || false,
          danos_carroceria: ordenData.danos_carroceria || '',
          coste_diario_estancia: ordenData.coste_diario_estancia || undefined,
          kilometros_entrada: ordenData.kilometros_entrada || undefined,
          kilometros_salida: ordenData.kilometros_salida || undefined,
          fecha_prevista_entrega: ordenData.fecha_prevista_entrega || null,
          iva_porcentaje: ordenData.iva_porcentaje ?? 21,
        })

        // Cargar vehículos del cliente
        if (ordenData.cliente_id) {
          cargarVehiculos(ordenData.cliente_id)
        }

        // Cargar líneas de la orden
        const { data: lineasData } = await supabase
          .from('lineas_orden')
          .select('*')
          .eq('orden_id', ordenSeleccionada)
          .order('created_at')

        if (lineasData) {
          setLineas(lineasData.map(l => ({
            id: l.id,
            tipo: l.tipo as any,
            descripcion: l.descripcion,
            cantidad: l.cantidad,
            precio_unitario: l.precio_unitario,
            isNew: false
          })))
        }
      } else {
        // Generar número de orden para nueva
        const { data: ultimaOrden } = await supabase
          .from('ordenes_reparacion')
          .select('numero_orden')
          .eq('taller_id', usuario.taller_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        let siguienteNumero = 1
        if (ultimaOrden?.numero_orden) {
          const match = ultimaOrden.numero_orden.match(/OR-(\d+)/)
          if (match) {
            siguienteNumero = parseInt(match[1]) + 1
          }
        }
        setOrdenNumero(`OR-${siguienteNumero.toString().padStart(4, '0')}`)
      }
    } catch (error: any) {
      console.error('Error inicializando:', error)
      toast.error('Error al cargar datos')
    } finally {
      setCargando(false)
    }
  }

  const cargarVehiculos = async (clienteId: string) => {
    const { data } = await supabase
      .from('vehiculos')
      .select('id, marca, modelo, matricula, vin, bastidor_vin, año, color, kilometros, tipo_combustible')
      .eq('cliente_id', clienteId)
      .order('matricula')

    setVehiculos((prev: any[]) => {
      const lista: any[] = data || []
      // Si ya hay un vehículo seleccionado (p.ej. elegido por búsqueda de matrícula) y esta
      // lista filtrada por cliente no lo incluye, se conserva — de lo contrario la selección
      // "desaparecería" del estado en cuanto cambia el cliente, aunque formData.vehiculo_id
      // siga correctamente asignado (Step 4 mostraría "Sin vehículo seleccionado").
      if (formData.vehiculo_id && !lista.some((v: any) => v.id === formData.vehiculo_id)) {
        const seleccionadoActual = prev.find((v: any) => v.id === formData.vehiculo_id)
        return seleccionadoActual ? [...lista, seleccionadoActual] : lista
      }
      return lista
    })
  }

  // Autocomplete en vivo: busca según se escribe (debounced), muestra varios resultados
  const ejecutarBusquedaLive = useCallback(async (query: string) => {
    if (!tallerId) return

    setBuscandoMatricula(true)
    try {
      const { data, error } = await supabase
        .from('vehiculos')
        .select('id, matricula, marca, modelo, año, color, kilometros, tipo_combustible, vin, bastidor_vin, cliente_id, clientes(id, nombre, apellidos, nif, telefono)')
        .eq('taller_id', tallerId)
        .ilike('matricula', `%${query}%`)
        .order('matricula')
        .limit(8)

      if (error) {
        console.error('Error buscando vehículos:', error)
        toast.error('Error al buscar el vehículo')
        setResultadosMatricula([])
        return
      }

      setResultadosMatricula((data || []) as unknown as VehiculoResultadoBusqueda[])
      setDropdownMatriculaAbierto(true)
    } finally {
      setBuscandoMatricula(false)
    }
  }, [tallerId, supabase])

  // Input de matrícula: normaliza, dispara autocomplete debounced (300ms, mínimo 2 caracteres)
  const handleMatriculaInputChange = (valor: string) => {
    const normalizado = valor.toUpperCase().replace(/\s/g, '')
    setMatriculaInput(normalizado)
    setMatriculaNoEncontrada(false)

    if (debounceMatriculaRef.current) {
      clearTimeout(debounceMatriculaRef.current)
    }

    if (normalizado.length < 2) {
      setResultadosMatricula([])
      setDropdownMatriculaAbierto(false)
      return
    }

    debounceMatriculaRef.current = setTimeout(() => {
      ejecutarBusquedaLive(normalizado)
    }, 300)
  }

  // Selección explícita de un vehículo (click o Enter sobre un resultado del dropdown)
  const seleccionarVehiculoBusqueda = (vehiculo: VehiculoResultadoBusqueda) => {
    if (debounceMatriculaRef.current) {
      clearTimeout(debounceMatriculaRef.current)
      debounceMatriculaRef.current = null
    }
    setVehiculos([vehiculo as any])
    setFormData(prev => ({
      ...prev,
      vehiculo_id: vehiculo.id,
      cliente_id: vehiculo.cliente_id || prev.cliente_id,
    }))
    if (vehiculo.cliente_id && vehiculo.clientes) {
      setClientes(prev => {
        const existe = prev.find(c => c.id === vehiculo.cliente_id)
        return existe ? prev : [...prev, vehiculo.clientes as any]
      })
    }
    setMatriculaInput(vehiculo.matricula)
    setMatriculaNoEncontrada(false)
    setMostrarFormVehiculo(false)
    setDropdownMatriculaAbierto(false)
    setResultadosMatricula([])
  }

  // Fallback: Enter sin dropdown abierto (p.ej. pegar matrícula completa y confirmar directo).
  // NUNCA "adivina" entre varias coincidencias parciales — solo auto-selecciona si hay
  // coincidencia exacta, o si la búsqueda parcial deja un único resultado posible. Si hay
  // ambigüedad real, abre el dropdown con los candidatos en vez de elegir uno al azar.
  const buscarPorMatricula = async () => {
    if (debounceMatriculaRef.current) {
      clearTimeout(debounceMatriculaRef.current)
      debounceMatriculaRef.current = null
    }
    const matriculaNorm = matriculaInput.toUpperCase().replace(/\s/g, '')
    if (!matriculaNorm || !tallerId) return

    setBuscandoMatricula(true)
    setMatriculaNoEncontrada(false)
    setDropdownMatriculaAbierto(false)

    try {
      // 1. Coincidencia exacta primero — inequívoca por definición.
      const { data: exacto, error: errorExacto } = await supabase
        .from('vehiculos')
        .select('id, matricula, marca, modelo, año, color, kilometros, tipo_combustible, vin, bastidor_vin, cliente_id, clientes(id, nombre, apellidos, nif, telefono)')
        .eq('taller_id', tallerId)
        .ilike('matricula', matriculaNorm)
        .maybeSingle()

      if (errorExacto) {
        console.error('Error buscando vehículo por matrícula:', errorExacto)
        toast.error('Error al buscar el vehículo')
        return
      }

      if (exacto) {
        seleccionarVehiculoBusqueda(exacto as unknown as VehiculoResultadoBusqueda)
        return
      }

      // 2. Sin coincidencia exacta — buscar por coincidencia parcial (hasta 8).
      const { data: parciales, error: errorParcial } = await supabase
        .from('vehiculos')
        .select('id, matricula, marca, modelo, año, color, kilometros, tipo_combustible, vin, bastidor_vin, cliente_id, clientes(id, nombre, apellidos, nif, telefono)')
        .eq('taller_id', tallerId)
        .ilike('matricula', `%${matriculaNorm}%`)
        .order('matricula')
        .limit(8)

      if (errorParcial) {
        console.error('Error buscando vehículo por matrícula:', errorParcial)
        toast.error('Error al buscar el vehículo')
        return
      }

      if (!parciales || parciales.length === 0) {
        // No encontrado — pre-rellenar formulario de creación
        setMatriculaNoEncontrada(true)
        setResultadosMatricula([])
        setNuevoVehiculo(prev => ({ ...prev, matricula: matriculaNorm }))
        setMostrarFormVehiculo(true)
      } else if (parciales.length === 1) {
        // Un único candidato posible — sin ambigüedad, seleccionar directamente.
        seleccionarVehiculoBusqueda(parciales[0] as unknown as VehiculoResultadoBusqueda)
      } else {
        // Varias coincidencias — nunca elegir por el usuario. Mostrar el dropdown.
        setResultadosMatricula(parciales as unknown as VehiculoResultadoBusqueda[])
        setDropdownMatriculaAbierto(true)
      }
    } finally {
      setBuscandoMatricula(false)
    }
  }

  // Crear cliente nuevo
  const crearCliente = async () => {
    if (!nuevoCliente.nombre.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }

    if (!tallerId) {
      toast.error('Error: taller no identificado')
      return
    }

    setCreandoCliente(true)
    try {
      // Unir apellidos para compatibilidad con BD actual
      const apellidosCompletos = [nuevoCliente.primer_apellido, nuevoCliente.segundo_apellido]
        .filter(Boolean)
        .join(' ')
        .trim()

      const { data, error } = await supabase
        .from('clientes')
        .insert({
          taller_id: tallerId,
          nombre: nuevoCliente.nombre.trim(),
          apellidos: apellidosCompletos || null,
          nif: nuevoCliente.nif?.toUpperCase() || null,
          telefono: nuevoCliente.telefono || null,
          email: nuevoCliente.email || null,
          estado: 'activo',
          tipo_cliente: 'personal'
        })
        .select()
        .single()

      if (error) throw error

      // Añadir a la lista y seleccionar
      setClientes(prev => [...prev, data])
      setFormData(prev => ({ ...prev, cliente_id: data.id, vehiculo_id: '' }))

      // Limpiar formulario
      setNuevoCliente({
        nombre: '',
        primer_apellido: '',
        segundo_apellido: '',
        nif: '',
        telefono: '',
        email: ''
      })
      setMostrarFormCliente(false)
      toast.success('Cliente creado correctamente')
    } catch (error: any) {
      console.error('Error creando cliente:', error)
      toast.error(error.message || 'Error al crear cliente')
    } finally {
      setCreandoCliente(false)
    }
  }

  // Crear vehículo nuevo
  const crearVehiculo = async () => {
    if (!nuevoVehiculo.matricula.trim()) {
      toast.error('La matrícula es obligatoria')
      return
    }

    if (!tallerId) {
      toast.error('Error: taller no identificado')
      return
    }

    setCreandoVehiculo(true)
    try {
      const { data, error } = await supabase
        .from('vehiculos')
        .insert({
          taller_id: tallerId,
          cliente_id: formData.cliente_id || null, // Client is optional in matricula-first flow
          matricula: nuevoVehiculo.matricula.toUpperCase().replace(/\s/g, ''),
          marca: nuevoVehiculo.marca || null,
          modelo: nuevoVehiculo.modelo || null,
          año: nuevoVehiculo.año || null,
          color: nuevoVehiculo.color || null,
          kilometros: nuevoVehiculo.kilometros || null,
          tipo_combustible: nuevoVehiculo.tipo_combustible || null,
          vin: nuevoVehiculo.vin || null,
        })
        .select()
        .single()

      if (error) throw error

      // Añadir a la lista y seleccionar
      setVehiculos(prev => [...prev, data])
      setFormData(prev => ({ ...prev, vehiculo_id: data.id }))

      // Limpiar formulario
      setNuevoVehiculo({
        matricula: '',
        marca: null,
        modelo: null,
        año: new Date().getFullYear(),
        color: null,
        kilometros: 0,
        tipo_combustible: null,
        vin: null,
        carroceria: null,
        potencia_cv: null,
        cilindrada: null
      })
      setMostrarFormVehiculo(false)
      toast.success('Vehículo creado correctamente')
    } catch (error: any) {
      console.error('Error creando vehículo:', error)
      toast.error(error.message || 'Error al crear vehículo')
    } finally {
      setCreandoVehiculo(false)
    }
  }

  // Iniciar edición de vehículo
  const iniciarEdicionVehiculo = () => {
    const vehiculo = vehiculos.find(v => v.id === formData.vehiculo_id)
    if (!vehiculo) return

    setVehiculoEditado({
      matricula: vehiculo.matricula || '',
      marca: vehiculo.marca || null,
      modelo: vehiculo.modelo || null,
      año: vehiculo.año || new Date().getFullYear(),
      color: vehiculo.color || null,
      kilometros: vehiculo.kilometros || 0,
      tipo_combustible: vehiculo.tipo_combustible || null,
      vin: vehiculo.vin || vehiculo.bastidor_vin || null,
      potencia_cv: vehiculo.potencia_cv || null,
      cilindrada: vehiculo.cilindrada || null,
      carroceria: vehiculo.carroceria || null
    })
    setEditandoVehiculo(true)
  }

  // Guardar edición de vehículo
  const guardarEdicionVehiculo = async () => {
    if (!formData.vehiculo_id) return

    setGuardandoVehiculo(true)
    try {
      const { error } = await supabase
        .from('vehiculos')
        .update({
          matricula: vehiculoEditado.matricula.toUpperCase().replace(/\s/g, ''),
          marca: vehiculoEditado.marca || null,
          modelo: vehiculoEditado.modelo || null,
              año: vehiculoEditado.año || null,
              color: vehiculoEditado.color || null,
              kilometros: vehiculoEditado.kilometros || null,
          tipo_combustible: vehiculoEditado.tipo_combustible || null,
          vin: vehiculoEditado.vin || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', formData.vehiculo_id)

      if (error) throw error

      // Actualizar lista local de vehículos
      setVehiculos(prev => prev.map(v =>
        v.id === formData.vehiculo_id
          ? {
              ...v,
              matricula: vehiculoEditado.matricula?.toUpperCase() || '',
              marca: vehiculoEditado.marca || null,
              modelo: vehiculoEditado.modelo || null,
              año: vehiculoEditado.año || null,
              color: vehiculoEditado.color || null,
              kilometros: vehiculoEditado.kilometros || null,
              tipo_combustible: vehiculoEditado.tipo_combustible || null,
              vin: vehiculoEditado.vin || null,
            }
          : v
      ))

      setEditandoVehiculo(false)
      toast.success('Vehículo actualizado correctamente')
    } catch (error: any) {
      console.error('Error actualizando vehículo:', error)
      toast.error(error.message || 'Error al actualizar vehículo')
    } finally {
      setGuardandoVehiculo(false)
    }
  }

  // Actualizar KM del vehículo desde OCR
  const actualizarKMVehiculo = async (nuevoKM: number) => {
    if (!formData.vehiculo_id) {
      toast.error('Selecciona un vehículo primero')
      return
    }

    const vehiculo = vehiculos.find(v => v.id === formData.vehiculo_id)
    if (!vehiculo) return

    // Solo actualizar si el nuevo KM es mayor que el actual
    if (vehiculo.kilometros && nuevoKM <= vehiculo.kilometros) {
      toast.info(`KM detectados (${nuevoKM.toLocaleString()}) no son mayores que los actuales (${vehiculo.kilometros.toLocaleString()})`)
      return
    }

    try {
      const { error } = await supabase
        .from('vehiculos')
        .update({ kilometros: nuevoKM, updated_at: new Date().toISOString() })
        .eq('id', formData.vehiculo_id)

      if (error) throw error

      // Actualizar el estado local
      setVehiculos(prev => prev.map(v =>
        v.id === formData.vehiculo_id ? { ...v, kilometros: nuevoKM } : v
      ))

      toast.success(`✅ KM actualizados: ${nuevoKM.toLocaleString()}`)
    } catch (error: any) {
      console.error('Error actualizando KM:', error)
      toast.error('Error al actualizar KM')
    }
  }

  const actualizarVinVehiculo = async (nuevoVin: string) => {
    if (!formData.vehiculo_id) {
      toast.error('Selecciona un vehículo primero')
      return
    }

    try {
      const { error } = await supabase
        .from('vehiculos')
        .update({ vin: nuevoVin.toUpperCase(), updated_at: new Date().toISOString() })
        .eq('id', formData.vehiculo_id)

      if (error) throw error

      setVehiculos(prev => prev.map(v =>
        v.id === formData.vehiculo_id ? { ...v, vin: nuevoVin.toUpperCase() } : v
      ))

      toast.success('Bastidor (VIN) actualizado')
    } catch (error: any) {
      console.error('Error actualizando VIN:', error)
      toast.error('Error al actualizar el bastidor')
    }
  }

  // Cargar totales calculados en el servidor
  const cargarTotales = useCallback(async () => {
    if (!ordenSeleccionada || modoCrear) {
      // En modo crear, calcular totales localmente temporalmente
      // hasta que se guarde la orden y tengamos un ID
      // El % de IVA de la orden (toggle "Aplicar IVA") manda para todas las líneas,
      // salvo los suplidos, que por normativa siempre van al 0% independientemente del toggle.
      const ivaOrdenPct = formData.iva_porcentaje ?? ivaConfigTaller
      const totalesTemp = lineas.reduce(
        (acc, linea) => {
          const subtotal = linea.cantidad * linea.precio_unitario
          const ivaPctLinea = linea.tipo === 'suplido' ? 0 : ivaOrdenPct
          const iva = subtotal * (ivaPctLinea / 100)
          return {
            manoObra: linea.tipo === 'mano_obra' ? acc.manoObra + subtotal : acc.manoObra,
            piezas: linea.tipo === 'pieza' ? acc.piezas + subtotal : acc.piezas,
            servicios: linea.tipo === 'servicio' ? acc.servicios + subtotal : acc.servicios,
            subtotal: acc.subtotal + subtotal,
            iva: acc.iva + iva,
            total: acc.total + subtotal + iva
          }
        },
        { manoObra: 0, piezas: 0, servicios: 0, subtotal: 0, iva: 0, total: 0 }
      )
      setTotales(totalesTemp)
      return
    }

    try {
      const resultado = await calcularTotalesOrdenAction(ordenSeleccionada)
      if (resultado.success) {
        setTotales(resultado.data)
      } else {
        toast.error(`Error al cargar totales: ${resultado.error}`)
      }
    } catch (error) {
      console.error('Error cargando totales:', error)
      toast.error('Error al cargar totales')
    }
  }, [ordenSeleccionada, modoCrear, lineas, ivaConfigTaller, formData.iva_porcentaje])

  // Actualizar totales cuando cambien las líneas
  useEffect(() => {
    cargarTotales()
  }, [cargarTotales])

  const agregarLinea = async () => {
    if (ordenBloqueada) {
      toast.error('Orden facturada: ya no se puede modificar')
      return
    }
    if (!nuevaLinea.descripcion) {
      toast.error('Añade una descripción')
      return
    }

    // En edición (orden ya existe), persistir la línea inmediatamente — igual que ya
    // hace eliminarLinea — para que el Resumen Económico (que recalcula desde la BD)
    // la vea de inmediato, en vez de quedar solo en estado local hasta el próximo
    // "Guardar" general. Sin esto, líneas añadidas parecían no sumar al total.
    if (!modoCrear && ordenSeleccionada) {
      const importe_total = nuevaLinea.cantidad * nuevaLinea.precio_unitario
      const { data, error } = await supabase
        .from('lineas_orden')
        .insert({
          orden_id: ordenSeleccionada,
          tipo: nuevaLinea.tipo,
          descripcion: nuevaLinea.descripcion,
          cantidad: nuevaLinea.cantidad,
          precio_unitario: nuevaLinea.precio_unitario,
          importe_total
        })
        .select('id')
        .single()

      if (error || !data) {
        console.error('Error guardando línea:', error)
        toast.error('Error al añadir la línea')
        return
      }

      setLineas([...lineas, { id: data.id, ...nuevaLinea }])
    } else {
      setLineas([...lineas, {
        id: `new-${Date.now()}`,
        ...nuevaLinea,
        isNew: true
      }])
    }

    setNuevaLinea({ tipo: 'mano_obra', descripcion: '', cantidad: 1, precio_unitario: 0 })

    if (nuevaLinea.precio_unitario === 0) {
      toast.warning('⚠️ Línea añadida sin precio. Edítala después para añadir el precio.')
    } else {
      toast.success('Línea añadida')
    }
  }

  const agregarPiezaRapida = async () => {
    if (ordenBloqueada) {
      toast.error('Orden facturada: ya no se puede modificar')
      return
    }
    const desc = piezaRapida.descripcion?.trim()
    const qty = piezaRapida.cantidad || 1
    const precio = piezaRapida.precio || 0
    const tipo = (piezaRapida.tipo || 'pieza') as TipoLinea

    if (!desc) {
      toast.error('Escribe una descripción')
      return
    }

    // Mismo fix que agregarLinea: persistir de inmediato en edición para que el
    // Resumen Económico (recalculado desde la BD) refleje la pieza al momento.
    if (!modoCrear && ordenSeleccionada) {
      const importe_total = qty * precio
      const { data, error } = await supabase
        .from('lineas_orden')
        .insert({
          orden_id: ordenSeleccionada,
          tipo,
          descripcion: desc,
          cantidad: qty,
          precio_unitario: precio,
          importe_total
          // "estado" (presupuestado/confirmado/recibido) es solo un concepto de UI para
          // piezas — lineas_orden no tiene esa columna. Insertarlo aquí rompía SIEMPRE
          // este insert con "column lineas_orden.estado does not exist".
        })
        .select('id')
        .single()

      if (error || !data) {
        console.error('Error guardando pieza rápida:', error)
        toast.error('Error al añadir el elemento')
        return
      }

      setLineas(prev => [...prev, {
        id: data.id,
        tipo,
        descripcion: desc,
        cantidad: qty,
        precio_unitario: precio,
        estado: precio === 0 ? 'presupuestado' : 'confirmado'
      }])
    } else {
      setLineas(prev => [...prev, {
        id: `new-${Date.now()}`,
        tipo,
        descripcion: desc,
        cantidad: qty,
        precio_unitario: precio,
        estado: precio === 0 ? 'presupuestado' : 'confirmado',
        isNew: true
      }])
    }

    setPiezaRapida({ tipo: 'pieza', descripcion: '', cantidad: 1, precio: 0 })
    toast.success('Elemento añadido')
  }

  const eliminarLinea = async (id: string) => {
    if (ordenBloqueada) {
      toast.error('Orden facturada: ya no se puede modificar')
      return
    }
    if (!id.startsWith('new-')) {
      await supabase.from('lineas_orden').delete().eq('id', id)
    }
    setLineas(lineas.filter(l => l.id !== id))
    toast.success('Línea eliminada')
  }

  const actualizarLinea = async (id: string, campo: 'cantidad' | 'precio_unitario' | 'estado', valor: number | string) => {
    if (ordenBloqueada) {
      toast.error('Orden facturada: ya no se puede modificar')
      return
    }
    // Validaciones específicas
    if (campo === 'cantidad' && typeof valor === 'number') {
      // Validar rangos según tipo
      const linea = lineas.find(l => l.id === id)
      if (linea?.tipo === 'mano_obra' && valor > 24) {
        toast.error('Las horas de mano de obra no pueden exceder 24 horas')
        return
      }
      if (valor < 0) {
        toast.error('La cantidad no puede ser negativa')
        return
      }
    }

    if (campo === 'precio_unitario' && typeof valor === 'number' && valor < 0) {
      toast.error('El precio no puede ser negativo')
      return
    }

    const lineasActualizadas = lineas.map(l =>
      l.id === id ? { ...l, [campo]: valor } : l
    )
    setLineas(lineasActualizadas)

    // Igual que en agregarLinea: si ya está persistida (no es un id temporal "new-"),
    // guardar el cambio de inmediato para que el Resumen Económico quede sincronizado.
    // "estado" es solo un concepto de UI para piezas (lineas_orden no tiene esa columna),
    // así que ese campo se queda solo en estado local y nunca se manda a la BD.
    if (!id.startsWith('new-') && campo !== 'estado') {
      const linea = lineasActualizadas.find(l => l.id === id)
      if (linea) {
        const { error } = await supabase
          .from('lineas_orden')
          .update({
            [campo]: valor,
            importe_total: linea.cantidad * linea.precio_unitario
          })
          .eq('id', id)

        if (error) {
          console.error('Error actualizando línea:', error)
          toast.error('Error al guardar el cambio')
        }
      }
    }
  }

  // Validar rangos de tiempo
  const validarHorasTrabajo = (horas: number, campo: string) => {
    if (horas < 0) {
      toast.error('Las horas no pueden ser negativas')
      return false
    }
    if (horas > 100) {
      toast.error('El tiempo de trabajo parece excesivo. Por favor, verifica el valor.')
      return false
    }
    return true
  }

  // Validar año del vehículo
  const validarAnioVehiculo = (anio: number) => {
    const anioActual = new Date().getFullYear()
    const anioMinimo = 1900
    const anioMaximo = anioActual + 1 // Permitir año siguiente por modelos nuevos
    
    if (anio < anioMinimo) {
      toast.error(`El año debe ser posterior a ${anioMinimo}`)
      return false
    }
    if (anio > anioMaximo) {
      toast.error(`El año no puede ser posterior a ${anioMaximo}`)
      return false
    }
    return true
  }

  // Autosave con debounce
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)

  const autosaveOrden = async () => {
    if (!ordenSeleccionada || modoCrear || guardadoAutomatico || ordenBloqueada) return

    try {
      const ordenData = {
        estado: formData.estado,
        cliente_id: formData.cliente_id || null,
        vehiculo_id: formData.vehiculo_id || null,
        descripcion_problema: formData.descripcion_problema,
        observaciones_cliente: formData.observaciones_cliente || null,
        diagnostico: formData.diagnostico,
        trabajos_realizados: formData.trabajos_realizados,
        notas: formData.notas,
        presupuesto_aprobado_por_cliente: formData.presupuesto_aprobado_por_cliente,
        tiempo_estimado_horas: formData.tiempo_estimado_horas,
        tiempo_real_horas: formData.tiempo_real_horas,
        subtotal_mano_obra: totales.manoObra,
        subtotal_piezas: totales.piezas,
        iva_amount: totales.iva,
        total_con_iva: totales.total,
        fotos_entrada: formData.fotos_entrada,
        fotos_salida: formData.fotos_salida,
        fotos_diagnostico: formData.fotos_diagnostico,
        nivel_combustible: formData.nivel_combustible || null,
        renuncia_presupuesto: formData.renuncia_presupuesto,
        accion_imprevisto: formData.accion_imprevisto || 'avisar',
        recoger_piezas: formData.recoger_piezas,
        danos_carroceria: formData.danos_carroceria,
        coste_diario_estancia: formData.coste_diario_estancia,
        kilometros_entrada: formData.kilometros_entrada,
        kilometros_salida: formData.kilometros_salida || null,
        fecha_prevista_entrega: formData.fecha_prevista_entrega || null,
        iva_porcentaje: formData.iva_porcentaje ?? 21,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('ordenes_reparacion')
        .update(ordenData)
        .eq('id', ordenSeleccionada)

      if (!error) {
        setGuardadoAutomatico(true)
        // Mostrar indicador sutil de guardado
        setTimeout(() => setGuardadoAutomatico(false), 2000)
        sincronizarCalendarioSiCambioEstado()
      }
    } catch (error) {
      // Silenciar errores de autosave para no interrumpir al usuario
      console.debug('Error en autosave:', error)
    }
  }

  // Memoizar triggerAutosave para evitar re-renderizaciones
  const triggerAutosave = useCallback(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    const timer = setTimeout(() => {
      autosaveOrden()
    }, 2000) // 2 segundos de debounce

    setDebounceTimer(timer)
  }, [debounceTimer, ordenSeleccionada, modoCrear, totales, formData])

  const mensajeAmigable = (error: any): string => {
    const msg = String(error?.message || '')
    if (/duplicate key|unique constraint/i.test(msg)) return 'Ya existe un registro con estos datos'
    if (/foreign key|violates/i.test(msg)) return 'Datos relacionados no válidos, revisa cliente y vehículo'
    if (!msg || /^[A-Za-z0-9]{5,}$/.test(msg)) return 'No se pudo guardar la orden. Inténtalo de nuevo'
    return msg
  }

  const handleGuardar = async () => {
    if (!tallerId) {
      toast.error('Error: Taller no identificado')
      return
    }

    if (!formData.cliente_id) {
      toast.error('Selecciona un cliente')
      return
    }

    if (!modoCrear && !ordenSeleccionada) {
      toast.error('No se pudo identificar la orden a actualizar')
      return
    }

    if (ordenBloqueada) {
      toast.error('Orden facturada: ya no se puede modificar')
      return
    }

    setGuardando(true)
    try {
      const ordenData = {
        taller_id: tallerId,
        numero_orden: ordenNumero,
        estado: formData.estado,
        cliente_id: formData.cliente_id || null,
        vehiculo_id: formData.vehiculo_id || null,
        descripcion_problema: formData.descripcion_problema,
        observaciones_cliente: formData.observaciones_cliente || null,
        diagnostico: formData.diagnostico,
        trabajos_realizados: formData.trabajos_realizados,
        notas: formData.notas,
        presupuesto_aprobado_por_cliente: formData.presupuesto_aprobado_por_cliente,
        tiempo_estimado_horas: formData.tiempo_estimado_horas,
        tiempo_real_horas: formData.tiempo_real_horas,
        subtotal_mano_obra: totales.manoObra,
        subtotal_piezas: totales.piezas,
        iva_amount: totales.iva,
        total_con_iva: totales.total,
        fotos_entrada: formData.fotos_entrada,
        fotos_salida: formData.fotos_salida,
        fotos_diagnostico: formData.fotos_diagnostico,
        nivel_combustible: formData.nivel_combustible || null,
        renuncia_presupuesto: formData.renuncia_presupuesto,
        accion_imprevisto: formData.accion_imprevisto || 'avisar',
        recoger_piezas: formData.recoger_piezas,
        danos_carroceria: formData.danos_carroceria || null,
        coste_diario_estancia: formData.coste_diario_estancia || null,
        kilometros_entrada: formData.kilometros_entrada || null,
        fecha_prevista_entrega: formData.fecha_prevista_entrega || null,
        iva_porcentaje: formData.iva_porcentaje ?? 21,
      }

      let ordenId = ordenSeleccionada

      if (modoCrear) {
        const { data, error } = await supabase
          .from('ordenes_reparacion')
          .insert([ordenData])
          .select('id')
          .single()

        if (error) throw error
        ordenId = data.id
        toast.success('Orden creada correctamente')
      } else {
        const { error } = await supabase
          .from('ordenes_reparacion')
          .update({
            ...ordenData,
            updated_at: new Date().toISOString()
          })
          .eq('id', ordenSeleccionada)

        if (error) throw error
        toast.success('Orden actualizada')
      }

      // Guardar líneas nuevas
      const lineasNuevas = lineas.filter(l => l.isNew)
      if (lineasNuevas.length > 0 && ordenId) {
        const { error: lineasError } = await supabase
          .from('lineas_orden')
          .insert(lineasNuevas.map(l => ({
            orden_id: ordenId,
            tipo: l.tipo,
            descripcion: l.descripcion,
            cantidad: l.cantidad,
            precio_unitario: l.precio_unitario,
            importe_total: l.cantidad * l.precio_unitario
          })))

        if (lineasError) {
          console.error('Error guardando líneas nuevas:', lineasError)
        }
      }

      // Actualizar líneas existentes
      const lineasExistentes = lineas.filter(l => !l.isNew && !l.id.startsWith('new-'))
      for (const linea of lineasExistentes) {
        const { error: updateError } = await supabase
          .from('lineas_orden')
          .update({
            cantidad: linea.cantidad,
            precio_unitario: linea.precio_unitario,
            importe_total: linea.cantidad * linea.precio_unitario
          })
          .eq('id', linea.id)

        if (updateError) {
          console.error('Error actualizando línea:', linea.id, updateError)
        }
      }

      onActualizar()
      if (modoCrear) {
        localStorage.removeItem('orden_form_wizard')
      }
      if (modoCrear && ordenId && onOrdenCreada) {
        onOrdenCreada(ordenId)
      } else {
        onClose()
      }
    } catch (error: any) {
      console.error('Error guardando:', error)
      toast.error(mensajeAmigable(error))
    } finally {
      setGuardando(false)
    }
  }

  // Función auxiliar para guardar orden antes de facturar
  const guardarOrdenAntesDeFacturar = async () => {
    if (!ordenSeleccionada) return false

    try {
      const ordenData = {
        estado: formData.estado,
        cliente_id: formData.cliente_id || null,
        vehiculo_id: formData.vehiculo_id || null,
        descripcion_problema: formData.descripcion_problema,
        observaciones_cliente: formData.observaciones_cliente || null,
        diagnostico: formData.diagnostico,
        trabajos_realizados: formData.trabajos_realizados,
        notas: formData.notas,
        presupuesto_aprobado_por_cliente: formData.presupuesto_aprobado_por_cliente,
        tiempo_estimado_horas: formData.tiempo_estimado_horas,
        tiempo_real_horas: formData.tiempo_real_horas,
        subtotal_mano_obra: totales.manoObra,
        subtotal_piezas: totales.piezas,
        iva_amount: totales.iva,
        total_con_iva: totales.total,
        fotos_entrada: formData.fotos_entrada,
        fotos_salida: formData.fotos_salida,
        fotos_diagnostico: formData.fotos_diagnostico,
        nivel_combustible: formData.nivel_combustible || null,
        renuncia_presupuesto: formData.renuncia_presupuesto,
        accion_imprevisto: formData.accion_imprevisto || 'avisar',
        recoger_piezas: formData.recoger_piezas,
        danos_carroceria: formData.danos_carroceria,
        coste_diario_estancia: formData.coste_diario_estancia,
        kilometros_entrada: formData.kilometros_entrada,
        kilometros_salida: formData.kilometros_salida || null,
        fecha_prevista_entrega: formData.fecha_prevista_entrega || null,
        iva_porcentaje: formData.iva_porcentaje ?? 21,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('ordenes_reparacion')
        .update(ordenData)
        .eq('id', ordenSeleccionada)

      if (error) {
        console.error('Error guardando orden:', error)
        toast.error('Error al guardar la orden')
        return false
      }

      return true
    } catch (error) {
      console.error('Error guardando orden:', error)
      toast.error('Error al guardar la orden')
      return false
    }
  }

  // Crear borrador editable
  const crearBorradorFactura = async () => {
    if (!ordenSeleccionada || !tallerId) {
      toast.error('Datos incompletos')
      return
    }

    setGuardando(true)
    const guardado = await guardarOrdenAntesDeFacturar()
    setGuardando(false)

    if (!guardado) return

    setGenerandoFactura(true)
    try {
      toast.loading('Creando borrador editable...')
      
      const resCrear = await fetch('/api/facturas/desde-orden', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orden_id: ordenSeleccionada,
          taller_id: tallerId,
          serie: serieSeleccionada || undefined
        })
      })

      const dataBorrador = await resCrear.json()
      toast.dismiss()

      if (!resCrear.ok) {
        throw new Error(dataBorrador.error || 'Error al crear borrador')
      }

      toast.success('📝 Borrador creado. Ahora puedes editar los detalles.')
      onActualizar()
      router.push(`/dashboard/facturas/ver?id=${dataBorrador.id}&modo=editar`)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setGenerandoFactura(false)
    }
  }

  // Emitir factura directamente
  const emitirFacturaDirecta = async () => {
    if (!ordenSeleccionada || !tallerId) {
      toast.error('Datos incompletos')
      return
    }

    setGuardando(true)
    const guardado = await guardarOrdenAntesDeFacturar()
    setGuardando(false)

    if (!guardado) return

    setGenerandoFactura(true)
    try {
      // PASO 1: Crear borrador desde orden
      toast.loading('Generando factura...')
      const resCrear = await fetch('/api/facturas/desde-orden', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orden_id: ordenSeleccionada,
          taller_id: tallerId,
          serie: serieSeleccionada || undefined
        })
      })

      const dataBorrador = await resCrear.json()

      if (!resCrear.ok) {
        throw new Error(dataBorrador.error || 'Error al generar factura')
      }

      // PASO 2: Emitir factura (asignar número)
      const resEmitir = await fetch('/api/facturas/emitir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          factura_id: dataBorrador.id,
          estado_final: 'emitida' // Facturas desde órdenes se emiten como pendientes de pago
        })
      })

      const dataEmitida = await resEmitir.json()

      toast.dismiss()
      if (!resEmitir.ok) {
        // Si falla la emisión, aún así tenemos el borrador
        toast.warning(`Borrador creado pero no se pudo emitir: ${dataEmitida.error}`)
        onActualizar()
        router.push(`/dashboard/facturas/ver?id=${dataBorrador.id}`)
      } else {
        toast.success(`⚡ Factura ${dataEmitida.numero_factura} emitida correctamente`)
        onActualizar()
        router.push(`/dashboard/facturas/ver?id=${dataBorrador.id}`)
      }
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setGenerandoFactura(false)
    }
  }

  // Cobro Rápido — Factura simplificada (< 3000€)
  const cobroRapido = async () => {
    if (!ordenSeleccionada || !tallerId) {
      toast.error('Datos incompletos')
      return
    }

    setGuardando(true)
    const guardado = await guardarOrdenAntesDeFacturar()
    setGuardando(false)
    if (!guardado) return

    setGenerandoFactura(true)
    try {
      toast.loading('Procesando cobro rápido...')
      const res = await fetch('/api/facturas/cobro-rapido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orden_id: ordenSeleccionada, serie: serieSeleccionada || undefined }),
      })
      const data = await res.json()
      toast.dismiss()

      if (!res.ok) {
        throw new Error(data.error || 'Error en cobro rápido')
      }

      toast.success(`⚡ ${data.message || `Factura ${data.numero_factura} emitida y pagada`}`)
      onActualizar()
      router.push(`/dashboard/facturas?ref=${data.id}`)
    } catch (error: any) {
      toast.dismiss()
      toast.error(error.message)
    } finally {
      setGenerandoFactura(false)
    }
  }

  // Compartir presupuesto y obtener enlace
  const handleCompartirPresupuesto = async () => {
    if (!ordenSeleccionada) return

    setCompartiendo(true)
    try {
      const res = await fetch('/api/ordenes/compartir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orden_id: ordenSeleccionada })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al compartir')
      }

      setEnlacePresupuesto(data.url)
      toast.success('Enlace generado correctamente')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setCompartiendo(false)
    }
  }

  const copiarEnlace = async () => {
    if (!enlacePresupuesto) return
    await navigator.clipboard.writeText(enlacePresupuesto)
    toast.success('Enlace copiado al portapapeles')
  }

  const enviarWhatsApp = () => {
    if (!enlacePresupuesto) return
    const cliente = clientes.find(c => c.id === formData.cliente_id)
    const texto = encodeURIComponent(
      `Hola ${cliente?.nombre || ''}, te enviamos el presupuesto de tu vehículo.\n\n` +
      `📋 Ver presupuesto: ${enlacePresupuesto}\n\n` +
      `Puedes aceptarlo directamente desde el enlace.`
    )
    const telefono = cliente?.telefono?.replace(/\D/g, '') || ''
    window.open(`https://wa.me/${telefono}?text=${texto}`, '_blank')
  }

  // Una orden facturada (número asignado, VeriFACTU encadenado) queda bloqueada:
  // ni el estado ni ningún dato de la orden se puede seguir editando desde aquí.
  const ordenBloqueada = !modoCrear && formData.estado === 'facturado'

  const cambiarEstado = (nuevoEstado: string) => {
    if (ordenBloqueada) return
    setFormData(prev => ({ ...prev, estado: nuevoEstado }))
  }

  const vehiculoSeleccionado = vehiculos.find(v => v.id === formData.vehiculo_id)

  if (cargando) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-sky-600" />
          <p className="text-gray-600">Cargando orden...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50">
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-gray-50 shadow-xl flex flex-col">
        {/* Header con componente extraído */}
        <OrdenHeader
          modoCrear={modoCrear}
          ordenNumero={ordenNumero}
          guardadoAutomatico={guardadoAutomatico}
          estadoActual={formData.estado}
          onCambiarEstado={cambiarEstado}
          onClose={onClose}
          mostrarEstados={mostrarEstados}
          onToggleEstados={setMostrarEstados}
          bloqueado={ordenBloqueada}
        />

        {/* Tabs (edición) / Indicador de paso (creación) */}
        {modoCrear ? (
          <div className="bg-white border-b shrink-0 px-4 py-4">
            <div className="flex items-center mb-3">
              {[1, 2, 3, 4].map(s => (
                <div key={s} className="flex items-center flex-1 last:flex-none">
                  <div
                    className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                      s < stepCrear
                        ? 'bg-green-600 text-white'
                        : s === stepCrear
                        ? 'bg-sky-600 text-white'
                        : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {s < stepCrear ? <Check className="w-4 h-4" /> : s}
                  </div>
                  {s < 4 && (
                    <div className="flex-1 h-1 mx-1 rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className={`h-full bg-sky-600 transition-all duration-300 ${s < stepCrear ? 'w-full' : 'w-0'}`}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-lg font-bold text-gray-900">Paso {stepCrear} de 4</p>
            <p className="text-sm text-gray-500">{['Selecciona Vehículo', 'Selecciona Cliente', 'Describe el Trabajo', 'Revisar Orden'][stepCrear - 1]}</p>
          </div>
        ) : (
          <div className="bg-white border-b flex shrink-0 overflow-x-auto">
            {[
              { id: 'info', label: 'Info', icon: '📋' },
              { id: 'fotos', label: 'Fotos', icon: '📸' },
              { id: 'trabajo', label: 'Trabajo', icon: '🔧' },
              { id: 'items', label: 'Elementos', icon: '💰' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id as any)}
                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap px-2 ${
                  tab === t.id
                    ? 'border-sky-600 text-sky-600 bg-sky-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                <span className="mr-1">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Wizard de creación — 4 pasos cortos: vehículo, cliente, descripción, revisar */}
          {modoCrear && stepCrear === 1 && (
            <OrdenVehiculoStep
              vehiculoId={formData.vehiculo_id}
              clienteId={formData.cliente_id}
              vehiculos={vehiculos}
              vehiculoSeleccionado={vehiculoSeleccionado}
              mostrarFormVehiculo={mostrarFormVehiculo}
              editandoVehiculo={editandoVehiculo}
              creandoVehiculo={creandoVehiculo}
              guardandoVehiculo={guardandoVehiculo}
              nuevoVehiculo={nuevoVehiculo}
              vehiculoEditado={vehiculoEditado}
              matriculaInput={matriculaInput}
              buscandoMatricula={buscandoMatricula}
              matriculaNoEncontrada={matriculaNoEncontrada}
              resultadosBusqueda={resultadosMatricula}
              dropdownAbierto={dropdownMatriculaAbierto}
              onVehiculoIdChange={(id) => setFormData(prev => ({ ...prev, vehiculo_id: id }))}
              onToggleFormVehiculo={() => setMostrarFormVehiculo(!mostrarFormVehiculo)}
              onToggleEditandoVehiculo={() => setEditandoVehiculo(!editandoVehiculo)}
              onNuevoVehiculoChange={(data) => setNuevoVehiculo((prev: VehiculoNuevoFormulario) => ({ ...prev, ...data }))}
              onVehiculoEditadoChange={(data) => setVehiculoEditado((prev: VehiculoEdicionFormulario) => ({ ...prev, ...data }))}
              onCrearVehiculo={crearVehiculo}
              onGuardarVehiculo={guardarEdicionVehiculo}
              onMatriculaInputChange={handleMatriculaInputChange}
              onBuscarMatricula={buscarPorMatricula}
              onSeleccionarResultado={seleccionarVehiculoBusqueda}
              onCerrarDropdown={() => setDropdownMatriculaAbierto(false)}
            />
          )}

          {modoCrear && stepCrear === 2 && (
            <OrdenClienteStep
              clienteId={formData.cliente_id}
              clientes={clientes}
              mostrarFormCliente={mostrarFormCliente}
              creandoCliente={creandoCliente}
              nuevoCliente={nuevoCliente}
              onClienteIdChange={(id) => setFormData(prev => ({ ...prev, cliente_id: id }))}
              onToggleFormCliente={() => setMostrarFormCliente(!mostrarFormCliente)}
              onNuevoClienteChange={(data) => setNuevoCliente((prev: any) => ({ ...prev, ...data }))}
              onCrearCliente={crearCliente}
            />
          )}

          {modoCrear && stepCrear === 3 && (
            <OrdenDescripcionStep
              descripcionProblema={formData.descripcion_problema || ''}
              observaciones={formData.observaciones_cliente || ''}
              onDescripcionChange={(value) => setFormData(prev => ({ ...prev, descripcion_problema: value }))}
              onObservacionesChange={(value) => setFormData(prev => ({ ...prev, observaciones_cliente: value }))}
            />
          )}

          {modoCrear && stepCrear === 4 && (
            <div className="space-y-4">
              <Card className="p-4 divide-y divide-gray-100">
                <div className="pb-3">
                  <h3 className="text-xs font-semibold text-gray-500 mb-1">🚗 Vehículo</h3>
                  {vehiculoSeleccionado ? (
                    <p className="text-sm text-gray-900">
                      {vehiculoSeleccionado.marca} {vehiculoSeleccionado.modelo} · {vehiculoSeleccionado.matricula}
                      {vehiculoSeleccionado.kilometros ? ` · ${vehiculoSeleccionado.kilometros.toLocaleString()} km` : ''}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400">Sin vehículo seleccionado</p>
                  )}
                </div>

                <div className="py-3">
                  <h3 className="text-xs font-semibold text-gray-500 mb-1">👤 Cliente</h3>
                  {(() => {
                    const cliente = clientes.find(c => c.id === formData.cliente_id)
                    return cliente ? (
                      <p className="text-sm text-gray-900">
                        {cliente.nombre} {cliente.primer_apellido || cliente.apellidos || ''}
                        {cliente.telefono ? ` · ${cliente.telefono}` : ''}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400">Sin cliente seleccionado</p>
                    )
                  })()}
                </div>

                <div className="pt-3">
                  <h3 className="text-xs font-semibold text-gray-500 mb-1">🔧 Trabajo</h3>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">
                    {formData.descripcion_problema || 'Sin descripción del problema'}
                  </p>
                  {formData.observaciones_cliente && (
                    <>
                      <h3 className="text-xs font-semibold text-gray-500 mb-1 mt-3">📝 Observaciones</h3>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{formData.observaciones_cliente}</p>
                    </>
                  )}
                </div>
              </Card>

              <p className="text-xs text-gray-400 text-center px-4">
                Podrás añadir fotos, elementos y más detalles justo después de crear la orden.
              </p>
            </div>
          )}

          {/* Edición — tabs libres, sin wizard */}
          {ordenBloqueada && (
            <div className="p-3 bg-gray-800 text-white rounded-xl flex items-center gap-2 text-sm font-medium">
              🔒 Orden facturada — solo lectura. Los datos ya no se pueden modificar.
            </div>
          )}

          {!modoCrear && tab === 'info' && (
            <OrdenInfoTab
              modoCrear={modoCrear}
              ordenSeleccionada={ordenSeleccionada}
              ivaConfigTaller={ivaConfigTaller}
              formData={formData}
              clientes={clientes}
              vehiculos={vehiculos}
              mostrarFormCliente={mostrarFormCliente}
              mostrarFormVehiculo={mostrarFormVehiculo}
              editandoVehiculo={editandoVehiculo}
              creandoCliente={creandoCliente}
              creandoVehiculo={creandoVehiculo}
              guardandoVehiculo={guardandoVehiculo}
              nuevoCliente={nuevoCliente}
              nuevoVehiculo={nuevoVehiculo}
              vehiculoEditado={vehiculoEditado}
              onFormDataChange={(data) => setFormData((prev: any) => ({ ...prev, ...data }))}
              onToggleFormCliente={() => setMostrarFormCliente(!mostrarFormCliente)}
              onToggleFormVehiculo={() => setMostrarFormVehiculo(!mostrarFormVehiculo)}
              onToggleEditandoVehiculo={() => setEditandoVehiculo(!editandoVehiculo)}
              onNuevoClienteChange={(data) => setNuevoCliente((prev: any) => ({ ...prev, ...data }))}
              onNuevoVehiculoChange={(data) => setNuevoVehiculo((prev: VehiculoNuevoFormulario) => ({ ...prev, ...data }))}
              onVehiculoEditadoChange={(data) => setVehiculoEditado((prev: VehiculoEdicionFormulario) => ({ ...prev, ...data }))}
              onCrearCliente={crearCliente}
              onCrearVehiculo={crearVehiculo}
              onGuardarVehiculo={guardarEdicionVehiculo}
              vehiculoSeleccionado={vehiculoSeleccionado}
              matriculaInput={matriculaInput}
              buscandoMatricula={buscandoMatricula}
              matriculaNoEncontrada={matriculaNoEncontrada}
              onMatriculaInputChange={handleMatriculaInputChange}
              onBuscarMatricula={buscarPorMatricula}
              readOnly={ordenBloqueada}
            />
          )}

          {!modoCrear && tab === 'fotos' && (
            <OrdenFotosTab
              modoCrear={modoCrear}
              ordenSeleccionada={ordenSeleccionada}
              fotosEntrada={formData.fotos_entrada || ''}
              fotosSalida={formData.fotos_salida || ''}
              fotosDiagnostico={formData.fotos_diagnostico || ''}
              vehiculoSeleccionado={vehiculoSeleccionado}
              vehiculoId={formData.vehiculo_id}
              onFotosEntradaChange={(fotos) => setFormData(prev => ({ ...prev, fotos_entrada: fotos }))}
              onFotosSalidaChange={(fotos) => setFormData(prev => ({ ...prev, fotos_salida: fotos }))}
              onFotosDiagnosticoChange={(fotos) => setFormData(prev => ({ ...prev, fotos_diagnostico: fotos }))}
              onActualizarKMVehiculo={actualizarKMVehiculo}
              onActualizarVin={actualizarVinVehiculo}
              readOnly={ordenBloqueada}
            />
          )}

          {!modoCrear && tab === 'trabajo' && (
            <OrdenTrabajoTab
              modoCrear={modoCrear}
              ordenSeleccionada={ordenSeleccionada}
              diagnostico={formData.diagnostico || ''}
              trabajosRealizados={formData.trabajos_realizados || ''}
              tiempoEstimadoHoras={formData.tiempo_estimado_horas || 0}
              tiempoRealHoras={formData.tiempo_real_horas || 0}
              fotosDiagnostico={formData.fotos_diagnostico || ''}
              onDiagnosticoChange={(value) => setFormData(prev => ({ ...prev, diagnostico: value }))}
              onTrabajosRealizadosChange={(value) => setFormData(prev => ({ ...prev, trabajos_realizados: value }))}
              onTiempoEstimadoChange={(value) => setFormData(prev => ({ ...prev, tiempo_estimado_horas: value }))}
              onTiempoRealChange={(value) => setFormData(prev => ({ ...prev, tiempo_real_horas: value }))}
              onFotosDiagnosticoChange={(fotos) => setFormData(prev => ({ ...prev, fotos_diagnostico: fotos }))}
              validarHorasTrabajo={validarHorasTrabajo}
              readOnly={ordenBloqueada}
            />
          )}

          {!modoCrear && tab === 'items' && (
            <OrdenItemsTab
              lineas={lineas}
              nuevaLinea={nuevaLinea}
              piezaRapida={piezaRapida}
              tarifaHora={tarifaHora}
              totales={totales}
              onNuevaLineaChange={setNuevaLinea}
              onAgregarLinea={agregarLinea}
              onActualizarLinea={actualizarLinea}
              onEliminarLinea={eliminarLinea}
              onPiezaRapidaChange={setPiezaRapida}
              onAgregarPiezaRapida={agregarPiezaRapida}
              readOnly={ordenBloqueada}
            />
          )}
        </div>

        {/* Footer: navegación del wizard (creación) / acciones completas (edición) */}
        {modoCrear ? (
          <div className="bg-white border-t shrink-0 p-3 flex gap-2">
            {stepCrear > 1 && (
              <Button
                variant="outline"
                size="xl"
                className="flex-1"
                onClick={() => setStepCrear(prev => (prev - 1) as 1 | 2 | 3 | 4)}
              >
                Atrás
              </Button>
            )}
            {stepCrear < 4 ? (
              <Button
                size="xl"
                className="flex-1 bg-sky-600 hover:bg-sky-700"
                disabled={
                  (stepCrear === 1 && !formData.vehiculo_id) ||
                  (stepCrear === 2 && !formData.cliente_id)
                }
                onClick={() => {
                  if (stepCrear === 3 && !formData.descripcion_problema?.trim()) {
                    toast.error('Describe el problema antes de continuar')
                    return
                  }
                  setStepCrear(prev => (prev + 1) as 1 | 2 | 3 | 4)
                }}
              >
                Siguiente
              </Button>
            ) : (
              <Button
                size="xl"
                className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                disabled={guardando}
                onClick={handleGuardar}
              >
                {guardando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" /> Guardar Orden
                  </>
                )}
              </Button>
            )}
          </div>
        ) : (
        <OrdenFooter
          modoCrear={modoCrear}
          ordenSeleccionada={ordenSeleccionada}
          guardando={guardando}
          compartiendo={compartiendo}
          generandoFactura={generandoFactura}
          ordenNumero={ordenNumero}
          enlacePresupuesto={enlacePresupuesto}
          clienteId={formData.cliente_id}
          estado={formData.estado}
          descripcionProblema={formData.descripcion_problema}
          trabajosRealizados={formData.trabajos_realizados}
          fechaPrevistaEntrega={formData.fecha_prevista_entrega}
          clientes={clientes}
          vehiculoSeleccionado={vehiculoSeleccionado}
          onCompartirPresupuesto={handleCompartirPresupuesto}
          onCopiarEnlace={copiarEnlace}
          onEnviarWhatsApp={enviarWhatsApp}
          onMostrarPDF={() => setMostrarPDF(true)}
          onCrearBorradorFactura={crearBorradorFactura}
          onEmitirFacturaDirecta={emitirFacturaDirecta}
          onCobroRapido={cobroRapido}
          totalOrden={totales.total}
          onGuardar={handleGuardar}
          onClose={onClose}
          seriesDisponibles={seriesDisponibles}
          serieSeleccionada={serieSeleccionada}
          onSerieChange={setSerieSeleccionada}
        />
        )}

        {/* Modal PDF */}
        {mostrarPDF && ordenSeleccionada && (
          <OrdenPDFViewer
            ordenId={ordenSeleccionada}
            onClose={() => setMostrarPDF(false)}
          />
        )}

        {modoCrear && mostrarModalBorrador && (
          <Dialog open={mostrarModalBorrador} onOpenChange={() => {}}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Orden borrador encontrada</DialogTitle>
                <DialogDescription>
                  Tienes una orden en borrador. ¿Qué quieres hacer?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col gap-2 sm:flex-col">
                <Button
                  type="button"
                  size="xl"
                  onClick={continuarBorrador}
                  className="w-full bg-sky-600 hover:bg-sky-700"
                >
                  Continuar con borrador
                </Button>
                <Button
                  type="button"
                  size="xl"
                  variant="outline"
                  onClick={empezarDeNuevo}
                  className="w-full"
                >
                  Empezar de nuevo
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
}
