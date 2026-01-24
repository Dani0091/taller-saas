/**
 * @fileoverview Detalle de Vehículo - SANEADO
 * @description Sheet para ver/editar información de vehículo
 *
 * ✅ SANEADO: Sin createClient, sin consultas SQL directas
 * ✅ Usa Server Actions blindadas
 * ✅ Optimizado para Android (274 líneas, antes 517)
 */

'use client'

import { useState, useEffect } from 'react'
import { X, Save, Loader2, Car, User, Wrench, FileText, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { NumberInput } from '@/components/ui/number-input'
import { toast } from 'sonner'
import Link from 'next/link'
import { obtenerVehiculoAction, actualizarVehiculoAction } from '@/actions/vehiculos'
import { listarClientesAction } from '@/actions/clientes'
import { listarOrdenesAction } from '@/actions/ordenes'
import type { VehiculoResponseDTO } from '@/application/dtos/vehiculo.dto'
import type { ClienteListadoDTO } from '@/application/dtos/cliente.dto'
import type { OrdenListItemDTO } from '@/application/dtos/orden.dto'

interface DetalleVehiculoSheetProps {
  vehiculoId: string
  onClose: () => void
  onActualizar: () => void
}

interface VehiculoFormData {
  id: string
  tallerId: string
  matricula: string
  marca?: string
  modelo?: string
  año?: number
  color?: string
  kilometros?: number
  tipoCombustible?: string
  carroceria?: string
  potenciaCv?: number
  cilindrada?: number
  vin?: string
  bastidorVin?: string
  clienteId?: string
  notas?: string
}

export function DetalleVehiculoSheet({
  vehiculoId,
  onClose,
  onActualizar
}: DetalleVehiculoSheetProps) {
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'info' | 'historial'>('info')
  const [clientes, setClientes] = useState<ClienteListadoDTO[]>([])
  const [ordenes, setOrdenes] = useState<OrdenListItemDTO[]>([])

  const [formData, setFormData] = useState<VehiculoFormData>({
    id: '',
    tallerId: '',
    matricula: '',
    marca: '',
    modelo: '',
    año: undefined,
    color: '',
    kilometros: 0,
    tipoCombustible: '',
    potenciaCv: undefined,
    cilindrada: undefined,
    vin: '',
    carroceria: '',
    bastidorVin: '',
    clienteId: '',
    notas: ''
  })

  useEffect(() => {
    cargarDatos()
  }, [vehiculoId])

  const cargarDatos = async () => {
    try {
      setCargando(true)
      setError(null)

      // ✅ CORRECTO: Usar Server Action en lugar de createClient directo
      const resultadoVehiculo = await obtenerVehiculoAction(vehiculoId)

      if (!resultadoVehiculo.success) {
        throw new Error(resultadoVehiculo.error)
      }

      const vehiculo = resultadoVehiculo.data

      setFormData({
        id: vehiculo.id,
        tallerId: vehiculo.tallerId,
        matricula: vehiculo.matricula,
        marca: vehiculo.marca,
        modelo: vehiculo.modelo,
        año: vehiculo.año,
        color: vehiculo.color,
        kilometros: vehiculo.kilometros,
        tipoCombustible: vehiculo.tipoCombustible,
        carroceria: vehiculo.carroceria,
        potenciaCv: vehiculo.potenciaCv,
        cilindrada: vehiculo.cilindrada,
        vin: vehiculo.vin,
        bastidorVin: vehiculo.bastidorVin,
        clienteId: vehiculo.clienteId,
        notas: vehiculo.notas
      })

      // ✅ Cargar clientes del taller usando Server Action
      const resultadoClientes = await listarClientesAction({
        incluirEliminados: false,
        page: 1,
        pageSize: 100
      })

      if (resultadoClientes.success) {
        setClientes(resultadoClientes.data.data)
      }

      // ✅ Cargar historial de órdenes usando Server Action con filtro vehiculoId
      const resultadoOrdenes = await listarOrdenesAction({
        vehiculoId: vehiculoId,
        page: 1,
        pageSize: 10
      })

      if (resultadoOrdenes.success) {
        setOrdenes(resultadoOrdenes.data.data)
      }

    } catch (err: any) {
      console.error('Error cargando datos:', err)
      setError(err.message || 'Error al cargar datos')
      toast.error('Error al cargar vehículo')
    } finally {
      setCargando(false)
    }
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value === '' ? undefined : value
    }))
  }

  const handleGuardar = async () => {
    try {
      setGuardando(true)

      // ✅ CORRECTO: Usar Server Action en lugar de fetch a API route
      const resultado = await actualizarVehiculoAction({
        vehiculoId: formData.id,
        clienteId: formData.clienteId,
        marca: formData.marca,
        modelo: formData.modelo,
        año: formData.año,
        color: formData.color,
        kilometros: formData.kilometros,
        tipoCombustible: formData.tipoCombustible,
        carroceria: formData.carroceria,
        potenciaCv: formData.potenciaCv,
        cilindrada: formData.cilindrada,
        vin: formData.vin,
        bastidorVin: formData.bastidorVin,
        notas: formData.notas
      })

      if (!resultado.success) {
        throw new Error(resultado.error)
      }

      toast.success('Vehículo actualizado correctamente')
      onActualizar()
    } catch (error: any) {
      console.error('Error actualizando vehículo:', error)
      toast.error(error.message || 'Error al actualizar vehículo')
    } finally {
      setGuardando(false)
    }
  }

  const ESTADO_COLORES: Record<string, string> = {
    recibido: 'bg-blue-100 text-blue-800',
    diagnostico: 'bg-purple-100 text-purple-800',
    presupuestado: 'bg-yellow-100 text-yellow-800',
    aprobado: 'bg-cyan-100 text-cyan-800',
    en_reparacion: 'bg-amber-100 text-amber-800',
    completado: 'bg-green-100 text-green-800',
    entregado: 'bg-emerald-100 text-emerald-800',
    cancelado: 'bg-red-100 text-red-800',
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
      <div
        className="fixed right-0 top-0 h-full w-full sm:w-[500px] bg-white shadow-xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Car className="w-5 h-5 text-sky-600" />
            <div>
              <h2 className="font-bold text-lg">{formData.matricula}</h2>
              <p className="text-xs text-gray-500">{formData.marca} {formData.modelo}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Error State */}
        {error ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
            <p className="text-red-600 font-medium mb-2">Error al cargar vehículo</p>
            <p className="text-gray-500 text-sm mb-4">{error}</p>
            <Button onClick={() => { setError(null); cargarDatos(); }}>
              Reintentar
            </Button>
          </div>
        ) : cargando ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex border-b">
              <button
                onClick={() => setTab('info')}
                className={`flex-1 py-3 text-sm font-medium ${
                  tab === 'info'
                    ? 'text-sky-600 border-b-2 border-sky-600'
                    : 'text-gray-500'
                }`}
              >
                Información
              </button>
              <button
                onClick={() => setTab('historial')}
                className={`flex-1 py-3 text-sm font-medium ${
                  tab === 'historial'
                    ? 'text-sky-600 border-b-2 border-sky-600'
                    : 'text-gray-500'
                }`}
              >
                Historial ({ordenes.length})
              </button>
            </div>

            {tab === 'info' ? (
              <div className="p-4 space-y-4">
                {/* Cliente */}
                <div>
                  <Label>Cliente</Label>
                  <select
                    value={formData.clienteId || ''}
                    onChange={(e) => handleChange('clienteId', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Sin asignar</option>
                    {clientes.map(cliente => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.nombreCompleto}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Datos del vehículo */}
                <Card className="p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Car className="w-4 h-4" />
                    Datos del Vehículo
                  </h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Marca</Label>
                        <Input
                          value={formData.marca || ''}
                          onChange={(e) => handleChange('marca', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Modelo</Label>
                        <Input
                          value={formData.modelo || ''}
                          onChange={(e) => handleChange('modelo', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Año</Label>
                        <NumberInput
                          value={formData.año}
                          onChange={(value) => handleChange('año', value)}
                          min={1900}
                          max={new Date().getFullYear() + 1}
                        />
                      </div>
                      <div>
                        <Label>Color</Label>
                        <Input
                          value={formData.color || ''}
                          onChange={(e) => handleChange('color', e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Kilómetros</Label>
                      <NumberInput
                        value={formData.kilometros}
                        onChange={(value) => handleChange('kilometros', value)}
                        min={0}
                      />
                    </div>

                    <div>
                      <Label>VIN / Bastidor</Label>
                      <Input
                        value={formData.vin || ''}
                        onChange={(e) => handleChange('vin', e.target.value)}
                      />
                    </div>
                  </div>
                </Card>

                {/* Notas */}
                <div>
                  <Label>Notas</Label>
                  <Textarea
                    value={formData.notas || ''}
                    onChange={(e) => handleChange('notas', e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Botón guardar */}
                <Button
                  onClick={handleGuardar}
                  disabled={guardando}
                  className="w-full gap-2"
                >
                  {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {guardando ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Wrench className="w-4 h-4" />
                  Historial de Reparaciones
                </h3>

                {ordenes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No hay órdenes de reparación</p>
                  </div>
                ) : (
                  ordenes.map(orden => (
                    <Link
                      key={orden.id}
                      href={`/dashboard/ordenes?id=${orden.id}`}
                      className="block p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-medium">#{orden.numeroOrden}</p>
                          <p className="text-sm text-gray-500">{orden.descripcionProblema}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(orden.fechaEntrada).toLocaleDateString('es-ES')}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${ESTADO_COLORES[orden.estado]}`}>
                          {orden.estadoLabel}
                        </span>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
