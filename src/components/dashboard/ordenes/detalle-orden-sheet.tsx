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
import { OrdenPDFViewer } from './orden-pdf-viewer'
import { FotoUploader } from './foto-uploader'
import { GoogleCalendarButton } from './google-calendar-button'
import { InputScanner } from '@/components/ui/input-scanner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DecimalInput } from '@/components/ui/decimal-input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { fotosToString, getFotoUrl, setFotoUrl, getFotoByKey, setFotoByKey } from '@/lib/utils'
import { ESTADOS_ORDEN, FRACCIONES_HORA, CANTIDADES, ESTADOS_FACTURABLES, FOTOS_DIAGNOSTICO, FOTO_LABELS, type TipoFoto } from '@/lib/constants'

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
  const [ordenNumero, setOrdenNumero] = useState<string>('')
  const [mostrarEstados, setMostrarEstados] = useState(false)
  const [mostrarPDF, setMostrarPDF] = useState(false)
  const [compartiendo, setCompartiendo] = useState(false)
  const [enlacePresupuesto, setEnlacePresupuesto] = useState<string | null>(null)
  const [piezaRapida, setPiezaRapida] = useState({ tipo: 'pieza', descripcion: '', cantidad: 1, precio: 0 })
  const [guardadoAutomatico, setGuardadoAutomatico] = useState(false)

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
  const [nuevoVehiculo, setNuevoVehiculo] = useState({
    matricula: '',
    marca: '',
    modelo: '',
    año: '',
    color: '',
    kilometros: '',
    tipo_combustible: '',
    vin: ''
  })

  // Estado para editar vehículo existente
  const [editandoVehiculo, setEditandoVehiculo] = useState(false)
  const [guardandoVehiculo, setGuardandoVehiculo] = useState(false)
  const [vehiculoEditado, setVehiculoEditado] = useState({
    matricula: '',
    marca: '',
    modelo: '',
    año: '',
    color: '',
    kilometros: '',
    tipo_combustible: '',
    vin: ''
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

      // Cargar configuración del taller (para tarifa hora)
      const { data: tallerConfig } = await supabase
        .from('taller_config')
        .select('tarifa_hora')
        .eq('taller_id', usuario.taller_id)
        .single()

      if (tallerConfig?.tarifa_hora) {
        setTarifaHora(tallerConfig.tarifa_hora)
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
          año: vehiculoEditado.año ? parseInt(vehiculoEditado.año) : null,
          color: vehiculoEditado.color || null,
          kilometros: vehiculoEditado.kilometros ? parseInt(vehiculoEditado.kilometros) : null,
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
              matricula: vehiculoEditado.matricula.toUpperCase().replace(/\s/g, ''),
              marca: vehiculoEditado.marca || null,
              modelo: vehiculoEditado.modelo || null,
              año: vehiculoEditado.año ? parseInt(vehiculoEditado.año) : null,
              color: vehiculoEditado.color || null,
              kilometros: vehiculoEditado.kilometros ? parseInt(vehiculoEditado.kilometros) : null,
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

  // Calcular totales
  const totales = lineas.reduce(
    (acc, linea) => {
      const subtotal = linea.cantidad * linea.precio_unitario
      const iva = subtotal * 0.21
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
    setMostrarEstados(false)
  }

  const estadoActual = ESTADOS_ORDEN.find(e => e.value === formData.estado) || ESTADOS_ORDEN[0]
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
        {/* Header */}
        <div className="bg-white border-b px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {modoCrear ? 'Nueva Orden' : ordenNumero}
              </h2>
              <p className="text-xs text-gray-500">
                {modoCrear ? 'Crear nueva orden de trabajo' : 'Editar orden'}
              </p>
            </div>
            {!modoCrear && (
              <div className="flex items-center gap-1">
                {guardadoAutomatico ? (
                  <div className="flex items-center gap-1 text-green-600">
                    <Check className="w-3 h-3" />
                    <span className="text-xs">Guardado</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-gray-400">
                    <Clock className="w-3 h-3" />
                    <span className="text-xs">Autoguardando...</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selector de estado */}
        <div className="bg-white border-b px-4 py-3 shrink-0">
          <Label className="text-xs text-gray-500 mb-2 block">Estado de la orden</Label>
          <div className="relative">
            <button
              onClick={() => setMostrarEstados(!mostrarEstados)}
              className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border-2 transition-all ${estadoActual.color} text-white`}>
              <span className="flex items-center gap-2 font-medium">
                <span>{estadoActual.icon}</span>
                {estadoActual.label}
              </span>
              <ChevronDown className={`w-5 h-5 transition-transform ${mostrarEstados ? 'rotate-180' : ''}`} />
            </button>

            {mostrarEstados && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border z-10 overflow-hidden max-h-64 overflow-y-auto">
                {ESTADOS_ORDEN.map(estado => (
                  <button
                    key={estado.value}
                    onClick={() => cambiarEstado(estado.value)}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                      formData.estado === estado.value ? 'bg-gray-100' : ''
                    }`}>
                    <span className={`w-3 h-3 rounded-full ${estado.color}`} />
                    <span className="flex-1 text-left font-medium">{estado.label}</span>
                    {formData.estado === estado.value && (
                      <Check className="w-4 h-4 text-green-600" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

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
            <>
              {/* Cliente */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-semibold">Cliente *</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setMostrarFormCliente(!mostrarFormCliente)}
                    className="gap-1 text-xs"
                  >
                    <UserPlus className="w-3 h-3" />
                    {mostrarFormCliente ? 'Cancelar' : 'Nuevo'}
                  </Button>
                </div>

                {!mostrarFormCliente ? (
                  <select
                    value={formData.cliente_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, cliente_id: e.target.value, vehiculo_id: '' }))}
                    className="w-full px-3 py-3 border rounded-xl focus:ring-2 focus:ring-sky-500 bg-white"
                  >
                    <option value="">Seleccionar cliente...</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nombre} {c.apellidos ? c.apellidos : ''} {c.nif ? `(${c.nif})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
                    <h4 className="font-semibold text-blue-800 text-sm flex items-center gap-2">
                      <UserPlus className="w-4 h-4" />
                      Nuevo Cliente
                    </h4>

                    {/* Nombre - obligatorio */}
                    <div>
                      <Label className="text-xs text-gray-600 mb-1 block">Nombre *</Label>
                      <Input
                        value={nuevoCliente.nombre}
                        onChange={(e) => setNuevoCliente(prev => ({ ...prev, nombre: e.target.value }))}
                        placeholder="Nombre"
                        className="bg-white"
                      />
                    </div>

                    {/* Apellidos */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-gray-600 mb-1 block">Primer Apellido</Label>
                        <Input
                          value={nuevoCliente.primer_apellido}
                          onChange={(e) => setNuevoCliente(prev => ({ ...prev, primer_apellido: e.target.value }))}
                          placeholder="Primer apellido"
                          className="bg-white"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600 mb-1 block">Segundo Apellido</Label>
                        <Input
                          value={nuevoCliente.segundo_apellido}
                          onChange={(e) => setNuevoCliente(prev => ({ ...prev, segundo_apellido: e.target.value }))}
                          placeholder="Segundo apellido"
                          className="bg-white"
                        />
                      </div>
                    </div>

                    {/* NIF y Teléfono */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-gray-600 mb-1 block">NIF/CIF</Label>
                        <Input
                          value={nuevoCliente.nif}
                          onChange={(e) => setNuevoCliente(prev => ({ ...prev, nif: e.target.value.toUpperCase() }))}
                          placeholder="12345678A"
                          className="bg-white font-mono"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600 mb-1 block">Teléfono</Label>
                        <Input
                          value={nuevoCliente.telefono}
                          onChange={(e) => setNuevoCliente(prev => ({ ...prev, telefono: e.target.value }))}
                          placeholder="666 123 456"
                          className="bg-white"
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <Label className="text-xs text-gray-600 mb-1 block">Email</Label>
                      <Input
                        type="email"
                        value={nuevoCliente.email}
                        onChange={(e) => setNuevoCliente(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="cliente@email.com"
                        className="bg-white"
                      />
                    </div>

                    {/* Botón crear */}
                    <Button
                      type="button"
                      onClick={crearCliente}
                      disabled={creandoCliente || !nuevoCliente.nombre.trim()}
                      className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
                    >
                      {creandoCliente ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <UserPlus className="w-4 h-4" />
                      )}
                      {creandoCliente ? 'Creando...' : 'Crear Cliente'}
                    </Button>
                  </div>
                )}
              </Card>

              {/* Vehículo */}
              {formData.cliente_id && (
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-semibold">Vehículo</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setMostrarFormVehiculo(!mostrarFormVehiculo)}
                      className="gap-1 text-xs"
                    >
                      <Car className="w-3 h-3" />
                      {mostrarFormVehiculo ? 'Cancelar' : 'Nuevo'}
                    </Button>
                  </div>

                  {!mostrarFormVehiculo ? (
                    <>
                      {vehiculos.length > 0 ? (
                        <select
                          value={formData.vehiculo_id}
                          onChange={(e) => setFormData(prev => ({ ...prev, vehiculo_id: e.target.value }))}
                          className="w-full px-3 py-3 border rounded-xl focus:ring-2 focus:ring-sky-500 bg-white"
                        >
                          <option value="">Seleccionar vehículo...</option>
                          {vehiculos.map(v => (
                            <option key={v.id} value={v.id}>
                              {v.matricula} - {v.marca} {v.modelo}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-center py-4 bg-amber-50 rounded-xl border border-amber-200">
                          <Car className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                          <p className="text-sm text-amber-700 font-medium">
                            Este cliente no tiene vehículos
                          </p>
                          <p className="text-xs text-amber-600 mt-1">
                            Pulsa "Nuevo" para añadir uno
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-3 p-3 bg-green-50 rounded-xl border border-green-200">
                      <h4 className="font-semibold text-green-800 text-sm flex items-center gap-2">
                        <Car className="w-4 h-4" />
                        Nuevo Vehículo
                      </h4>

                      {/* Matrícula - obligatorio */}
                      <div>
                        <Label className="text-xs text-gray-600 mb-1 block">Matrícula *</Label>
                        <div className="flex gap-2">
                          <Input
                            value={nuevoVehiculo.matricula}
                            onChange={(e) => setNuevoVehiculo(prev => ({ ...prev, matricula: e.target.value.toUpperCase() }))}
                            placeholder="1234ABC"
                            className="font-mono uppercase flex-1"
                          />
                          <InputScanner
                            tipo="matricula"
                            onResult={(val) => setNuevoVehiculo(prev => ({ ...prev, matricula: val }))}
                          />
                        </div>
                      </div>

                      {/* Marca y Modelo */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-gray-600 mb-1 block">Marca</Label>
                          <Input
                            value={nuevoVehiculo.marca}
                            onChange={(e) => setNuevoVehiculo(prev => ({ ...prev, marca: e.target.value }))}
                            placeholder="Ford, BMW..."
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600 mb-1 block">Modelo</Label>
                          <Input
                            value={nuevoVehiculo.modelo}
                            onChange={(e) => setNuevoVehiculo(prev => ({ ...prev, modelo: e.target.value }))}
                            placeholder="Focus, 320i..."
                          />
                        </div>
                      </div>

                      {/* Año y Color */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-gray-600 mb-1 block">Año</Label>
                          <DecimalInput
                            value={nuevoVehiculo.año}
                            onChange={(value) => {
                              if (validarAnioVehiculo(value)) {
                                setNuevoVehiculo(prev => ({ ...prev, año: value }))
                              }
                            }}
                            placeholder="2020"
                            min={1900}
                            max={new Date().getFullYear() + 1}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600 mb-1 block">Color</Label>
                          <Input
                            value={nuevoVehiculo.color}
                            onChange={(e) => setNuevoVehiculo(prev => ({ ...prev, color: e.target.value }))}
                            placeholder="Blanco, Negro..."
                          />
                        </div>
                      </div>

                      {/* KM y Combustible */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-gray-600 mb-1 block">Kilómetros</Label>
                          <div className="flex gap-2">
                            <DecimalInput
                              value={nuevoVehiculo.kilometros}
                              onChange={(value) => setNuevoVehiculo(prev => ({ ...prev, kilometros: value }))}
                              placeholder="125000"
                              className="flex-1"
                              min={0}
                            />
                            <InputScanner
                              tipo="km"
                              onResult={(val) => setNuevoVehiculo(prev => ({ ...prev, kilometros: val }))}
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600 mb-1 block">Combustible</Label>
                          <select
                            value={nuevoVehiculo.tipo_combustible}
                            onChange={(e) => setNuevoVehiculo(prev => ({ ...prev, tipo_combustible: e.target.value }))}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                          >
                            <option value="">Seleccionar...</option>
                            <option value="Gasolina">Gasolina</option>
                            <option value="Diésel">Diésel</option>
                            <option value="Híbrido">Híbrido</option>
                            <option value="Eléctrico">Eléctrico</option>
                            <option value="GLP">GLP</option>
                            <option value="GNC">GNC</option>
                          </select>
                        </div>
                      </div>

                      {/* VIN */}
                      <div>
                        <Label className="text-xs text-gray-600 mb-1 block">Bastidor (VIN)</Label>
                        <div className="flex gap-2">
                          <Input
                            value={nuevoVehiculo.vin}
                            onChange={(e) => setNuevoVehiculo(prev => ({ ...prev, vin: e.target.value.toUpperCase() }))}
                            placeholder="WVWZZZ3CZWE123456"
                            className="font-mono uppercase text-xs flex-1"
                          />
                          <InputScanner
                            tipo="vin"
                            onResult={(val) => setNuevoVehiculo(prev => ({ ...prev, vin: val }))}
                          />
                        </div>
                      </div>

                      <Button
                        onClick={crearVehiculo}
                        disabled={creandoVehiculo || !nuevoVehiculo.matricula.trim()}
                        className="w-full gap-2 bg-green-600 hover:bg-green-700"
                      >
                        {creandoVehiculo ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                        {creandoVehiculo ? 'Creando...' : 'Crear Vehículo'}
                      </Button>
                    </div>
                  )}

                  {vehiculoSeleccionado && !editandoVehiculo && (
                    <div className="mt-3 p-4 bg-gradient-to-br from-sky-50 to-cyan-50 rounded-xl border border-sky-200">
                      {/* Cabecera del vehículo */}
                      <div className="flex items-center gap-3 mb-3 pb-3 border-b border-sky-200">
                        <div className="w-10 h-10 bg-sky-600 rounded-lg flex items-center justify-center text-white text-lg">
                          🚗
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-gray-900">
                            {vehiculoSeleccionado.marca} {vehiculoSeleccionado.modelo}
                          </p>
                          <p className="text-lg font-mono font-bold text-sky-700">
                            {vehiculoSeleccionado.matricula}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={iniciarEdicionVehiculo}
                          className="gap-1 text-xs"
                        >
                          <Edit2 className="w-3 h-3" />
                          Editar
                        </Button>
                      </div>

                      {/* Detalles del vehículo */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-white p-2 rounded-lg border border-sky-100">
                          <span className="text-xs text-gray-500 block">Kilómetros</span>
                          <span className="font-bold text-gray-900">
                            {vehiculoSeleccionado.kilometros?.toLocaleString() || '—'} km
                          </span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-sky-100">
                          <span className="text-xs text-gray-500 block">Color</span>
                          <span className="font-bold text-gray-900">
                            {vehiculoSeleccionado.color || '—'}
                          </span>
                        </div>
                        {vehiculoSeleccionado.tipo_combustible && (
                          <div className="bg-white p-2 rounded-lg border border-sky-100">
                            <span className="text-xs text-gray-500 block">Combustible</span>
                            <span className="font-bold text-gray-900">
                              {vehiculoSeleccionado.tipo_combustible}
                            </span>
                          </div>
                        )}
                        {vehiculoSeleccionado.año && (
                          <div className="bg-white p-2 rounded-lg border border-sky-100">
                            <span className="text-xs text-gray-500 block">Año</span>
                            <span className="font-bold text-gray-900">
                              {vehiculoSeleccionado.año}
                            </span>
                          </div>
                        )}
                        {(vehiculoSeleccionado.vin || vehiculoSeleccionado.bastidor_vin) && (
                          <div className="col-span-2 bg-white p-2 rounded-lg border border-sky-100">
                            <span className="text-xs text-gray-500 block">Bastidor (VIN)</span>
                            <span className="font-mono text-xs font-medium text-gray-700">
                              {vehiculoSeleccionado.vin || vehiculoSeleccionado.bastidor_vin}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Indicador de OCR */}
                      <div className="mt-3 pt-3 border-t border-sky-200">
                        <p className="text-xs text-sky-600 flex items-center gap-1">
                          <span>📸</span>
                          Sube foto del cuadro para actualizar KM automáticamente
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Formulario de edición de vehículo */}
                  {vehiculoSeleccionado && editandoVehiculo && (
                    <div className="mt-3 space-y-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
                      <h4 className="font-semibold text-amber-800 text-sm flex items-center gap-2">
                        <Edit2 className="w-4 h-4" />
                        Editar Vehículo
                      </h4>

                      {/* Matrícula */}
                      <div>
                        <Label className="text-xs text-gray-600 mb-1 block">Matrícula *</Label>
                        <div className="flex gap-2">
                          <Input
                            value={vehiculoEditado.matricula}
                            onChange={(e) => setVehiculoEditado(prev => ({ ...prev, matricula: e.target.value.toUpperCase() }))}
                            placeholder="1234ABC"
                            className="font-mono uppercase flex-1"
                          />
                          <InputScanner
                            tipo="matricula"
                            onResult={(val) => setVehiculoEditado(prev => ({ ...prev, matricula: val }))}
                          />
                        </div>
                      </div>

                      {/* Marca y Modelo */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-gray-600 mb-1 block">Marca</Label>
                          <Input
                            value={vehiculoEditado.marca}
                            onChange={(e) => setVehiculoEditado(prev => ({ ...prev, marca: e.target.value }))}
                            placeholder="Ford, BMW..."
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600 mb-1 block">Modelo</Label>
                          <Input
                            value={vehiculoEditado.modelo}
                            onChange={(e) => setVehiculoEditado(prev => ({ ...prev, modelo: e.target.value }))}
                            placeholder="Focus, 320i..."
                          />
                        </div>
                      </div>

                      {/* Año y Color */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-gray-600 mb-1 block">Año</Label>
                          <DecimalInput
                            value={vehiculoEditado.año}
                            onChange={(value) => {
                              if (validarAnioVehiculo(value)) {
                                setVehiculoEditado(prev => ({ ...prev, año: value }))
                              }
                            }}
                            placeholder="2020"
                            min={1900}
                            max={new Date().getFullYear() + 1}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600 mb-1 block">Color</Label>
                          <Input
                            value={vehiculoEditado.color}
                            onChange={(e) => setVehiculoEditado(prev => ({ ...prev, color: e.target.value }))}
                            placeholder="Blanco, Negro..."
                          />
                        </div>
                      </div>

                      {/* KM y Combustible */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-gray-600 mb-1 block">Kilómetros</Label>
                          <div className="flex gap-1">
                            <DecimalInput
                              value={vehiculoEditado.kilometros}
                              onChange={(value) => setVehiculoEditado(prev => ({ ...prev, kilometros: value }))}
                              placeholder="125000"
                              className="flex-1"
                              min={0}
                            />
                            <InputScanner
                              tipo="km"
                              onResult={(val) => {
                                const num = parseInt(val.replace(/\D/g, ''))
                                setVehiculoEditado(prev => ({ ...prev, kilometros: num > 0 ? num : '' }))
                              }}
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600 mb-1 block">Combustible</Label>
                          <select
                            value={vehiculoEditado.tipo_combustible}
                            onChange={(e) => setVehiculoEditado(prev => ({ ...prev, tipo_combustible: e.target.value }))}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                          >
                            <option value="">Seleccionar...</option>
                            <option value="Gasolina">Gasolina</option>
                            <option value="Diésel">Diésel</option>
                            <option value="Híbrido">Híbrido</option>
                            <option value="Eléctrico">Eléctrico</option>
                            <option value="GLP">GLP</option>
                            <option value="GNC">GNC</option>
                          </select>
                        </div>
                      </div>

                      {/* VIN */}
                      <div>
                        <Label className="text-xs text-gray-600 mb-1 block">Bastidor (VIN)</Label>
                        <div className="flex gap-2">
                          <Input
                            value={vehiculoEditado.vin}
                            onChange={(e) => setVehiculoEditado(prev => ({ ...prev, vin: e.target.value.toUpperCase() }))}
                            placeholder="WVWZZZ3CZWE123456"
                            className="font-mono uppercase text-xs flex-1"
                          />
                          <InputScanner
                            tipo="vin"
                            onResult={(val) => setVehiculoEditado(prev => ({ ...prev, vin: val }))}
                          />
                        </div>
                      </div>

                      {/* Botones */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setEditandoVehiculo(false)}
                          className="flex-1"
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          onClick={guardarEdicionVehiculo}
                          disabled={guardandoVehiculo || !vehiculoEditado.matricula.trim()}
                          className="flex-1 gap-2 bg-amber-600 hover:bg-amber-700"
                        >
                          {guardandoVehiculo ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          {guardandoVehiculo ? 'Guardando...' : 'Guardar'}
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              )}

              {/* Descripción del problema */}
              <Card className="p-4">
                <Label className="text-sm font-semibold mb-2 block">
                  Descripción del problema / Motivo de entrada
                </Label>
                <Textarea
                  value={formData.descripcion_problema || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, descripcion_problema: e.target.value }))}
                  placeholder="Describe el problema que presenta el vehículo..."
                  rows={3}
                  className="resize-none"
                />
              </Card>

              {/* Datos de recepción */}
              <Card className="p-4">
                <Label className="text-sm font-semibold mb-3 block">⛽ Recepción del vehículo</Label>

                {/* Nivel de combustible */}
                <div className="mb-4">
                  <Label className="text-xs text-gray-500 mb-2 block">Nivel de combustible</Label>
                  <div className="flex gap-2">
                    {['E', '1/4', '1/2', '3/4', 'F'].map(nivel => (
                      <button
                        key={nivel}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, nivel_combustible: nivel }))}
                        className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg border-2 transition-all ${
                          formData.nivel_combustible === nivel
                            ? 'bg-amber-500 border-amber-500 text-white'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-amber-300'
                        }`}> 
                        {nivel}
                      </button>
                    ))}
                  </div>
                </div>

                {/* KM de entrada */}
                <div className="mb-4">
                  <Label className="text-xs text-gray-500 mb-1 block">Kilómetros de entrada</Label>
                  <DecimalInput
                    value={formData.kilometros_entrada}
                    onChange={(value) => setFormData(prev => ({
                      ...prev,
                      kilometros_entrada: value
                    }))}
                    placeholder="Ej: 145000"
                    className="font-mono"
                    min={0}
                    allowEmpty={true}
                  />
                </div>

                {/* Coste diario de estancia */}
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Coste diario de estancia (€)</Label>
                  <DecimalInput
                    value={formData.coste_diario_estancia ?? 0}
                    onChange={(value) => setFormData(prev => ({
                      ...prev,
                      coste_diario_estancia: value || undefined
                    }))}
                    min={0}
                    step={0.01}
                    placeholder="Ej: 15.00"
                    allowEmpty
                  />
                </div>
              </Card>

              {/* Autorizaciones legales */}
              <Card className="p-4">
                <Label className="text-sm font-semibold mb-3 block">✍️ Autorizaciones del cliente</Label>

                {/* Cliente autoriza reparación */}
                <label className="flex items-center gap-3 cursor-pointer mb-3 p-2 rounded-lg hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={formData.presupuesto_aprobado_por_cliente || false}
                    onChange={(e) => setFormData(prev => ({ ...prev, presupuesto_aprobado_por_cliente: e.target.checked }))}
                    className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Cliente autoriza reparación</span>
                    <p className="text-xs text-gray-500">El cliente ha dado su aprobación para realizar los trabajos</p>
                  </div>
                </label>

                {/* Renuncia a presupuesto */}
                <label className="flex items-center gap-3 cursor-pointer mb-3 p-2 rounded-lg hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={formData.renuncia_presupuesto || false}
                    onChange={(e) => setFormData(prev => ({ ...prev, renuncia_presupuesto: e.target.checked }))}
                    className="w-5 h-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Renuncia a presupuesto previo</span>
                    <p className="text-xs text-gray-500">El cliente no desea recibir presupuesto antes de la reparación</p>
                  </div>
                </label>

                {/* Recoger piezas */}
                <label className="flex items-center gap-3 cursor-pointer mb-4 p-2 rounded-lg hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={formData.recoger_piezas || false}
                    onChange={(e) => setFormData(prev => ({ ...prev, recoger_piezas: e.target.checked }))}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Desea recoger piezas sustituidas</span>
                    <p className="text-xs text-gray-500">El cliente quiere llevarse las piezas que se reemplacen</p>
                  </div>
                </label>

                {/* Acción en caso de imprevistos */}
                <div className="border-t pt-3">
                  <Label className="text-xs text-gray-500 mb-2 block">En caso de imprevistos:</Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, accion_imprevisto: 'avisar' }))}
                      className={`flex-1 py-2 px-4 text-sm font-medium rounded-lg border-2 transition-all ${
                        formData.accion_imprevisto === 'avisar'
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300'
                      }`}>
                      📞 Avisar antes
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, accion_imprevisto: 'actuar' }))}
                      className={`flex-1 py-2 px-4 text-sm font-medium rounded-lg border-2 transition-all ${
                        formData.accion_imprevisto === 'actuar'
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-green-300'
                      }`}>
                      🔧 Actuar directamente
                    </button>
                  </div>
                </div>
              </Card>

              {/* Daños en carrocería */}
              <Card className="p-4">
                <Label className="text-sm font-semibold mb-2 block">🚗 Daños preexistentes en carrocería</Label>
                <Textarea
                  value={formData.danos_carroceria || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, danos_carroceria: e.target.value }))}
                  placeholder="Describe los daños preexistentes en la carrocería del vehículo (golpe, rasguño, etc.)..."
                  rows={3}
                  className="resize-none"
                />
              </Card>

              {/* Notas */}
              <Card className="p-4">
                <Label className="text-sm font-semibold mb-2 block">Notas internas</Label>
                <Textarea
                  value={formData.notas || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))}
                  placeholder="Notas para el equipo del taller..."
                  rows={2}
                  className="resize-none"
                />

                {/* Upload de documentación adicional */}
                <div className="mt-3 pt-3 border-t">
                  <Label className="text-xs font-semibold mb-2 block text-gray-600">
                    📄 Documentación adicional (Hoja de orden, notas escritas, etc.)
                  </Label>
                  {!modoCrear && ordenSeleccionada ? (
                    <div className="grid grid-cols-2 gap-2">
                      <FotoUploader
                        tipo="diagnostico_1"
                        ordenId={ordenSeleccionada}
                        fotoUrl={getFotoByKey(formData.fotos_diagnostico || '', 'diagnostico_1')}
                        onFotoSubida={(url) => {
                          const fotosActuales = formData.fotos_diagnostico || ''
                          const fotosObj = fotosActuales ? JSON.parse(fotosActuales) : {}
                          fotosObj['diagnostico_1'] = url
                          setFormData(prev => ({ ...prev, fotos_diagnostico: JSON.stringify(fotosObj) }))
                        }}
                      />
                      <FotoUploader
                        tipo="diagnostico_2"
                        ordenId={ordenSeleccionada}
                        fotoUrl={getFotoByKey(formData.fotos_diagnostico || '', 'diagnostico_2')}
                        onFotoSubida={(url) => {
                          const fotosActuales = formData.fotos_diagnostico || ''
                          const fotosObj = fotosActuales ? JSON.parse(fotosActuales) : {}
                          fotosObj['diagnostico_2'] = url
                          setFormData(prev => ({ ...prev, fotos_diagnostico: JSON.stringify(fotosObj) }))
                        }}
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">
                      Guarda la orden primero para poder subir documentos
                    </p>
                  )}
                </div>
              </Card>
            </>
          )}

          {tab === 'fotos' && (
            <>
              {modoCrear ? (
                <Card className="p-4 bg-amber-50 border-amber-200">
                  <p className="text-sm text-amber-800">
                    💡 Guarda la orden primero para poder subir fotos
                  </p>
                </Card>
              ) : (
                <>
                  {/* Fotos de entrada */}
                  <Card className="p-4">
                    <Label className="text-sm font-semibold mb-3 block">📸 Fotos de Entrada</Label>
                    <p className="text-xs text-gray-500 mb-4">
                      Documenta el estado del vehículo al llegar al taller
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <FotoUploader
                        tipo="entrada"
                        ordenId={ordenSeleccionada || ''}
                        fotoUrl={getFotoUrl(formData.fotos_entrada || '', 0)}
                        onFotoSubida={(url) => {
                          setFormData(prev => ({
                            ...prev,
                            fotos_entrada: setFotoUrl(prev.fotos_entrada || '', 0, url)
                          }))
                        }}
                        onOCRData={(data) => {
                          // Verificar matrícula si hay vehículo seleccionado
                          if (data.matricula && vehiculoSeleccionado) {
                            const matriculaLimpia = data.matricula.replace(/[\s-]/g, '').toUpperCase()
                            const matriculaVehiculo = vehiculoSeleccionado.matricula.replace(/[\s-]/g, '').toUpperCase()
                            if (matriculaLimpia === matriculaVehiculo) {
                              toast.success(`✅ Matrícula coincide: ${data.matricula}`)
                            } else {
                              toast.warning(`⚠️ Matrícula detectada (${data.matricula}) no coincide con el vehículo (${vehiculoSeleccionado.matricula})`)
                            }
                          } else if (data.matricula) {
                            toast.info(`Matrícula detectada: ${data.matricula}`)
                          }

                          // Actualizar KM del vehículo
                          if (data.km && formData.vehiculo_id) {
                            actualizarKMVehiculo(data.km)
                          } else if (data.km) {
                            toast.info(`KM detectados: ${data.km.toLocaleString()} (selecciona un vehículo para guardar)`)
                          }
                        }}
                      />
                      <FotoUploader
                        tipo="frontal"
                        ordenId={ordenSeleccionada || ''}
                        fotoUrl={getFotoUrl(formData.fotos_entrada || '', 1)}
                        onFotoSubida={(url) => {
                          setFormData(prev => ({
                            ...prev,
                            fotos_entrada: setFotoUrl(prev.fotos_entrada || '', 1, url)
                          }))
                        }}
                      />
                      <FotoUploader
                        tipo="izquierda"
                        ordenId={ordenSeleccionada || ''}
                        fotoUrl={getFotoUrl(formData.fotos_entrada || '', 2)}
                        onFotoSubida={(url) => {
                          setFormData(prev => ({
                            ...prev,
                            fotos_entrada: setFotoUrl(prev.fotos_entrada || '', 2, url)
                          }))
                        }}
                      />
                      <FotoUploader
                        tipo="derecha"
                        ordenId={ordenSeleccionada || ''}
                        fotoUrl={getFotoUrl(formData.fotos_entrada || '', 3)}
                        onFotoSubida={(url) => {
                          setFormData(prev => ({
                            ...prev,
                            fotos_entrada: setFotoUrl(prev.fotos_entrada || '', 3, url)
                          }))
                        }}
                      />
                    </div>
                  </Card>

                  {/* Fotos de salida */}
                  <Card className="p-4">
                    <Label className="text-sm font-semibold mb-3 block">✅ Fotos de Salida</Label>
                    <p className="text-xs text-gray-500 mb-4">
                      Documenta el estado del vehículo al entregar
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <FotoUploader
                        tipo="salida"
                        ordenId={ordenSeleccionada || ''}
                        fotoUrl={getFotoUrl(formData.fotos_salida || '', 0)}
                        onFotoSubida={(url) => {
                          setFormData(prev => ({
                            ...prev,
                            fotos_salida: setFotoUrl(prev.fotos_salida || '', 0, url)
                          }))
                        }}
                      />
                      <FotoUploader
                        tipo="trasera"
                        ordenId={ordenSeleccionada || ''}
                        fotoUrl={getFotoUrl(formData.fotos_salida || '', 1)}
                        onFotoSubida={(url) => {
                          setFormData(prev => ({
                            ...prev,
                            fotos_salida: setFotoUrl(prev.fotos_salida || '', 1, url)
                          }))
                        }}
                      />
                    </div>
                  </Card>
                </>
              )}
            </>
          )}

          {tab === 'trabajo' && (
            <>
              {/* Diagnóstico */}
              <Card className="p-4">
                <Label className="text-sm font-semibold mb-2 block">Diagnóstico técnico</Label>
                <Textarea
                  value={formData.diagnostico || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, diagnostico: e.target.value }))}
                  placeholder="Resultado del diagnóstico del vehículo..."
                  rows={3}
                  className="resize-none"
                />
              </Card>

              {/* Fotos de diagnóstico */}
              <Card className="p-4 bg-amber-50/50 border-amber-200">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">📷</span>
                  <Label className="text-sm font-semibold">Fotos de diagnóstico</Label>
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  Sube fotos del cuadro de instrumentos, testigos de fallo, o cualquier evidencia visual del problema.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {FOTOS_DIAGNOSTICO.map((tipoFoto) => (
                    <FotoUploader
                      key={tipoFoto}
                      tipo={tipoFoto}
                      fotoUrl={getFotoByKey(formData.fotos_diagnostico || '', tipoFoto)}
                      ordenId={ordenSeleccionada || 'nueva'}
                      onFotoSubida={(url) => {
                        setFormData(prev => ({
                          ...prev,
                          fotos_diagnostico: setFotoByKey(prev.fotos_diagnostico || '', tipoFoto, url)
                        }))
                      }}
                      disabled={!ordenSeleccionada && !modoCrear}
                    />
                  ))}
                </div>
              </Card>

              {/* Trabajos realizados */}
              <Card className="p-4">
                <Label className="text-sm font-semibold mb-2 block">Trabajos realizados</Label>
                <Textarea
                  value={formData.trabajos_realizados || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, trabajos_realizados: e.target.value }))}
                  placeholder="Describe los trabajos que se han realizado..."
                  rows={3}
                  className="resize-none"
                />
              </Card>



              {/* Tiempos con selector de fracciones */}
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-5 h-5 text-sky-600" />
                  <Label className="text-sm font-semibold">Tiempo de trabajo</Label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Horas estimadas */}
                  <div>
                    <Label className="text-xs text-gray-500 mb-2 block">Horas estimadas</Label>
                    <select
                      value={formData.tiempo_estimado_horas || 0}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        tiempo_estimado_horas: parseFloat(e.target.value)
                      }))}
                      className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-sky-500 bg-white text-center"
                    >
                      <option value="0">Sin estimar</option>
                      {FRACCIONES_HORA.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Horas reales */}
                  <div>
                    <Label className="text-xs text-gray-500 mb-2 block">Horas reales</Label>
                    <select
                      value={formData.tiempo_real_horas || 0}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        tiempo_real_horas: parseFloat(e.target.value)
                      }))}
                      className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-sky-500 bg-white text-center"
                    >
                      <option value="0">Sin registrar</option>
                      {FRACCIONES_HORA.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Input manual para valores personalizados */}
                <div className="mt-3 pt-3 border-t">
                  <Label className="text-xs text-gray-500 mb-2 block">O introduce un valor personalizado:</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <DecimalInput
                      value={formData.tiempo_estimado_horas}
                      onChange={(value) => {
                        if (validarHorasTrabajo(value, 'tiempo_estimado_horas')) {
                          setFormData(prev => ({
                            ...prev,
                            tiempo_estimado_horas: value
                          }))
                        }
                      }}
                      placeholder="Estimadas"
                      className="text-center"
                      min={0}
                      max={100}
                      step={0.25}
                      allowEmpty={true}
                    />
                    <DecimalInput
                      value={formData.tiempo_real_horas}
                      onChange={(value) => {
                        if (validarHorasTrabajo(value, 'tiempo_real_horas')) {
                          setFormData(prev => ({
                            ...prev,
                            tiempo_real_horas: value
                          }))
                        }
                      }}
                      placeholder="Reales"
                      className="text-center"
                      min={0}
                      max={100}
                      step={0.25}
                      allowEmpty={true}
                    />
                  </div>
                </div>
              </Card>
            </>
          )}

          {tab === 'items' && (
            <>
              {/* Añadir línea */}
              <Card className="p-4 border-2 border-dashed border-sky-200 bg-sky-50/50">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Añadir línea de trabajo
                </h3>

                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-gray-600 mb-1 block">Tipo de elemento</Label>
                    <select
                      value={nuevaLinea.tipo}
                      onChange={(e) => {
                        const nuevoTipo = e.target.value as TipoLinea
                        setNuevaLinea(prev => ({
                          ...prev,
                          tipo: nuevoTipo,
                          // Auto-rellenar precio si es mano de obra
                          precio_unitario: nuevoTipo === 'mano_obra' ? tarifaHora : 0
                        }))
                      }}
                      className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-sky-500 bg-white"
                    >
                      <option value="mano_obra">🔧 Mano de obra</option>
                      <option value="pieza">⚙️ Recambio / Pieza</option>
                      <option value="servicio">🛠️ Servicio externo</option>
                      <option value="suplido">💸 Suplido (pagado por cliente: ITV, multa, etc.)</option>
                      <option value="reembolso">💰 Reembolso (compra por cliente)</option>
                    </select>
                    {nuevaLinea.tipo === 'suplido' && (
                      <p className="text-xs text-amber-600 mt-1">
                        ⚠️ Suplidos: Se suman al total SIN IVA (ej: pago de ITV, multa)
                      </p>
                    )}
                    {nuevaLinea.tipo === 'reembolso' && (
                      <p className="text-xs text-blue-600 mt-1">
                        ℹ️ Reembolsos: Se suman a base imponible CON IVA (ej: pieza comprada)
                      </p>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs text-gray-600 mb-1 block">Descripción del trabajo</Label>
                    <Input
                      value={nuevaLinea.descripcion}
                      onChange={(e) => setNuevaLinea(prev => ({ ...prev, descripcion: e.target.value }))}
                      placeholder="Ej: Cambio de aceite y filtro"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-600 mb-1 block">
                        {nuevaLinea.tipo === 'mano_obra' ? '⏱️ Horas de trabajo' : '📦 Cantidad (uds)'}
                      </Label>
                      {nuevaLinea.tipo === 'mano_obra' ? (
                        <select
                          value={nuevaLinea.cantidad}
                          onChange={(e) => setNuevaLinea(prev => ({
                            ...prev,
                            cantidad: parseFloat(e.target.value)
                          }))}
                          className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-sky-500 bg-white text-center"
                        >
                          {FRACCIONES_HORA.map(f => (
                            <option key={f.value} value={f.value}>{f.label}</option>
                          ))}
                        </select>
                      ) : (
                        <select
                          value={nuevaLinea.cantidad}
                          onChange={(e) => setNuevaLinea(prev => ({
                            ...prev,
                            cantidad: parseFloat(e.target.value)
                          }))}
                          className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-sky-500 bg-white text-center"
                        >
                          {CANTIDADES.map(c => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600 mb-1 block">
                        {nuevaLinea.tipo === 'mano_obra' ? '💶 Precio/hora (€)' : '💶 Precio/unidad (€)'}
                      </Label>
                          <DecimalInput
                            value={nuevaLinea.precio_unitario}
                            onChange={(value) => {
                              if (value != null) {
                                setNuevaLinea(prev => ({
                                  ...prev,
                                  precio_unitario: value
                                }))
                              }
                            }}
                            min={0}
                            step={0.01}
                            placeholder="0.00"
                            className="text-right"
                          />
                    </div>
                  </div>

                  {nuevaLinea.cantidad > 0 && nuevaLinea.precio_unitario > 0 && (
                    <div className="p-2 bg-green-100 rounded-lg text-center">
                      <span className="text-sm text-gray-600">Subtotal: </span>
                      <span className="font-bold text-green-700">
                        €{(nuevaLinea.cantidad * nuevaLinea.precio_unitario).toFixed(2)}
                      </span>
                    </div>
                  )}

                  <Button onClick={agregarLinea} className="w-full gap-2 bg-sky-600 hover:bg-sky-700">
                    <Plus className="w-4 h-4" />
                    Añadir línea
                  </Button>
                </div>
              </Card>

              {/* Lista de elementos unificada */}
              {lineas.length > 0 && (
                <Card className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    📋 Elementos de la orden ({lineas.length})
                  </h3>
                  
                  {/* Tabla unificada */}
                  <div className="border rounded-lg overflow-hidden bg-white">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Concepto</th>
                          <th className="px-2 py-2 text-center font-semibold text-gray-700 w-16">Tipo</th>
                          <th className="px-2 py-2 text-center font-semibold text-gray-700 w-12">Cant</th>
                          <th className="px-2 py-2 text-right font-semibold text-gray-700 w-20">Precio</th>
                          <th className="px-2 py-2 text-center font-semibold text-gray-700 w-20">Estado</th>
                          <th className="px-2 py-2 text-right font-semibold text-gray-700 w-20">Total</th>
                          <th className="px-2 py-2 w-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {lineas.map(linea => (
                          <tr key={linea.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2">
                              <div className="font-medium text-gray-900">{linea.descripcion}</div>
                              {linea.precio_unitario === 0 && (
                                <div className="text-xs text-amber-600">⏳ Precio pendiente</div>
                              )}
                            </td>
                            <td className="px-2 py-2 text-center">
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                linea.tipo === 'mano_obra' ? 'bg-blue-100 text-blue-700' :
                                linea.tipo === 'pieza' ? 'bg-purple-100 text-purple-700' :
                                linea.tipo === 'servicio' ? 'bg-green-100 text-green-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {linea.tipo === 'mano_obra' ? '⏱️ M.O.' :
                                 linea.tipo === 'pieza' ? '📦 Pieza' :
                                 linea.tipo === 'servicio' ? '🔧 Serv.' :
                                 linea.tipo}
                              </span>
                            </td>
                            <td className="px-2 py-2">
                              <DecimalInput
                                value={linea.cantidad}
                                onChange={(value) => actualizarLinea(linea.id, 'cantidad', value)}
                                className="w-12 px-1 py-0.5 text-xs border border-gray-300 rounded text-center"
                                min={0.01}
                                step={linea.tipo === 'mano_obra' ? 0.25 : 1}
                              />
                            </td>
                            <td className="px-2 py-2">
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-500">€</span>
                                <DecimalInput
                                  value={linea.precio_unitario}
                                  onChange={(value) => actualizarLinea(linea.id, 'precio_unitario', value)}
                                  className="w-16 px-1 py-0.5 text-xs border border-gray-300 rounded text-center"
                                  placeholder="0.00"
                                  min={0}
                                  step={0.01}
                                />
                              </div>
                            </td>
                            <td className="px-2 py-2 text-center">
                              {linea.tipo === 'pieza' ? (
                                <select
                                  value={linea.estado || 'presupuestado'}
                                  onChange={(e) => actualizarLinea(linea.id, 'estado', e.target.value)}
                                  className="text-xs px-1 py-0.5 border border-gray-300 rounded"
                                >
                                  <option value="presupuestado">📋 Presup.</option>
                                  <option value="confirmado">✅ Confirm.</option>
                                  <option value="recibido">📦 Recib.</option>
                                </select>
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-2 py-2 text-right font-mono text-sm font-semibold">
                              €{(linea.cantidad * linea.precio_unitario).toFixed(2)}
                            </td>
                            <td className="px-2 py-2">
                              <button
                                onClick={() => eliminarLinea(linea.id)}
                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                                title="Eliminar línea"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Formulario rápido para añadir elementos */}
                  <div className="mt-4 p-3 bg-sky-50 rounded-lg border border-sky-200">
                    <p className="text-xs font-semibold text-sky-800 mb-2">➕ Añadir elemento rápido</p>
                    <div className="grid grid-cols-12 gap-2">
                      <select
                        value={piezaRapida.tipo || 'pieza'}
                        onChange={(e) => setPiezaRapida(prev => ({ ...prev, tipo: e.target.value }))}
                        className="col-span-2 text-xs px-2 py-1 border border-gray-300 rounded"
                      >
                        <option value="pieza">📦 Pieza</option>
                        <option value="mano_obra">⏱️ M.O.</option>
                        <option value="servicio">🔧 Serv.</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Descripción..."
                        value={piezaRapida.descripcion}
                        onChange={(e) => setPiezaRapida(prev => ({ ...prev, descripcion: e.target.value }))}
                        className="col-span-5 text-xs px-2 py-1 border border-gray-300 rounded"
                      />
                      <DecimalInput
                        value={piezaRapida.cantidad}
                        onChange={(value) => setPiezaRapida(prev => ({ ...prev, cantidad: value }))}
                        placeholder="Cant"
                        className="col-span-1 text-xs"
                        min={1}
                        step={piezaRapida.tipo === 'mano_obra' ? 0.25 : 1}
                      />
                      <DecimalInput
                        value={piezaRapida.precio || 0}
                        onChange={(value) => setPiezaRapida(prev => ({ ...prev, precio: value }))}
                        placeholder="Precio"
                        className="col-span-2 text-xs"
                        min={0}
                        step={0.01}
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          const desc = piezaRapida.descripcion?.trim()
                          const qty = piezaRapida.cantidad || 1
                          const precio = piezaRapida.precio || 0

                          if (!desc) {
                            toast.error('Escribe una descripción')
                            return
                          }

                          setLineas(prev => [...prev, {
                            id: `new-${Date.now()}`,
                            tipo: piezaRapida.tipo || 'pieza',
                            descripcion: desc,
                            cantidad: qty,
                            precio_unitario: precio,
                            estado: precio === 0 ? 'presupuestado' : 'confirmado',
                            isNew: true
                          }])

                          setPiezaRapida({ tipo: 'pieza', descripcion: '', cantidad: 1, precio: 0 })
                          toast.success('Elemento añadido')
                        }}
                        className="col-span-2 h-7 text-xs"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              {/* Resumen */}
              <Card className="p-4 bg-gradient-to-br from-slate-800 to-slate-900 text-white">
                <h3 className="font-semibold mb-3">Resumen</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Mano de obra:</span>
                    <span>€{totales.manoObra.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Recambios:</span>
                    <span>€{totales.piezas.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Servicios:</span>
                    <span>€{totales.servicios.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-gray-700 pt-2 flex justify-between">
                    <span className="text-gray-400">Subtotal:</span>
                    <span>€{totales.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">IVA (21%):</span>
                    <span>€{totales.iva.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-gray-600 pt-2 flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-green-400">€{totales.total.toFixed(2)}</span>
                  </div>
                </div>
              </Card>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-white border-t p-4 space-y-2 shrink-0">
          {/* Compartir presupuesto con cliente */}
          {!modoCrear && ordenSeleccionada && (
            <div className="space-y-2">
              {!enlacePresupuesto ? (
                <Button
                  onClick={handleCompartirPresupuesto}
                  disabled={compartiendo}
                  variant="outline"
                  className="w-full gap-2 py-3 border-purple-300 text-purple-700 hover:bg-purple-50"
                >
                  {compartiendo ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Share2 className="w-4 h-4" />
                  )}
                  {compartiendo ? 'Generando enlace...' : 'Enviar Presupuesto al Cliente'}
                </Button>
              ) : (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 space-y-2">
                  <p className="text-xs text-purple-700 font-medium">Enlace del presupuesto:</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={enlacePresupuesto}
                      readOnly
                      className="flex-1 text-xs bg-white border rounded-lg px-2 py-1.5 font-mono truncate"
                    />
                    <Button size="sm" variant="outline" onClick={copiarEnlace} className="gap-1">
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={enviarWhatsApp}
                      className="flex-1 gap-1 bg-green-600 hover:bg-green-700"
                    >
                      <Share2 className="w-3 h-3" />
                      WhatsApp
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(enlacePresupuesto, '_blank')}
                      className="flex-1 gap-1"
                    >
                      <Link className="w-3 h-3" />
                      Abrir
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Botón para imprimir orden completa */}
          {!modoCrear && ordenSeleccionada && (
            <Button
              onClick={() => setMostrarPDF(true)}
              variant="outline"
              className="w-full gap-2 py-3"
            >
              <Printer className="w-4 h-4" />
              Ver / Imprimir Orden Completa
            </Button>
          )}

          {/* Añadir a Google Calendar */}
          {!modoCrear && ordenSeleccionada && (
            <div className="flex justify-center">
              <GoogleCalendarButton
                ordenId={ordenSeleccionada}
                titulo={`Orden ${ordenNumero}`}
                descripcion={formData.descripcion_problema || formData.trabajos_realizados}
                clienteNombre={clientes.find(c => c.id === formData.cliente_id)?.nombre}
                vehiculoInfo={vehiculoSeleccionado ? `${vehiculoSeleccionado.marca} ${vehiculoSeleccionado.modelo} - ${vehiculoSeleccionado.matricula}` : undefined}
              />
            </div>
          )}

          {!modoCrear && ESTADOS_FACTURABLES.includes(formData.estado as any) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  disabled={generandoFactura || guardando}
                  className="w-full gap-2 bg-green-600 hover:bg-green-700 py-3"
                >
                  {generandoFactura ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  {generandoFactura ? 'Generando...' : 'Generar Factura'}
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48">
                <DropdownMenuItem onClick={crearBorradorFactura} className="gap-2">
                  📝 Crear Borrador Editable
                  <span className="text-xs text-gray-500 ml-auto">Modificar antes de emitir</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={emitirFacturaDirecta} className="gap-2">
                  ⚡ Emitir Factura Directa
                  <span className="text-xs text-gray-500 ml-auto">Sin opción de edición</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 py-3"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleGuardar}
              disabled={guardando || !formData.cliente_id}
              className="flex-1 gap-2 py-3 bg-sky-600 hover:bg-sky-700"
            >
              {guardando ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {guardando ? 'Guardando...' : (modoCrear ? 'Crear Orden' : 'Guardar Cambios')}
            </Button>
          </div>
        </div>

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
