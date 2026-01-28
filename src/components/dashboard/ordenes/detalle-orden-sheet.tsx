/**
 * @fileoverview Componente Sheet para detalle de órdenes de reparación
 * @description Panel lateral deslizante para crear/editar órdenes de trabajo
 * Incluye: info del cliente/vehículo, fotos con OCR, trabajo realizado, elementos de facturación
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { fotosToString, getFotoUrl, setFotoUrl, getFotoByKey, setFotoByKey } from '@/lib/utils'
import { ESTADOS_ORDEN, FRACCIONES_HORA, CANTIDADES, ESTADOS_FACTURABLES, FOTOS_DIAGNOSTICO, FOTO_LABELS, type TipoFoto } from '@/lib/constants'
import { OrdenHeader } from './parts/OrdenHeader'
import { OrdenTotalSummary } from './parts/OrdenTotalSummary'
import { OrdenTrabajoTab } from './parts/OrdenTrabajoTab'
import { OrdenItemsTab } from './parts/OrdenItemsTab'
import { OrdenFotosTab } from './parts/OrdenFotosTab'
import { OrdenInfoTab } from './parts/OrdenInfoTab'
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
}

interface DetalleOrdenSheetProps {
  ordenSeleccionada?: string | null
  ordenes?: any[]
  onClose: () => void
  onActualizar: () => void
  modoCrear?: boolean
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
  ordenSeleccionada,
  onClose,
  onActualizar,
  modoCrear = false
}: DetalleOrdenSheetProps) {
  const router = useRouter()
  const supabase = createClient()
  const [cargando, setCargando] = useState(!modoCrear)
  const [guardando, setGuardando] = useState(false)
  const [generandoFactura, setGenerandoFactura] = useState(false)
  const [tab, setTab] = useState<'info' | 'fotos' | 'trabajo' | 'items'>('info')
  const [lineas, setLineas] = useState<Linea[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [vehiculos, setVehiculos] = useState<any[]>([])
  const [tallerId, setTallerId] = useState<string>('')
  const [tarifaHora, setTarifaHora] = useState<number>(45)
  const [ivaConfigTaller, setIvaConfigTaller] = useState<number>(21)
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

  const [formData, setFormData] = useState<Orden>({
    estado: 'recibido',
    cliente_id: '',
    vehiculo_id: '',
    descripcion_problema: '',
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
  })

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

  // Estado para editar vehículo existente
  const [editandoVehiculo, setEditandoVehiculo] = useState(false)
  const [guardandoVehiculo, setGuardandoVehiculo] = useState(false)
  const [vehiculoEditado, setVehiculoEditado] = useState<VehiculoEdicionFormulario>({
    matricula: '',
    marca: null,
    modelo: null,
    año: null,
    color: null,
    kilometros: null,
    tipo_combustible: null,
    vin: null,
    taller_id: ''
  })

  // Cargar datos iniciales
  useEffect(() => {
    inicializar()
  }, [])

  // Cargar vehículos cuando cambia el cliente
  useEffect(() => {
    if (formData.cliente_id && tallerId) {
      cargarVehiculos(formData.cliente_id)
    } else {
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
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        toast.error('No autenticado')
        return
      }

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('taller_id')
        .eq('email', session.user.email)
        .single()

      if (!usuario) {
        toast.error('Usuario no encontrado')
        return
      }

      setTallerId(usuario.taller_id)

      // Cargar configuración del taller (para tarifa hora e IVA)
      const { data: tallerConfig } = await supabase
        .from('taller_config')
        .select('tarifa_hora, iva_general')
        .eq('taller_id', usuario.taller_id)
        .single()

      if (tallerConfig?.tarifa_hora) {
        setTarifaHora(tallerConfig.tarifa_hora)
      }
      if (tallerConfig?.iva_general) {
        setIvaConfigTaller(tallerConfig.iva_general)
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
        setFormData({
          estado: ordenData.estado || 'recibido',
          cliente_id: ordenData.cliente_id || '',
          vehiculo_id: ordenData.vehiculo_id || '',
          descripcion_problema: ordenData.descripcion_problema || '',
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

    setVehiculos(data || [])
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

    if (!formData.cliente_id || !tallerId) {
      toast.error('Selecciona un cliente primero')
      return
    }

    setCreandoVehiculo(true)
    try {
      const { data, error } = await supabase
        .from('vehiculos')
        .insert({
          taller_id: tallerId,
          cliente_id: formData.cliente_id,
          matricula: nuevoVehiculo.matricula.toUpperCase().replace(/\s/g, ''),
          marca: nuevoVehiculo.marca || null,
          modelo: nuevoVehiculo.modelo || null,
          año: nuevoVehiculo.año ? parseInt(nuevoVehiculo.año) : null,
          color: nuevoVehiculo.color || null,
          kilometros: nuevoVehiculo.kilometros ? parseInt(nuevoVehiculo.kilometros) : null,
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
        marca: '',
        modelo: '',
        año: '',
        color: '',
        kilometros: '',
        tipo_combustible: '',
        vin: ''
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
      marca: vehiculo.marca || '',
      modelo: vehiculo.modelo || '',
      año: vehiculo.año?.toString() || '',
      color: vehiculo.color || '',
      kilometros: vehiculo.kilometros?.toString() || '',
      tipo_combustible: vehiculo.tipo_combustible || '',
      vin: vehiculo.vin || vehiculo.bastidor_vin || ''
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

  // Cargar totales calculados en el servidor
  const cargarTotales = useCallback(async () => {
    if (!ordenSeleccionada || modoCrear) {
      // En modo crear, calcular totales localmente temporalmente
      // hasta que se guarde la orden y tengamos un ID
      const totalesTemp = lineas.reduce(
        (acc, linea) => {
          const subtotal = linea.cantidad * linea.precio_unitario
          const iva = subtotal * (ivaConfigTaller / 100) // ✅ Dinámico desde taller_config
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
  }, [ordenSeleccionada, modoCrear, lineas, ivaConfigTaller])

  // Actualizar totales cuando cambien las líneas
  useEffect(() => {
    cargarTotales()
  }, [cargarTotales])

  const agregarLinea = () => {
    if (!nuevaLinea.descripcion) {
      toast.error('Añade una descripción')
      return
    }

    setLineas([...lineas, {
      id: `new-${Date.now()}`,
      ...nuevaLinea,
      isNew: true
    }])
    setNuevaLinea({ tipo: 'mano_obra', descripcion: '', cantidad: 1, precio_unitario: 0 })

    if (nuevaLinea.precio_unitario === 0) {
      toast.warning('⚠️ Línea añadida sin precio. Edítala después para añadir el precio.')
    } else {
      toast.success('Línea añadida')
    }
  }

  const eliminarLinea = async (id: string) => {
    if (!id.startsWith('new-')) {
      await supabase.from('lineas_orden').delete().eq('id', id)
    }
    setLineas(lineas.filter(l => l.id !== id))
    toast.success('Línea eliminada')
  }

  const actualizarLinea = (id: string, campo: 'cantidad' | 'precio_unitario' | 'estado', valor: number | string) => {
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

    setLineas(lineas.map(l =>
      l.id === id ? { ...l, [campo]: valor } : l
    ))
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
    if (!ordenSeleccionada || modoCrear || guardadoAutomatico) return

    try {
      const ordenData = {
        estado: formData.estado,
        cliente_id: formData.cliente_id || null,
        vehiculo_id: formData.vehiculo_id || null,
        descripcion_problema: formData.descripcion_problema,
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

  const handleGuardar = async () => {
    if (!tallerId) {
      toast.error('Error: Taller no identificado')
      return
    }

    if (!formData.cliente_id) {
      toast.error('Selecciona un cliente')
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
      onClose()
    } catch (error: any) {
      console.error('Error guardando:', error)
      toast.error(error.message || 'Error al guardar')
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
          taller_id: tallerId
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
          taller_id: tallerId
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

  const cambiarEstado = (nuevoEstado: string) => {
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
          onImprimir={() => setMostrarPDF(true)}
          mostrarEstados={mostrarEstados}
          onToggleEstados={setMostrarEstados}
        />

        {/* Tabs */}
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

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {tab === 'info' && (
            <OrdenInfoTab
              modoCrear={modoCrear}
              ordenSeleccionada={ordenSeleccionada}
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
              onFormDataChange={(data) => setFormData(prev => ({ ...prev, ...data }))}
              onToggleFormCliente={() => setMostrarFormCliente(!mostrarFormCliente)}
              onToggleFormVehiculo={() => setMostrarFormVehiculo(!mostrarFormVehiculo)}
              onToggleEditandoVehiculo={() => setEditandoVehiculo(!editandoVehiculo)}
              onNuevoClienteChange={(data) => setNuevoCliente(prev => ({ ...prev, ...data }))}
              onNuevoVehiculoChange={(data) => setNuevoVehiculo(prev => ({ ...prev, ...data }))}
              onVehiculoEditadoChange={(data) => setVehiculoEditado(prev => ({ ...prev, ...data }))}
              onCrearCliente={crearCliente}
              onCrearVehiculo={crearVehiculo}
              onGuardarVehiculo={guardarVehiculo}
              vehiculoSeleccionado={vehiculoSeleccionado}
            />
          )}


          {tab === 'fotos' && (
            <OrdenFotosTab
              modoCrear={modoCrear}
              ordenSeleccionada={ordenSeleccionada}
              fotosEntrada={formData.fotos_entrada || ''}
              fotosSalida={formData.fotos_salida || ''}
              vehiculoSeleccionado={vehiculoSeleccionado}
              vehiculoId={formData.vehiculo_id}
              onFotosEntradaChange={(fotos) => setFormData(prev => ({ ...prev, fotos_entrada: fotos }))}
              onFotosSalidaChange={(fotos) => setFormData(prev => ({ ...prev, fotos_salida: fotos }))}
              onActualizarKMVehiculo={actualizarKMVehiculo}
            />
          )}

          {tab === 'trabajo' && (
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
            />
          )}

          {tab === 'items' && (
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
              onAgregarPiezaRapida={() => {
                const desc = piezaRapida.descripcion?.trim()
                const qty = piezaRapida.cantidad || 1
                const precio = piezaRapida.precio || 0

                if (!desc) {
                  toast.error('Escribe una descripción')
                  return
                }

                setLineas(prev => [...prev, {
                  id: `new-${Date.now()}`,
                  tipo: (piezaRapida.tipo || 'pieza') as TipoLinea,
                  descripcion: desc,
                  cantidad: qty,
                  precio_unitario: precio,
                  estado: precio === 0 ? 'presupuestado' : 'confirmado',
                  isNew: true
                }])

                setPiezaRapida({ tipo: 'pieza', descripcion: '', cantidad: 1, precio: 0 })
                toast.success('Elemento añadido')
              }}
            />
          )}
        </div>

        {/* Footer */}
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
          clientes={clientes}
          vehiculoSeleccionado={vehiculoSeleccionado}
          onCompartirPresupuesto={handleCompartirPresupuesto}
          onCopiarEnlace={copiarEnlace}
          onEnviarWhatsApp={enviarWhatsApp}
          onMostrarPDF={() => setMostrarPDF(true)}
          onCrearBorradorFactura={crearBorradorFactura}
          onEmitirFacturaDirecta={emitirFacturaDirecta}
          onGuardar={handleGuardar}
          onClose={onClose}
        />

        {/* Modal PDF */}
        {mostrarPDF && ordenSeleccionada && (
          <OrdenPDFViewer
            ordenId={ordenSeleccionada}
            onClose={() => setMostrarPDF(false)}
          />
        )}
      </div>
    </div>
  )
}
