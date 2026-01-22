/**
 * @fileoverview Componente Principal Refactorizado - DetalleOrdenSheet
 * @description Smart Component optimizado con arquitectura limpia y validación defensiva
 */

'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { X, Save, Loader2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { useOrdenData } from '@/hooks/useOrdenData'
import { VehiculoForm } from './VehiculoForm'
import { LineasOrden } from './LineasOrden'
import { OrdenForm } from './OrdenForm'
import { sanitizeNumber, sanitizeString, DEFAULT_VALUES, type OrdenFormulario } from '@/types/workshop'

interface DetalleOrdenSheetProps {
  ordenId?: string | null
  onClose: () => void
  onActualizar: () => void
  modoCrear?: boolean
}

export function DetalleOrdenSheet({ 
  ordenId, 
  onClose, 
  onActualizar, 
  modoCrear = false 
}: DetalleOrdenSheetProps) {
  const router = useRouter()
  const [mostrarFormCliente, setMostrarFormCliente] = useState(false)
  const [mostrarFormVehiculo, setMostrarFormVehiculo] = useState(false)
  
  // Estados para formularios con validación
  const [formData, setFormData] = useState<OrdenFormulario>(DEFAULT_VALUES.orden)
  const [vehiculoForm, setVehiculoForm] = useState(DEFAULT_VALUES.vehiculo)
  const [clienteForm, setClienteForm] = useState(DEFAULT_VALUES.cliente)
  
  // Hook de lógica de negocio
  const {
    cargando,
    guardando,
    orden,
    clientes,
    vehiculos,
    lineas,
    tarifaHora,
    guardarOrden,
    cargarVehiculos,
    agregarLinea,
    actualizarLinea,
    eliminarLinea,
    crearCliente,
    crearVehiculo
  } = useOrdenData(ordenId)

  // Manejo defensivo de cambios en el formulario
  const handleFormChange = useCallback((updates: Partial<OrdenFormulario>) => {
    setFormData(prev => {
      const sanitized = { ...prev }
      
      // Sanitización defensiva para cada campo
      Object.entries(updates).forEach(([key, value]) => {
        switch (key) {
          case 'tiempo_estimado_horas':
          case 'tiempo_real_horas':
          case 'coste_diario_estancia':
          case 'kilometros_entrada':
            sanitized[key as keyof OrdenFormulario] = sanitizeNumber(value, 0)
            break
          case 'descripcion_problema':
          case 'diagnostico':
          case 'trabajos_realizados':
          case 'notas':
          case 'danos_carroceria':
          case 'nivel_combustible':
            sanitized[key as keyof OrdenFormulario] = sanitizeString(value, '')
            break
          case 'cliente_id':
          case 'vehiculo_id':
          case 'accion_imprevisto':
            sanitized[key as keyof OrdenFormulario] = sanitizeString(value, '')
            break
          case 'presupuesto_aprobado_por_cliente':
          case 'renuncia_presupuesto':
          case 'recoger_piezas':
            sanitized[key as keyof OrdenFormulario] = Boolean(value)
            break
          default:
            sanitized[key as keyof OrdenFormulario] = value
        }
      })
      
      return sanitized
    })
  }, [])

  // Guardado con race condition protection
  const handleGuardar = useCallback(async () => {
    if (guardando) return // Prevenir double-click

    const datosParaGuardar = {
      ...formData,
      // Calcular totales basados en líneas
      subtotal_mano_obra: lineas
        .filter(l => l.tipo === 'mano_obra')
        .reduce((sum, l) => sum + (l.cantidad * l.precio_unitario), 0),
      subtotal_piezas: lineas
        .filter(l => l.tipo === 'pieza')
        .reduce((sum, l) => sum + (l.cantidad * l.precio_unitario), 0),
    }

    // Calcular IVA y total
    const subtotal = datosParaGuardar.subtotal_mano_obra + datosParaGuardar.subtotal_piezas
    datosParaGuardar.iva_amount = subtotal * 0.21 // 21% IVA
    datosParaGuardar.total_con_iva = subtotal + datosParaGuardar.iva_amount

    const exito = await guardarOrden(datosParaGuardar)
    if (exito) {
      onActualizar()
      onClose()
    }
  }, [formData, lineas, guardando, guardarOrden, onActualizar, onClose])

  // Crear cliente nuevo
  const handleCrearCliente = useCallback(async () => {
    if (!clienteForm.nombre.trim()) {
      toast.error('El nombre del cliente es obligatorio')
      return
    }

    const exito = await crearCliente(clienteForm)
    if (exito) {
      setMostrarFormCliente(false)
      setClienteForm(DEFAULT_VALUES.cliente)
      // Seleccionar automáticamente el cliente creado
      // TODO: Implementar esto cuando useOrdenData devuelva el cliente creado
    }
  }, [clienteForm, crearCliente])

  // Crear vehículo nuevo
  const handleCrearVehiculo = useCallback(async () => {
    if (!vehiculoForm.matricula.trim()) {
      toast.error('La matrícula es obligatoria')
      return
    }

    const exito = await crearVehiculo(vehiculoForm)
    if (exito) {
      setMostrarFormVehiculo(false)
      setVehiculoForm(DEFAULT_VALUES.vehiculo)
    }
  }, [vehiculoForm, crearVehiculo])

  // Cargar vehículos cuando se selecciona cliente
  const handleClienteChange = useCallback((clienteId: string) => {
    handleFormChange({ cliente_id: clienteId })
    if (clienteId) {
      cargarVehiculos(clienteId)
    }
  }, [handleFormChange, cargarVehiculos])

  // Sincronizar datos si estamos editando
  useState(() => {
    if (orden && !modoCrear) {
      setFormData({
        ...DEFAULT_VALUES.orden,
        ...orden
      } as OrdenFormulario)
    }
  })

  if (cargando) {
    return (
      <Sheet open={true} onOpenChange={onClose}>
        <SheetContent className="w-full max-w-6xl overflow-y-auto">
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Sheet open={true} onOpenChange={onClose}>
      <SheetContent className="w-full max-w-6xl overflow-y-auto">
        <SheetHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <SheetTitle>
            {modoCrear ? 'Nueva Orden de Reparación' : orden?.numero_orden || 'Editar Orden'}
          </SheetTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </SheetHeader>

        <div className="space-y-6">
          {/* Sección de Cliente y Vehículo */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Selección/Creación de Cliente */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Cliente</h3>
                {!mostrarFormCliente && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMostrarFormCliente(true)}
                  >
                    <UserPlus className="h-3 w-3 mr-1" />
                    Nuevo
                  </Button>
                )}
              </div>

              {mostrarFormCliente ? (
                <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                  <input
                    placeholder="Nombre *"
                    value={clienteForm.nombre}
                    onChange={(e) => setClienteForm(prev => ({ ...prev, nombre: e.target.value }))}
                    className="w-full px-3 py-2 border rounded"
                  />
                  <input
                    placeholder="Apellidos"
                    value={clienteForm.apellidos || ''}
                    onChange={(e) => setClienteForm(prev => ({ ...prev, apellidos: e.target.value }))}
                    className="w-full px-3 py-2 border rounded"
                  />
                  <input
                    placeholder="NIF"
                    value={clienteForm.nif || ''}
                    onChange={(e) => setClienteForm(prev => ({ ...prev, nif: e.target.value }))}
                    className="w-full px-3 py-2 border rounded"
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleCrearCliente} disabled={guardando}>
                      Guardar Cliente
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setMostrarFormCliente(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <select
                  value={formData.cliente_id || ''}
                  onChange={(e) => handleClienteChange(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Seleccionar cliente...</option>
                  {clientes.map(cliente => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nombre} {cliente.apellidos}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Selección/Creación de Vehículo */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Vehículo</h3>
                {!mostrarFormVehiculo && formData.cliente_id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMostrarFormVehiculo(true)}
                  >
                    <UserPlus className="h-3 w-3 mr-1" />
                    Nuevo
                  </Button>
                )}
              </div>

              {mostrarFormVehiculo ? (
                <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                  <input
                    placeholder="Matrícula *"
                    value={vehiculoForm.matricula}
                    onChange={(e) => setVehiculoForm(prev => ({ ...prev, matricula: e.target.value }))}
                    className="w-full px-3 py-2 border rounded"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      placeholder="Marca"
                      value={vehiculoForm.marca || ''}
                      onChange={(e) => setVehiculoForm(prev => ({ ...prev, marca: e.target.value }))}
                      className="px-3 py-2 border rounded"
                    />
                    <input
                      placeholder="Modelo"
                      value={vehiculoForm.modelo || ''}
                      onChange={(e) => setVehiculoForm(prev => ({ ...prev, modelo: e.target.value }))}
                      className="px-3 py-2 border rounded"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleCrearVehiculo} disabled={guardando}>
                      Guardar Vehículo
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setMostrarFormVehiculo(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <select
                  value={formData.vehiculo_id || ''}
                  onChange={(e) => handleFormChange({ vehiculo_id: e.target.value })}
                  disabled={!formData.cliente_id}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Seleccionar vehículo...</option>
                  {vehiculos.map(vehiculo => (
                    <option key={vehiculo.id} value={vehiculo.id}>
                      {vehiculo.matricula} - {vehiculo.marca} {vehiculo.modelo}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Formulario principal de la orden */}
          <OrdenForm 
            formData={formData}
            onChange={handleFormChange}
            disabled={guardando}
          />

          {/* Líneas de la orden */}
          <LineasOrden
            lineas={lineas}
            puedeEditar={!guardando}
            onAgregar={agregarLinea}
            onEliminar={eliminarLinea}
            onActualizar={actualizarLinea}
          />

          {/* Botones de acción */}
          <div className="flex justify-between items-center pt-6 border-t">
            <div className="text-sm text-gray-600">
              {lineas.length > 0 && (
                <div>
                  Subtotal: €{lineas.reduce((sum, l) => sum + (l.cantidad * l.precio_unitario), 0).toFixed(2)}
                </div>
              )}
            </div>
            
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} disabled={guardando}>
                Cancelar
              </Button>
              <Button onClick={handleGuardar} disabled={guardando}>
                {guardando ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {modoCrear ? 'Crear Orden' : 'Guardar Cambios'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}