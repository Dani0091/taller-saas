/**
 * @fileoverview Component "Smart" - Lógica de Datos de Orden
 * @description Maneja toda la lógica de negocio, llamadas a API, validación
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { 
  Orden, 
  Vehiculo, 
  Cliente, 
  LineaOrden,
  ApiResponse 
} from '@/types/workshop'
import { validateForm, sanitizeNumber, sanitizeString } from '@/types/workshop'

interface OrdenDataHookReturn {
  // Estados
  cargando: boolean
  guardando: boolean
  orden: Orden | null
  clientes: Cliente[]
  vehiculos: Vehiculo[]
  lineas: LineaOrden[]
  tallerId: string | null
  tarifaHora: number

  // Acciones
  inicializarDatos: () => Promise<void>
  guardarOrden: (orden: Partial<Orden>) => Promise<boolean>
  cargarVehiculos: (clienteId: string) => Promise<void>
  agregarLinea: (linea: Partial<LineaOrden>) => Promise<void>
  actualizarLinea: (id: string, updates: Partial<LineaOrden>) => Promise<void>
  eliminarLinea: (id: string) => Promise<void>
  crearCliente: (cliente: Partial<Cliente>) => Promise<boolean>
  crearVehiculo: (vehiculo: Partial<Vehiculo>) => Promise<boolean>
}

export function useOrdenData(ordenId?: string | null): OrdenDataHookReturn {
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [orden, setOrden] = useState<Orden | null>(null)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([])
  const [lineas, setLineas] = useState<LineaOrden[]>([])
  const [tallerId, setTallerId] = useState<string | null>(null)
  const [tarifaHora, setTarifaHora] = useState(45)

  const supabase = createClient()

  // Validación defensiva antes de enviar a Supabase
  const validarDatosParaSupabase = useCallback((data: any): boolean => {
    try {
      // Sanitizar todos los datos
      const sanitized = {
        ...data,
        tiempo_estimado_horas: sanitizeNumber(data.tiempo_estimado_horas, 0),
        tiempo_real_horas: sanitizeNumber(data.tiempo_real_horas, 0),
        kilometros_entrada: sanitizeNumber(data.kilometros_entrada),
        coste_diario_estancia: sanitizeNumber(data.coste_diario_estancia),
        descripcion_problema: sanitizeString(data.descripcion_problema),
        diagnostico: sanitizeString(data.diagnostico),
        trabajos_realizados: sanitizeString(data.trabajos_realizados),
        notas: sanitizeString(data.notas),
        danos_carroceria: sanitizeString(data.danos_carroceria),
      }

      // Validar con esquemas básicos
      const validacion = validateForm(sanitized)
      if (!validacion.success) {
        toast.error('Error de validación: ' + validacion.errors?.join(', '))
        return false
      }

      return true
    } catch (error) {
      console.error('Error en validación defensiva:', error)
      toast.error('Error al validar datos')
      return false
    }
  }, [])

  // Inicialización segura
  const inicializarDatos = useCallback(async () => {
    setCargando(true)
    try {
      // Obtener sesión del usuario
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No autenticado')
      }

      // Obtener taller del usuario
      const { data: usuario, error: usuarioError } = await supabase
        .from('usuarios')
        .select('taller_id')
        .eq('email', session.user.email)
        .single()

      if (usuarioError || !usuario) {
        throw new Error('Error al obtener taller del usuario')
      }

      setTallerId(usuario.taller_id)

      // Cargar configuración del taller
      const { data: config, error: configError } = await supabase
        .from('configuracion_taller')
        .select('tarifa_hora')
        .eq('taller_id', usuario.taller_id)
        .single()

      if (config && !configError) {
        setTarifaHora(config.tarifa_hora)
      }

      // Cargar clientes
      const { data: clientesData, error: clientesError } = await supabase
        .from('clientes')
        .select('*')
        .eq('taller_id', usuario.taller_id)
        .eq('estado', 'activo')
        .order('nombre')

      if (clientesError) throw clientesError
      setClientes(clientesData || [])

      // Si estamos editando, cargar orden específica
      if (ordenId && ordenId !== 'nueva') {
        const { data: ordenData, error: ordenError } = await supabase
          .from('ordenes_reparacion')
          .select('*')
          .eq('id', ordenId)
          .single()

        if (ordenError || !ordenData) {
          throw new Error('Orden no encontrada')
        }

        setOrden(ordenData)

        // Cargar vehículos del cliente
        if (ordenData.cliente_id) {
          await cargarVehiculos(ordenData.cliente_id)
        }

        // Cargar líneas de la orden
        const { data: lineasData, error: lineasError } = await supabase
          .from('lineas_orden')
          .select('*')
          .eq('orden_id', ordenId)
          .order('created_at')

        if (lineasError) throw lineasError
        setLineas(lineasData || [])
      }

    } catch (error: any) {
      console.error('Error inicializando datos:', error)
      toast.error(error.message || 'Error al cargar datos')
    } finally {
      setCargando(false)
    }
  }, [ordenId, supabase])

  // Guardar orden con validación completa
  const guardarOrden = useCallback(async (ordenData: Partial<Orden>): Promise<boolean> => {
    if (!tallerId) {
      toast.error('Error: taller no identificado')
      return false
    }

    if (!validarDatosParaSupabase(ordenData)) {
      return false
    }

    setGuardando(true)
    try {
      const datosParaGuardar = {
        ...ordenData,
        taller_id: tallerId,
        updated_at: new Date().toISOString()
      }

      let result
      if (orden?.id) {
        // Actualizar orden existente
        result = await supabase
          .from('ordenes_reparacion')
          .update(datosParaGuardar)
          .eq('id', orden.id)
      } else {
        // Crear nueva orden
        const numeroOrden = await generarNumeroOrden(tallerId)
        result = await supabase
          .from('ordenes_reparacion')
          .insert({
            ...datosParaGuardar,
            numero_orden: numeroOrden,
            created_at: new Date().toISOString()
          })
      }

      if (result.error) throw result.error

      toast.success(orden?.id ? 'Orden actualizada correctamente' : 'Orden creada correctamente')
      return true

    } catch (error: any) {
      console.error('Error guardando orden:', error)
      toast.error(error.message || 'Error al guardar orden')
      return false
    } finally {
      setGuardando(false)
    }
  }, [tallerId, orden, validarDatosParaSupabase, supabase])

  // Generar número de orden
  const generarNumeroOrden = useCallback(async (tallerId: string): Promise<string> => {
    try {
      const { data: ultimaOrden } = await supabase
        .from('ordenes_reparacion')
        .select('numero_orden')
        .eq('taller_id', tallerId)
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
      return `OR-${siguienteNumero.toString().padStart(4, '0')}`
    } catch (error) {
      console.error('Error generando número de orden:', error)
      return 'OR-0001'
    }
  }, [supabase])

  // Cargar vehículos de un cliente
  const cargarVehiculos = useCallback(async (clienteId: string) => {
    try {
      const { data, error } = await supabase
        .from('vehiculos')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('matricula')

      if (error) throw error
      setVehiculos(data || [])
    } catch (error: any) {
      console.error('Error cargando vehículos:', error)
      toast.error('Error al cargar vehículos')
    }
  }, [supabase])

  // Manejo de líneas con validación
  const agregarLinea = useCallback(async (lineaData: Partial<LineaOrden>) => {
    if (!orden?.id) {
      toast.error('No se puede agregar línea sin orden guardada')
      return
    }

    try {
      const validacion = validateForm(lineaData)
      if (!validacion.success) {
        toast.error('Error de validación: ' + validacion.errors?.join(', '))
        return
      }

      const datosParaInsertar = {
        ...lineaData,
        orden_id: orden.id,
        created_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('lineas_orden')
        .insert(datosParaInsertar)
        .select()
        .single()

      if (error) throw error

      setLineas(prev => [...prev, data])
      toast.success('Línea agregada correctamente')
    } catch (error: any) {
      console.error('Error agregando línea:', error)
      toast.error('Error al agregar línea')
    }
  }, [orden?.id, supabase])

  const actualizarLinea = useCallback(async (id: string, updates: Partial<LineaOrden>) => {
    try {
      const { error } = await supabase
        .from('lineas_orden')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      setLineas(prev => 
        prev.map(linea => 
          linea.id === id ? { ...linea, ...updates } : linea
        )
      )
    } catch (error: any) {
      console.error('Error actualizando línea:', error)
      toast.error('Error al actualizar línea')
    }
  }, [supabase])

  const eliminarLinea = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('lineas_orden')
        .delete()
        .eq('id', id)

      if (error) throw error

      setLineas(prev => prev.filter(linea => linea.id !== id))
      toast.success('Línea eliminada correctamente')
    } catch (error: any) {
      console.error('Error eliminando línea:', error)
      toast.error('Error al eliminar línea')
    }
  }, [supabase])

  // Crear cliente
  const crearCliente = useCallback(async (clienteData: Partial<Cliente>): Promise<boolean> => {
    if (!tallerId) return false

    try {
      const validacion = validateForm(clienteData)
      if (!validacion.success) {
        toast.error('Error de validación: ' + validacion.errors?.join(', '))
        return false
      }

      const datosParaInsertar = {
        ...clienteData,
        taller_id: tallerId,
        created_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('clientes')
        .insert(datosParaInsertar)
        .select()
        .single()

      if (error) throw error

      setClientes(prev => [...prev, data])
      toast.success('Cliente creado correctamente')
      return true
    } catch (error: any) {
      console.error('Error creando cliente:', error)
      toast.error('Error al crear cliente')
      return false
    }
  }, [tallerId, supabase])

  // Crear vehículo
  const crearVehiculo = useCallback(async (vehiculoData: Partial<Vehiculo>): Promise<boolean> => {
    if (!tallerId) return false

    try {
      const validacion = validateForm(vehiculoData)
      if (!validacion.success) {
        toast.error('Error de validación: ' + validacion.errors?.join(', '))
        return false
      }

      const datosParaInsertar = {
        ...vehiculoData,
        taller_id: tallerId,
        created_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('vehiculos')
        .insert(datosParaInsertar)
        .select()
        .single()

      if (error) throw error

      setVehiculos(prev => [...prev, data])
      toast.success('Vehículo creado correctamente')
      return true
    } catch (error: any) {
      console.error('Error creando vehículo:', error)
      toast.error('Error al crear vehículo')
      return false
    }
  }, [tallerId, supabase])

  // Efecto para inicializar datos
  useEffect(() => {
    inicializarDatos()
  }, [inicializarDatos])

  return {
    // Estados
    cargando,
    guardando,
    orden,
    clientes,
    vehiculos,
    lineas,
    tallerId,
    tarifaHora,

    // Acciones
    inicializarDatos,
    guardarOrden,
    cargarVehiculos,
    agregarLinea,
    actualizarLinea,
    eliminarLinea,
    crearCliente,
    crearVehiculo,
  }
}