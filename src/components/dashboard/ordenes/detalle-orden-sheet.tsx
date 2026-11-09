/**
 * @fileoverview Componente Sheet para detalle de órdenes de reparación
 * @description Panel lateral deslizante para crear/editar órdenes de trabajo
 * Incluye: info del cliente/vehículo, fotos con OCR, trabajo realizado, elementos de facturación
 */
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Loader2, ClipboardList, Camera, Wrench, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { VehiculoNuevoFormulario, VehiculoEdicionFormulario } from '@/types/formularios'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { enlaceWhatsApp } from '@/lib/compartir/whatsapp'
import { mensajePresupuesto } from '@/lib/ordenes/mensajes-whatsapp'
import { fotosToString } from '@/lib/utils'
import { OrdenHeader } from './parts/OrdenHeader'
import { OrdenTrabajoTab } from './parts/OrdenTrabajoTab'
import { OrdenItemsTab } from './parts/OrdenItemsTab'
import { OrdenFotosTab } from './parts/OrdenFotosTab'
import { OrdenInfoTab } from './parts/OrdenInfoTab'
import { OrdenClienteStep } from './parts/OrdenClienteStep'
import { OrdenVehiculoStep, type VehiculoResultadoBusqueda } from './parts/OrdenVehiculoStep'
import { OrdenDescripcionStep } from './parts/OrdenDescripcionStep'
import { OrdenFooter } from './parts/OrdenFooter'
import { OrdenPDFViewer } from './orden-pdf-viewer'
import { datosOrdenFicha } from '@/lib/ordenes/ficha-datos'
import { useLineasOrden } from './use-lineas-orden'
import { useFacturarOrden } from './use-facturar-orden'
import { useBorradorAsistente } from './use-borrador-asistente'
import { PasosAsistente, ResumenAsistente, PieAsistente } from './parts/OrdenAsistente'
import {
  cargarContextoFicha, crearOrdenFicha, guardarOrdenFicha, vehiculosDeCliente, vehiculoPorId,
  buscarVehiculos, crearVehiculoFicha, actualizarVehiculoFicha, crearClienteFicha,
} from './ficha-api'

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
  const [cargando, setCargando] = useState(!modoCrear)
  const [guardando, setGuardando] = useState(false)
  const [tab, setTab] = useState<'info' | 'fotos' | 'trabajo' | 'items'>('info')
  // Wizard mobile-first, sólo activo en modoCrear — edición sigue usando las tabs libres de arriba
  const [stepCrear, setStepCrear] = useState<1 | 2 | 3 | 4>(1)
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
  const [guardadoAutomatico, setGuardadoAutomatico] = useState(false)
  const [formData, setFormData] = useState<Orden>(FORM_DATA_INICIAL)

  // Una orden facturada (número asignado, VeriFACTU encadenado) queda bloqueada:
  // ni el estado ni ningún dato de la orden se puede seguir editando desde aquí.
  const ordenBloqueada = !modoCrear && formData.estado === 'facturado'

  const {
    lineas, setLineas, nuevaLinea, setNuevaLinea, piezaRapida, setPiezaRapida, totales,
    agregarLinea, agregarPiezaRapida, eliminarLinea, actualizarLinea,
  } = useLineasOrden({
    ordenSeleccionada, modoCrear, ordenBloqueada, tarifaHora, ivaConfigTaller,
    ivaPorcentajeOrden: formData.iva_porcentaje,
  })

  const { generandoFactura, crearBorradorFactura, emitirFacturaDirecta, cobroRapido } = useFacturarOrden({
    ordenSeleccionada, tallerId, formData, serieSeleccionada, setGuardando, onActualizar,
  })

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

  // Borrador del asistente (localStorage): se pregunta si continuar en vez de restaurar en silencio
  const { mostrarModalBorrador, continuarBorrador, empezarDeNuevo } = useBorradorAsistente<Orden>({
    activo: modoCrear,
    formData,
    paso: stepCrear,
    onRestaurar: async (fd, sc) => {
      setFormData(prev => ({ ...prev, ...fd }))
      setStepCrear(sc)
      // Sin esto, `vehiculoSeleccionado` (vehiculos.find) no encuentra nada y el paso 1
      // se renderiza en blanco pese a tener vehiculo_id ya asignado.
      if (fd.vehiculo_id) {
        const data = await vehiculoPorId(fd.vehiculo_id).catch(() => null)
        if (data) {
          setVehiculos(prev => (prev.some((v: any) => v.id === data.id) ? prev : [...prev, data]))
        }
      }
    },
    onDescartar: () => {
      setFormData(FORM_DATA_INICIAL)
      setStepCrear(1)
      setVehiculos([])
      setMostrarFormVehiculo(false)
    },
  })

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
      const contexto = await cargarContextoFicha(!modoCrear ? ordenSeleccionada : null)
      setTallerId(contexto.tallerId)

      // Configuración del taller (tarifa hora e IVA)
      const tallerConfig = contexto.config
      if (tallerConfig?.tarifa_hora) {
        setTarifaHora(tallerConfig.tarifa_hora)
      }
      if (tallerConfig?.porcentaje_iva) {
        setIvaConfigTaller(tallerConfig.porcentaje_iva)
      }

      // Series de facturación configuradas (RS, SCR, ALP, FS...) para poder
      // elegir cuál usar al generar la factura desde esta orden.
      const seriesData = contexto.series
      if (seriesData.length > 0) {
        setSeriesDisponibles(seriesData)
        // Por defecto, la misma serie que usaba producción antes del selector:
        // taller_config.serie_factura. Si no está en la lista (o no hay), se deja
        // vacío y el servidor aplica su regla (serie_factura || 'FA'), igual que antes.
        // Así ninguna factura cambia de serie salvo que el usuario elija otra.
        const configurada = seriesData.find(s => s.prefijo === tallerConfig?.serie_factura)
        setSerieSeleccionada(configurada?.prefijo ?? '')
      }

      setClientes(contexto.clientes)

      // Si estamos editando, la orden completa
      if (!modoCrear && ordenSeleccionada) {
        const ordenData = contexto.orden
        if (!ordenData) {
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

        // Vehículos del cliente
        if (ordenData.cliente_id) {
          cargarVehiculos(ordenData.cliente_id)
        }

        setLineas(contexto.lineas.map(l => ({
          id: l.id,
          tipo: l.tipo as any,
          descripcion: l.descripcion,
          cantidad: l.cantidad,
          precio_unitario: l.precio_unitario,
          isNew: false
        })))
      } else {
        // Número orientativo; el definitivo lo asigna el servidor al crear
        setOrdenNumero(contexto.siguienteNumero || '')
      }
    } catch (error: any) {
      console.error('Error inicializando:', error)
      if (!modoCrear && /no encontrada/i.test(error?.message || '')) {
        toast.error('Orden no encontrada')
        onClose()
        return
      }
      toast.error('Error al cargar datos')
    } finally {
      setCargando(false)
    }
  }

  const cargarVehiculos = async (clienteId: string) => {
    const data = await vehiculosDeCliente(clienteId).catch(() => [])

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
      setResultadosMatricula(await buscarVehiculos(query))
      setDropdownMatriculaAbierto(true)
    } catch (error) {
      console.error('Error buscando vehículos:', error)
      toast.error('Error al buscar el vehículo')
      setResultadosMatricula([])
    } finally {
      setBuscandoMatricula(false)
    }
  }, [tallerId])

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
      const exactos = await buscarVehiculos(matriculaNorm, true)
      if (exactos.length === 1) {
        seleccionarVehiculoBusqueda(exactos[0])
        return
      }

      // 2. Sin coincidencia exacta — buscar por coincidencia parcial (hasta 8).
      const parciales = await buscarVehiculos(matriculaNorm)

      if (!parciales || parciales.length === 0) {
        // No encontrado — pre-rellenar formulario de creación
        setMatriculaNoEncontrada(true)
        setResultadosMatricula([])
        setNuevoVehiculo(prev => ({ ...prev, matricula: matriculaNorm }))
        setMostrarFormVehiculo(true)
      } else if (parciales.length === 1) {
        // Un único candidato posible — sin ambigüedad, seleccionar directamente.
        seleccionarVehiculoBusqueda(parciales[0])
      } else {
        // Varias coincidencias — nunca elegir por el usuario. Mostrar el dropdown.
        setResultadosMatricula(parciales)
        setDropdownMatriculaAbierto(true)
      }
    } catch (error) {
      console.error('Error buscando vehículo por matrícula:', error)
      toast.error('Error al buscar el vehículo')
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

      const data = await crearClienteFicha({
        nombre: nuevoCliente.nombre.trim(),
        apellidos: apellidosCompletos || null,
        nif: nuevoCliente.nif?.toUpperCase() || null,
        telefono: nuevoCliente.telefono || null,
        email: nuevoCliente.email || null,
        tipo_cliente: 'personal'
      })

      // Añadir a la lista y seleccionar
      setClientes(prev => [...prev, data])
      // En el asistente el vehículo se elige antes (paso 1): se conserva.
      // Al editar, el vehículo era del cliente anterior y se deja por elegir.
      setFormData(prev => ({ ...prev, cliente_id: data.id, vehiculo_id: modoCrear ? prev.vehiculo_id : '' }))

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
      const data = await crearVehiculoFicha({
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

  // Abrir el formulario con los datos del vehículo (antes se abría vacío y
  // guardar dejaba el vehículo sin matrícula ni kilómetros) o cerrarlo
  const alternarEdicionVehiculo = () => {
    if (editandoVehiculo) setEditandoVehiculo(false)
    else iniciarEdicionVehiculo()
  }

  // Guardar edición de vehículo
  const guardarEdicionVehiculo = async () => {
    if (!formData.vehiculo_id) return

    setGuardandoVehiculo(true)
    try {
      await actualizarVehiculoFicha(formData.vehiculo_id, {
        matricula: vehiculoEditado.matricula.toUpperCase().replace(/\s/g, ''),
        marca: vehiculoEditado.marca || null,
        modelo: vehiculoEditado.modelo || null,
        año: vehiculoEditado.año || null,
        color: vehiculoEditado.color || null,
        kilometros: vehiculoEditado.kilometros || null,
        tipo_combustible: vehiculoEditado.tipo_combustible || null,
        vin: vehiculoEditado.vin || null,
      })

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
      toast.info(`KM detectados (${nuevoKM.toLocaleString('es-ES')}) no son mayores que los actuales (${vehiculo.kilometros.toLocaleString('es-ES')})`)
      return
    }

    try {
      await actualizarVehiculoFicha(formData.vehiculo_id, { kilometros: nuevoKM })

      // Actualizar el estado local
      setVehiculos(prev => prev.map(v =>
        v.id === formData.vehiculo_id ? { ...v, kilometros: nuevoKM } : v
      ))

      toast.success(`KM actualizados: ${nuevoKM.toLocaleString('es-ES')}`)
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
      await actualizarVehiculoFicha(formData.vehiculo_id, { vin: nuevoVin.toUpperCase() })

      setVehiculos(prev => prev.map(v =>
        v.id === formData.vehiculo_id ? { ...v, vin: nuevoVin.toUpperCase() } : v
      ))

      toast.success('Bastidor (VIN) actualizado')
    } catch (error: any) {
      console.error('Error actualizando VIN:', error)
      toast.error('Error al actualizar el bastidor')
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
    // El indicador «guardado» no bloquea: antes, un cambio hecho en los 2 s
    // siguientes a un autoguardado se perdía.
    if (!ordenSeleccionada || modoCrear || ordenBloqueada) return

    try {
      await guardarOrdenFicha(ordenSeleccionada, datosOrdenFicha(formData))
      setGuardadoAutomatico(true)
      // Mostrar indicador sutil de guardado
      setTimeout(() => setGuardadoAutomatico(false), 2000)
      sincronizarCalendarioSiCambioEstado()
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
  }, [debounceTimer, ordenSeleccionada, modoCrear, formData])

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
      let ordenId = ordenSeleccionada

      if (modoCrear) {
        // Las líneas añadidas en el asistente se guardan con la orden
        const lineasNuevas = lineas.filter(l => l.isNew).map(l => ({
          tipo: l.tipo,
          descripcion: l.descripcion,
          cantidad: l.cantidad,
          precio_unitario: l.precio_unitario,
        }))
        const { orden } = await crearOrdenFicha(datosOrdenFicha(formData), lineasNuevas)
        ordenId = orden.id
        toast.success('Orden creada correctamente')
      } else {
        // En edición las líneas ya están guardadas; se envían sus cantidades y precios
        const lineasExistentes = lineas
          .filter(l => !l.isNew && !l.id.startsWith('new-'))
          .map(l => ({ id: l.id, cantidad: l.cantidad, precio_unitario: l.precio_unitario }))
        await guardarOrdenFicha(ordenSeleccionada!, datosOrdenFicha(formData), lineasExistentes)
        toast.success('Orden actualizada')
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
      toast.error(error?.message || 'No se pudo guardar la orden. Inténtalo de nuevo')
    } finally {
      setGuardando(false)
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
    // enlaceWhatsApp añade el prefijo 34: sin él wa.me no encontraba al cliente
    const mensaje = mensajePresupuesto({ nombreCliente: cliente?.nombre, enlace: enlacePresupuesto })
    window.open(enlaceWhatsApp(cliente?.telefono, mensaje), '_blank', 'noopener,noreferrer')
  }

  const cambiarEstado = (nuevoEstado: string) => {
    if (ordenBloqueada) return
    setFormData(prev => ({ ...prev, estado: nuevoEstado }))
  }

  const vehiculoSeleccionado = vehiculos.find(v => v.id === formData.vehiculo_id)

  if (cargando) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
          <p className="text-gray-600">Cargando orden...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 animate-in fade-in-0 duration-200">
      <div role="dialog" aria-modal="true" aria-label={modoCrear ? 'Nueva orden' : `Orden ${ordenNumero}`} className="fixed inset-y-0 right-0 w-full max-w-lg bg-background shadow-xl flex flex-col animate-in slide-in-from-right-8 duration-200 ease-out">
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
          <PasosAsistente paso={stepCrear} />
        ) : (
          <div role="tablist" aria-label="Secciones de la orden" className="bg-card border-b flex shrink-0 overflow-x-auto">
            {([
              { id: 'info', label: 'Info', Icono: ClipboardList },
              { id: 'fotos', label: 'Fotos', Icono: Camera },
              { id: 'trabajo', label: 'Trabajo', Icono: Wrench },
              { id: 'items', label: 'Elementos', Icono: Receipt },
            ] as const).map(({ id, label, Icono }) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 min-h-11 py-3 px-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors duration-150 focus-visible:outline-none focus-visible:bg-accent ${
                  tab === id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}>
                <Icono aria-hidden className="size-4" />
                {label}
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
              onToggleEditandoVehiculo={alternarEdicionVehiculo}
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
            <ResumenAsistente
              vehiculo={vehiculoSeleccionado}
              cliente={clientes.find(c => c.id === formData.cliente_id)}
              descripcion={formData.descripcion_problema}
              observaciones={formData.observaciones_cliente}
            />
          )}

          {/* Edición — tabs libres, sin wizard */}
          {ordenBloqueada && (
            <div className="p-3 bg-gray-800 text-white rounded-xl flex items-center gap-2 text-sm font-medium">
              Orden facturada — solo lectura. Los datos ya no se pueden modificar.
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
              onToggleEditandoVehiculo={alternarEdicionVehiculo}
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
          <PieAsistente
            paso={stepCrear}
            puedeAvanzar={!((stepCrear === 1 && !formData.vehiculo_id) || (stepCrear === 2 && !formData.cliente_id))}
            guardando={guardando}
            onAtras={() => setStepCrear(prev => (prev - 1) as 1 | 2 | 3 | 4)}
            onSiguiente={() => {
              if (stepCrear === 3 && !formData.descripcion_problema?.trim()) {
                toast.error('Describe el problema antes de continuar')
                return
              }
              setStepCrear(prev => (prev + 1) as 1 | 2 | 3 | 4)
            }}
            onGuardar={handleGuardar}
          />
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
                  className="w-full bg-primary hover:bg-primary/90"
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
