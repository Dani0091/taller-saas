/**
 * @fileoverview Paso 1 del wizard de creación de orden — selección/creación de cliente
 * @description Componente pasivo: recibe props y callbacks, sin SQL directo
 */
'use client'

import { useState, useRef, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { UserPlus, Search, X, Loader2 } from 'lucide-react'

interface Cliente {
  id: string
  nombre: string
  apellidos?: string
  primer_apellido?: string
  nif?: string
  telefono?: string
}

interface NuevoCliente {
  nombre: string
  primer_apellido?: string
  segundo_apellido?: string
  nif?: string
  telefono?: string
  email?: string
}

interface OrdenClienteStepProps {
  clienteId: string
  clientes: Cliente[]
  mostrarFormCliente: boolean
  creandoCliente: boolean
  nuevoCliente: NuevoCliente
  onClienteIdChange: (id: string) => void
  onToggleFormCliente: () => void
  onNuevoClienteChange: (cliente: Partial<NuevoCliente>) => void
  onCrearCliente: () => void
}

export function OrdenClienteStep({
  clienteId,
  clientes,
  mostrarFormCliente,
  creandoCliente,
  nuevoCliente,
  onClienteIdChange,
  onToggleFormCliente,
  onNuevoClienteChange,
  onCrearCliente,
}: OrdenClienteStepProps) {
  const [busquedaCliente, setBusquedaCliente] = useState('')
  const [comboAbierto, setComboAbierto] = useState(false)
  const [mostrarMasDetalles, setMostrarMasDetalles] = useState(false)
  const comboRef = useRef<HTMLDivElement>(null)

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

  const clienteActual = clientes.find(c => c.id === clienteId)

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Selecciona Cliente</h1>

      <div ref={comboRef} className="relative">
        <div className="flex items-center gap-2 px-3 py-3 border rounded-xl bg-white focus-within:ring-2 focus-within:ring-sky-500 shadow-sm">
          <Search className="w-5 h-5 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder={clienteActual
              ? `${clienteActual.nombre} ${clienteActual.primer_apellido || clienteActual.apellidos || ''}`.trim()
              : 'Buscar cliente por nombre, apellido o NIF...'}
            value={busquedaCliente}
            onChange={(e) => { setBusquedaCliente(e.target.value); setComboAbierto(true) }}
            onFocus={() => setComboAbierto(true)}
            autoFocus
            className="flex-1 outline-none text-base bg-transparent"
          />
          {(clienteId || busquedaCliente) && (
            <button
              type="button"
              onClick={() => {
                setBusquedaCliente('')
                onClienteIdChange('')
                setComboAbierto(false)
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {comboAbierto && (
          <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
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
                    onClienteIdChange(c.id)
                    setBusquedaCliente('')
                    setComboAbierto(false)
                  }}
                  className={`w-full text-left px-4 py-3 text-sm hover:bg-sky-50 transition-colors ${
                    clienteId === c.id ? 'bg-sky-50 font-medium' : ''
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

        {clienteActual && (
          <div className="mt-3 p-3 bg-sky-50 border border-sky-200 rounded-xl">
            <p className="font-semibold text-sky-900">
              {clienteActual.nombre} {clienteActual.primer_apellido || clienteActual.apellidos || ''}
            </p>
            {(clienteActual.nif || clienteActual.telefono) && (
              <p className="text-xs text-sky-600 mt-0.5">
                {[clienteActual.nif, clienteActual.telefono].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onToggleFormCliente}
        className="mt-4 text-sm text-sky-600 hover:text-sky-700 font-medium flex items-center gap-1.5"
      >
        <UserPlus className="w-4 h-4" /> Crear nuevo cliente
      </button>

      <Dialog open={mostrarFormCliente} onOpenChange={() => onToggleFormCliente()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600" />
              Nuevo Cliente
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label className="text-xs text-gray-600 mb-1 block">Nombre *</Label>
              <Input
                value={nuevoCliente.nombre}
                onChange={(e) => onNuevoClienteChange({ nombre: e.target.value })}
                placeholder="Nombre"
                autoFocus
              />
            </div>

            <div>
              <Label className="text-xs text-gray-600 mb-1 block">Teléfono <span className="text-gray-400 font-normal">(opcional)</span></Label>
              <Input
                value={nuevoCliente.telefono}
                onChange={(e) => onNuevoClienteChange({ telefono: e.target.value })}
                placeholder="666 123 456"
              />
            </div>

            {!mostrarMasDetalles ? (
              <button
                type="button"
                onClick={() => setMostrarMasDetalles(true)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                + Añadir más detalles (apellidos, NIF, email)
              </button>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-gray-600 mb-1 block">Primer Apellido</Label>
                    <Input
                      value={nuevoCliente.primer_apellido}
                      onChange={(e) => onNuevoClienteChange({ primer_apellido: e.target.value })}
                      placeholder="Primer apellido"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600 mb-1 block">Segundo Apellido</Label>
                    <Input
                      value={nuevoCliente.segundo_apellido}
                      onChange={(e) => onNuevoClienteChange({ segundo_apellido: e.target.value })}
                      placeholder="Segundo apellido"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-gray-600 mb-1 block">NIF/CIF</Label>
                  <Input
                    value={nuevoCliente.nif}
                    onChange={(e) => onNuevoClienteChange({ nif: e.target.value.toUpperCase() })}
                    placeholder="12345678A"
                    className="font-mono"
                  />
                </div>

                <div>
                  <Label className="text-xs text-gray-600 mb-1 block">Email</Label>
                  <Input
                    type="email"
                    value={nuevoCliente.email}
                    onChange={(e) => onNuevoClienteChange({ email: e.target.value })}
                    placeholder="cliente@email.com"
                  />
                </div>
              </>
            )}

            <Button
              type="button"
              size="xl"
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
        </DialogContent>
      </Dialog>
    </>
  )
}
