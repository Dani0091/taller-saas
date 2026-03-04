/**
 * @fileoverview Tab de Información (Cliente, Vehículo, Problema, Recepción)
 * @description Formularios de cliente/vehículo y datos iniciales de la orden
 * REGLAS:
 * - Componente pasivo que recibe props y callbacks
 * - Creación de cliente/vehículo mediante callbacks
 * - Sin SQL directo, solo callbacks
 */
'use client'

import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { NumberInput } from '@/components/ui/number-input'
import { InputScanner } from '@/components/ui/input-scanner'
import { FotoUploader } from '../foto-uploader'
import { getFotoByKey } from '@/lib/utils'
import { UserPlus, Car, Loader2, Edit2, Search, X } from 'lucide-react'
import type {
  VehiculoNuevoFormulario,
  VehiculoEdicionFormulario
} from '@/types/formularios'

interface Cliente {
  id: string
  nombre: string
  apellidos?: string
  primer_apellido?: string
  nif?: string
}

interface Vehiculo {
  id: string
  matricula: string
  marca: string
  modelo: string
  año?: number
  kilometros?: number
}

interface NuevoCliente {
  nombre: string
  primer_apellido?: string
  segundo_apellido?: string
  nif?: string
  telefono?: string
  email?: string
}

interface FormData {
  cliente_id: string
  vehiculo_id: string
  descripcion_problema?: string
  nivel_combustible?: string
  kilometros_entrada?: number
  kilometros_salida?: number
  coste_diario_estancia?: number
  presupuesto_aprobado_por_cliente?: boolean
  renuncia_presupuesto?: boolean
  recoger_piezas?: boolean
  accion_imprevisto?: string
  danos_carroceria?: string
  notas?: string
  fotos_diagnostico?: string
}

// Props for the matricula-first vehicle search
interface MatriculaSearchProps {
  matriculaInput: string
  buscandoMatricula: boolean
  matriculaNoEncontrada: boolean
  onMatriculaInputChange: (value: string) => void
  onBuscarMatricula: () => void
}

interface OrdenInfoTabProps extends MatriculaSearchProps {
  // Flags de estado
  modoCrear: boolean
  ordenSeleccionada: string | null | undefined

  // Datos
  formData: FormData
  clientes: Cliente[]
  vehiculos: Vehiculo[]

  // Estados de formularios
  mostrarFormCliente: boolean
  mostrarFormVehiculo: boolean
  editandoVehiculo: boolean
  creandoCliente: boolean
  creandoVehiculo: boolean
  guardandoVehiculo: boolean

  // Datos de nuevos registros
  nuevoCliente: NuevoCliente
  nuevoVehiculo: VehiculoNuevoFormulario
  vehiculoEditado: VehiculoEdicionFormulario

  // Callbacks de datos
  onFormDataChange: (data: Partial<FormData>) => void

  // Callbacks de formularios
  onToggleFormCliente: () => void
  onToggleFormVehiculo: () => void
  onToggleEditandoVehiculo: () => void

  // Callbacks de creación
  onNuevoClienteChange: (cliente: Partial<NuevoCliente>) => void
  onNuevoVehiculoChange: (vehiculo: Partial<VehiculoNuevoFormulario>) => void
  onVehiculoEditadoChange: (vehiculo: Partial<VehiculoEdicionFormulario>) => void

  // Callbacks de acciones
  onCrearCliente: () => void
  onCrearVehiculo: () => void
  onGuardarVehiculo: () => void

  // Vehículo seleccionado
  vehiculoSeleccionado?: Vehiculo | null
}

export function OrdenInfoTab({
  modoCrear,
  ordenSeleccionada,
  formData,
  clientes,
  vehiculos,
  mostrarFormCliente,
  mostrarFormVehiculo,
  editandoVehiculo,
  creandoCliente,
  creandoVehiculo,
  guardandoVehiculo,
  nuevoCliente,
  nuevoVehiculo,
  vehiculoEditado,
  onFormDataChange,
  onToggleFormCliente,
  onToggleFormVehiculo,
  onToggleEditandoVehiculo,
  onNuevoClienteChange,
  onNuevoVehiculoChange,
  onVehiculoEditadoChange,
  onCrearCliente,
  onCrearVehiculo,
  onGuardarVehiculo,
  vehiculoSeleccionado,
  matriculaInput,
  buscandoMatricula,
  matriculaNoEncontrada,
  onMatriculaInputChange,
  onBuscarMatricula,
}: OrdenInfoTabProps) {
  const [busquedaCliente, setBusquedaCliente] = useState('')
  const [comboAbierto, setComboAbierto] = useState(false)
  const comboRef = useRef<HTMLDivElement>(null)

  // Cierra el combo si se hace clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setComboAbierto(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const clientesFiltrados = clientes.filter(c => {
    if (!busquedaCliente) return true
    const q = busquedaCliente.toLowerCase()
    const apellido = (c.primer_apellido || c.apellidos || '').toLowerCase()
    return (
      c.nombre.toLowerCase().includes(q) ||
      apellido.includes(q) ||
      (c.nif || '').toLowerCase().includes(q)
    )
  })

  const clienteActual = clientes.find(c => c.id === formData.cliente_id)

  return (
    <>
      {/* ══ VEHÍCULO — sección principal (matricula-first) ══ */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <Label className="text-sm font-semibold flex items-center gap-2">
            <Car className="w-4 h-4" /> Vehículo *
          </Label>
          {!formData.vehiculo_id && (
            <Button type="button" size="sm" variant="outline" onClick={onToggleFormVehiculo} className="gap-1 text-xs">
              <Car className="w-3 h-3" />
              {mostrarFormVehiculo ? 'Cancelar' : 'Nuevo manual'}
            </Button>
          )}
          {formData.vehiculo_id && (
            <Button type="button" size="sm" variant="outline" onClick={onToggleEditandoVehiculo} className="gap-1 text-xs">
              <Edit2 className="w-3 h-3" />
              Editar
            </Button>
          )}
        </div>

        {/* Vehículo seleccionado */}
        {formData.vehiculo_id && vehiculoSeleccionado && !editandoVehiculo && (
          <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl flex items-center justify-between">
            <div>
              <p className="font-bold text-sky-900 font-mono tracking-wider text-lg">
                {vehiculoSeleccionado.matricula}
              </p>
              <p className="text-sm text-sky-700">
                {vehiculoSeleccionado.marca} {vehiculoSeleccionado.modelo}
                {vehiculoSeleccionado.año ? ` (${vehiculoSeleccionado.año})` : ''}
              </p>
              {vehiculoSeleccionado.kilometros ? (
                <p className="text-xs text-sky-600">{vehiculoSeleccionado.kilometros.toLocaleString()} km</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onFormDataChange({ vehiculo_id: '', cliente_id: '' })}
              className="text-gray-400 hover:text-red-500 p-1"
              title="Cambiar vehículo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Editar vehículo existente */}
        {formData.vehiculo_id && vehiculoSeleccionado && editandoVehiculo && (
          <div className="space-y-3 p-3 bg-purple-50 rounded-xl border border-purple-200">
            <h4 className="font-semibold text-purple-800 text-sm flex items-center gap-2">
              <Edit2 className="w-4 h-4" /> Editar Vehículo
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-gray-600 mb-1 block">Marca</Label>
                <Input value={vehiculoEditado.marca || ''} onChange={(e) => onVehiculoEditadoChange({ marca: e.target.value })} placeholder="Seat" className="bg-white" />
              </div>
              <div>
                <Label className="text-xs text-gray-600 mb-1 block">Modelo</Label>
                <Input value={vehiculoEditado.modelo || ''} onChange={(e) => onVehiculoEditadoChange({ modelo: e.target.value })} placeholder="Ibiza" className="bg-white" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-600 mb-1 block">Bastidor (VIN)</Label>
              <Input value={vehiculoEditado.vin || ''} onChange={(e) => onVehiculoEditadoChange({ vin: e.target.value })} placeholder="WVWZZZ1KZBW123456" className="bg-white font-mono" />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onToggleEditandoVehiculo} disabled={guardandoVehiculo} className="flex-1 py-3">Cancelar</Button>
              <Button type="button" onClick={onGuardarVehiculo} disabled={guardandoVehiculo} className="flex-1 bg-purple-600 hover:bg-purple-700 py-3">
                {guardandoVehiculo && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {guardandoVehiculo ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
        )}

        {/* Sin vehículo — búsqueda por matrícula */}
        {!formData.vehiculo_id && !mostrarFormVehiculo && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={matriculaInput}
                onChange={(e) => onMatriculaInputChange(e.target.value.toUpperCase().replace(/\s/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && onBuscarMatricula()}
                placeholder="Escribe la matrícula (ej: 1234ABC)"
                className="flex-1 px-3 py-3 border rounded-xl focus:ring-2 focus:ring-sky-500 bg-white font-mono text-center text-lg tracking-widest uppercase"
                autoFocus={modoCrear}
              />
              <button
                type="button"
                onClick={onBuscarMatricula}
                disabled={buscandoMatricula || !matriculaInput.trim()}
                className="px-4 py-3 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl flex items-center gap-2 font-medium min-w-[56px] justify-center"
              >
                {buscandoMatricula ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-gray-400 text-center">Pulsa Buscar o Enter para buscar en el sistema</p>
            {matriculaNoEncontrada && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-sm text-amber-700 font-medium">Matrícula no encontrada</p>
                <p className="text-xs text-amber-600 mt-1">Pulsa "Nuevo manual" para registrar este vehículo</p>
              </div>
            )}
          </div>
        )}

        {/* Formulario de nuevo vehículo */}
        {!formData.vehiculo_id && mostrarFormVehiculo && (
          <div className="space-y-3 p-3 bg-green-50 rounded-xl border border-green-200">
            <h4 className="font-semibold text-green-800 text-sm flex items-center gap-2">
              <Car className="w-4 h-4" /> Nuevo Vehículo
            </h4>
            <div>
              <Label className="text-xs text-gray-600 mb-1 block">Matrícula *</Label>
              <div className="flex gap-2">
                <Input
                  value={nuevoVehiculo.matricula}
                  onChange={(e) => onNuevoVehiculoChange({ matricula: e.target.value.toUpperCase() })}
                  placeholder="1234ABC"
                  className="font-mono uppercase flex-1 py-3"
                />
                <InputScanner tipo="matricula" onResult={(val) => onNuevoVehiculoChange({ matricula: val })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-gray-600 mb-1 block">Marca</Label>
                <Input value={nuevoVehiculo.marca || ''} onChange={(e) => onNuevoVehiculoChange({ marca: e.target.value })} placeholder="Seat" className="bg-white py-3" />
              </div>
              <div>
                <Label className="text-xs text-gray-600 mb-1 block">Modelo</Label>
                <Input value={nuevoVehiculo.modelo || ''} onChange={(e) => onNuevoVehiculoChange({ modelo: e.target.value })} placeholder="Ibiza" className="bg-white py-3" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-600 mb-1 block">Bastidor (VIN)</Label>
              <Input value={nuevoVehiculo.vin || ''} onChange={(e) => onNuevoVehiculoChange({ vin: e.target.value })} placeholder="WVWZZZ1KZBW123456" className="bg-white font-mono py-3" />
            </div>
            <Button
              type="button"
              onClick={onCrearVehiculo}
              disabled={creandoVehiculo || !nuevoVehiculo.matricula.trim()}
              className="w-full gap-2 bg-green-600 hover:bg-green-700 py-3"
            >
              {creandoVehiculo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Car className="w-4 h-4" />}
              {creandoVehiculo ? 'Creando...' : 'Crear Vehículo'}
            </Button>
          </div>
        )}
      </Card>

      {/* ══ CLIENTE — sección secundaria (opcional) ══ */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-semibold">Cliente <span className="text-gray-400 font-normal">(opcional)</span></Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onToggleFormCliente}
            className="gap-1 text-xs"
          >
            <UserPlus className="w-3 h-3" />
            {mostrarFormCliente ? 'Cancelar' : 'Nuevo'}
          </Button>
        </div>

        {!mostrarFormCliente ? (
          <div ref={comboRef} className="relative">
            {/* Input de búsqueda */}
            <div className="flex items-center gap-2 px-3 py-2.5 border rounded-xl bg-white focus-within:ring-2 focus-within:ring-sky-500">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder={clienteActual
                  ? `${clienteActual.nombre} ${clienteActual.primer_apellido || clienteActual.apellidos || ''}`.trim()
                  : 'Buscar cliente por nombre, apellido o NIF...'}
                value={busquedaCliente}
                onChange={(e) => { setBusquedaCliente(e.target.value); setComboAbierto(true) }}
                onFocus={() => setComboAbierto(true)}
                className="flex-1 outline-none text-sm bg-transparent"
              />
              {(formData.cliente_id || busquedaCliente) && (
                <button
                  type="button"
                  onClick={() => {
                    setBusquedaCliente('')
                    onFormDataChange({ cliente_id: '', vehiculo_id: '' })
                    setComboAbierto(false)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Dropdown de resultados */}
            {comboAbierto && (
              <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                {clientesFiltrados.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-500 text-center">
                    Sin resultados
                  </div>
                ) : (
                  clientesFiltrados.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onMouseDown={() => {
                        onFormDataChange({ cliente_id: c.id, vehiculo_id: '' })
                        setBusquedaCliente('')
                        setComboAbierto(false)
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-sky-50 transition-colors ${
                        formData.cliente_id === c.id ? 'bg-sky-50 font-medium' : ''
                      }`}
                    >
                      <span className="text-gray-900">
                        {c.nombre} {c.primer_apellido || c.apellidos || ''}
                      </span>
                      {c.nif && (
                        <span className="ml-2 text-xs text-gray-400 font-mono">{c.nif}</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
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
                onChange={(e) => onNuevoClienteChange({ nombre: e.target.value })}
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
                  onChange={(e) => onNuevoClienteChange({ primer_apellido: e.target.value })}
                  placeholder="Primer apellido"
                  className="bg-white"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-600 mb-1 block">Segundo Apellido</Label>
                <Input
                  value={nuevoCliente.segundo_apellido}
                  onChange={(e) => onNuevoClienteChange({ segundo_apellido: e.target.value })}
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
                  onChange={(e) => onNuevoClienteChange({ nif: e.target.value.toUpperCase() })}
                  placeholder="12345678A"
                  className="bg-white font-mono"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-600 mb-1 block">Teléfono</Label>
                <Input
                  value={nuevoCliente.telefono}
                  onChange={(e) => onNuevoClienteChange({ telefono: e.target.value })}
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
                onChange={(e) => onNuevoClienteChange({ email: e.target.value })}
                placeholder="cliente@email.com"
                className="bg-white"
              />
            </div>

            {/* Botón crear */}
            <Button
              type="button"
              onClick={onCrearCliente}
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

      {/* Vehículo — solo mostrar selector secundario si no hay vehículo ya seleccionado por matrícula */}
      {formData.cliente_id && !formData.vehiculo_id && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-semibold">Vehículo</Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onToggleFormVehiculo}
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
                  onChange={(e) => onFormDataChange({ vehiculo_id: e.target.value })}
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

              {/* Mostrar info del vehículo seleccionado con botón editar */}
              {vehiculoSeleccionado && !editandoVehiculo && (
                <div className="mt-3 p-3 bg-gray-50 rounded-xl border">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        {vehiculoSeleccionado.marca} {vehiculoSeleccionado.modelo}
                      </p>
                      <p className="text-sm text-gray-600">Matrícula: {vehiculoSeleccionado.matricula}</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={onToggleEditandoVehiculo}
                      className="gap-1 text-xs"
                    >
                      <Edit2 className="w-3 h-3" />
                      Editar
                    </Button>
                  </div>
                </div>
              )}

              {/* Formulario de edición de vehículo */}
              {vehiculoSeleccionado && editandoVehiculo && (
                <div className="mt-3 space-y-3 p-3 bg-purple-50 rounded-xl border border-purple-200">
                  <h4 className="font-semibold text-purple-800 text-sm flex items-center gap-2">
                    <Edit2 className="w-4 h-4" />
                    Editar Vehículo
                  </h4>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-gray-600 mb-1 block">Marca</Label>
                      <Input
                        value={vehiculoEditado.marca || ''}
                        onChange={(e) => onVehiculoEditadoChange({ marca: e.target.value })}
                        placeholder="Ej: Seat"
                        className="bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600 mb-1 block">Modelo</Label>
                      <Input
                        value={vehiculoEditado.modelo || ''}
                        onChange={(e) => onVehiculoEditadoChange({ modelo: e.target.value })}
                        placeholder="Ej: Ibiza"
                        className="bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-gray-600 mb-1 block">Bastidor (VIN)</Label>
                    <Input
                      value={vehiculoEditado.vin || ''}
                      onChange={(e) => onVehiculoEditadoChange({ vin: e.target.value })}
                      placeholder="Ej: WVWZZZ1KZBW123456"
                      className="bg-white font-mono"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onToggleEditandoVehiculo}
                      disabled={guardandoVehiculo}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      onClick={onGuardarVehiculo}
                      disabled={guardandoVehiculo}
                      className="flex-1 bg-purple-600 hover:bg-purple-700"
                    >
                      {guardandoVehiculo && (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      )}
                      {guardandoVehiculo ? 'Guardando...' : 'Guardar'}
                    </Button>
                  </div>
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
                    onChange={(e) => onNuevoVehiculoChange({ matricula: e.target.value.toUpperCase() })}
                    placeholder="1234ABC"
                    className="font-mono uppercase flex-1"
                  />
                  <InputScanner
                    tipo="matricula"
                    onResult={(val) => onNuevoVehiculoChange({ matricula: val })}
                  />
                </div>
              </div>

              {/* Marca y Modelo */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-gray-600 mb-1 block">Marca</Label>
                  <Input
                    value={nuevoVehiculo.marca || ''}
                    onChange={(e) => onNuevoVehiculoChange({ marca: e.target.value })}
                    placeholder="Ej: Seat"
                    className="bg-white"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-600 mb-1 block">Modelo</Label>
                  <Input
                    value={nuevoVehiculo.modelo || ''}
                    onChange={(e) => onNuevoVehiculoChange({ modelo: e.target.value })}
                    placeholder="Ej: Ibiza"
                    className="bg-white"
                  />
                </div>
              </div>

              {/* Bastidor */}
              <div>
                <Label className="text-xs text-gray-600 mb-1 block">Bastidor (VIN)</Label>
                <Input
                  value={nuevoVehiculo.vin || ''}
                  onChange={(e) => onNuevoVehiculoChange({ vin: e.target.value })}
                  placeholder="Ej: WVWZZZ1KZBW123456"
                  className="bg-white font-mono"
                />
              </div>

              {/* Botón crear */}
              <Button
                type="button"
                onClick={onCrearVehiculo}
                disabled={creandoVehiculo || !nuevoVehiculo.matricula.trim()}
                className="w-full gap-2 bg-green-600 hover:bg-green-700"
              >
                {creandoVehiculo ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Car className="w-4 h-4" />
                )}
                {creandoVehiculo ? 'Creando...' : 'Crear Vehículo'}
              </Button>
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
          onChange={(e) => onFormDataChange({ descripcion_problema: e.target.value })}
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
                onClick={() => onFormDataChange({ nivel_combustible: nivel })}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg border-2 transition-all ${
                  formData.nivel_combustible === nivel
                    ? 'bg-amber-500 border-amber-500 text-white'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-amber-300'
                }`}
              >
                {nivel}
              </button>
            ))}
          </div>
        </div>

        {/* KM entrada / salida */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <Label className="text-xs text-gray-500 mb-1 block">KM entrada</Label>
            <NumberInput
              value={formData.kilometros_entrada}
              onChange={(value) => onFormDataChange({ kilometros_entrada: value || undefined })}
              placeholder="Ej: 145000"
              className="font-mono"
              min={0}
              allowEmpty={true}
            />
          </div>
          <div>
            <Label className="text-xs text-gray-500 mb-1 block">KM salida</Label>
            <NumberInput
              value={formData.kilometros_salida}
              onChange={(value) => onFormDataChange({ kilometros_salida: value || undefined })}
              placeholder="Ej: 145020"
              className="font-mono"
              min={0}
              allowEmpty={true}
            />
          </div>
        </div>

        {/* Coste diario de estancia */}
        <div>
          <Label className="text-xs text-gray-500 mb-1 block">Coste diario de estancia (€)</Label>
          <NumberInput
            value={formData.coste_diario_estancia ?? 0}
            onChange={(value) => onFormDataChange({ coste_diario_estancia: value || undefined })}
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
            onChange={(e) => onFormDataChange({ presupuesto_aprobado_por_cliente: e.target.checked })}
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
            onChange={(e) => onFormDataChange({ renuncia_presupuesto: e.target.checked })}
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
            onChange={(e) => onFormDataChange({ recoger_piezas: e.target.checked })}
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
              onClick={() => onFormDataChange({ accion_imprevisto: 'avisar' })}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-lg border-2 transition-all ${
                formData.accion_imprevisto === 'avisar'
                  ? 'bg-blue-500 border-blue-500 text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300'
              }`}
            >
              📞 Avisar antes
            </button>
            <button
              type="button"
              onClick={() => onFormDataChange({ accion_imprevisto: 'actuar' })}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-lg border-2 transition-all ${
                formData.accion_imprevisto === 'actuar'
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-green-300'
              }`}
            >
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
          onChange={(e) => onFormDataChange({ danos_carroceria: e.target.value })}
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
          onChange={(e) => onFormDataChange({ notas: e.target.value })}
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
                  onFormDataChange({ fotos_diagnostico: JSON.stringify(fotosObj) })
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
                  onFormDataChange({ fotos_diagnostico: JSON.stringify(fotosObj) })
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
  )
}
