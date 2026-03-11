'use client'

/**
 * Factura Rápida (Serie FS)
 * Pantalla mobile-first para emitir facturas simplificadas sin orden previa.
 *
 * Flujo:
 *  1. Seleccionar plantilla (o añadir línea manual)
 *  2. Ajustar precio si es necesario
 *  3. Introducir matrícula (autocompletado desde vehiculos del taller)
 *  4. Si total > 400€ → seleccionar cliente con NIF+dirección
 *  5. Elegir método de pago
 *  6. Emitir → FS-2026-XXX
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft, Zap, Plus, X, Check, Loader2, Car, User,
  AlertTriangle, Printer, ChevronDown, ChevronUp, Search
} from 'lucide-react'
import { toast } from 'sonner'
import { NuevoVehiculoModal, nifParecematricula } from '@/components/dashboard/facturas/NuevoVehiculoModal'

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface LineaItem {
  concepto: string
  descripcion?: string
  cantidad: number
  precio_unitario: number
}

interface Plantilla {
  id: string
  nombre: string
  descripcion_operacion?: string
  lineas_items: LineaItem[]
  precio_total_estimado: number
}

interface VehiculoSugerido {
  id: string
  matricula: string
  marca?: string
  modelo?: string
  cliente_id?: string
  clientes?: { nombre: string }
}

interface ClienteOption {
  id: string
  nombre: string
  nif?: string
  direccion?: string
}

type MetodoPagoSimple = 'E' | 'T' | 'B'
type MetodoPago = MetodoPagoSimple | 'M'

const NOMBRES_METODO: Record<MetodoPagoSimple, string> = { E: 'Efectivo', T: 'Tarjeta', B: 'Bizum' }

// ─── Constante de límite ─────────────────────────────────────────────────────
const LIMITE_SIN_CLIENTE = 400
const IVA_DEFAULT = 21

// ─── Utilidad: guardarraíl NIF ───────────────────────────────────────────────
function WarningNif({ nif }: { nif: string }) {
  if (!nif || !nifParecematricula(nif)) return null
  return (
    <p className="text-amber-600 text-xs mt-1 flex items-center gap-1">
      <AlertTriangle className="w-3 h-3" />
      Esto parece una matrícula. Por favor, regístrala como Vehículo.
    </p>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function FacturaRapidaPage() {
  // Plantillas
  const [plantillas, setPlantillas] = useState<Plantilla[]>([])
  const [loadingPlantillas, setLoadingPlantillas] = useState(true)

  // Líneas de la factura
  const [lineas, setLineas] = useState<LineaItem[]>([])
  const [mostrarLineaManual, setMostrarLineaManual] = useState(false)
  const [lineaManual, setLineaManual] = useState<LineaItem>({
    concepto: '', descripcion: '', cantidad: 1, precio_unitario: 0
  })

  // Vehículo
  const [matriculaInput, setMatriculaInput] = useState('')
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState<VehiculoSugerido | null>(null)
  const [sugerenciasVehiculo, setSugerenciasVehiculo] = useState<VehiculoSugerido[]>([])
  const [buscandoVehiculo, setBuscandoVehiculo] = useState(false)
  const [mostrarModal, setMostrarModal] = useState(false)

  // Cliente (requerido si total > 400€)
  const [clientes, setClientes] = useState<ClienteOption[]>([])
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteOption | null>(null)
  const [busquedaCliente, setBusquedaCliente] = useState('')
  const [loadingClientes, setLoadingClientes] = useState(false)

  // Método de pago
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('E')

  // Pago mixto (partido entre dos métodos)
  const [metodoPago1, setMetodoPago1] = useState<MetodoPagoSimple>('E')
  const [importe1, setImporte1] = useState(0)
  const [metodoPago2, setMetodoPago2] = useState<MetodoPagoSimple>('B')

  // Emisión
  const [emitiendo, setEmitiendo] = useState(false)
  const [resultado, setResultado] = useState<{
    numero_factura: string
    total: number
    fecha: string
    base_imponible: number
    iva: number
  } | null>(null)

  const matriculaDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  // ── Cálculos derivados ─────────────────────────────────────────────────────
  const baseImponible = lineas.reduce(
    (s, l) => s + l.cantidad * l.precio_unitario, 0
  )
  const iva = baseImponible * (IVA_DEFAULT / 100)
  const total = baseImponible + iva
  const requiereCliente = total > LIMITE_SIN_CLIENTE

  // Pago mixto: el segundo importe es el resto
  const importe2 = Math.max(0, Math.round((total - importe1) * 100) / 100)
  // String descriptivo que se envía al API (acepta texto libre en metodo_pago)
  const metodoPagoEnviar = metodoPago === 'M'
    ? `${NOMBRES_METODO[metodoPago1]} ${importe1.toFixed(2)}€ + ${NOMBRES_METODO[metodoPago2]} ${importe2.toFixed(2)}€`
    : metodoPago

  // ── Cargar plantillas ──────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/plantillas-rapidas')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setPlantillas(data)
      })
      .catch(() => toast.error('No se pudieron cargar las plantillas'))
      .finally(() => setLoadingPlantillas(false))
  }, [])

  // ── Cargar clientes cuando se necesite ────────────────────────────────────
  useEffect(() => {
    if (!requiereCliente || clientes.length > 0) return
    setLoadingClientes(true)
    fetch('/api/clientes/obtener')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setClientes(data)
      })
      .catch(() => toast.error('No se pudieron cargar los clientes'))
      .finally(() => setLoadingClientes(false))
  }, [requiereCliente, clientes.length])

  // ── Buscar vehículo por matrícula (debounced) ─────────────────────────────
  const buscarVehiculo = useCallback((valor: string) => {
    if (matriculaDebounce.current) clearTimeout(matriculaDebounce.current)
    if (valor.length < 2) { setSugerenciasVehiculo([]); return }
    matriculaDebounce.current = setTimeout(async () => {
      setBuscandoVehiculo(true)
      try {
        const res = await fetch(`/api/vehiculos?matricula=${encodeURIComponent(valor)}`)
        const data = await res.json()
        setSugerenciasVehiculo(Array.isArray(data) ? data.slice(0, 5) : [])
      } catch {
        // silencioso — el usuario puede seguir escribiendo manualmente
      } finally {
        setBuscandoVehiculo(false)
      }
    }, 300)
  }, [])

  const handleMatriculaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().replace(/\s/g, '')
    setMatriculaInput(val)
    setVehiculoSeleccionado(null)
    buscarVehiculo(val)
  }

  const seleccionarVehiculo = (v: VehiculoSugerido) => {
    setVehiculoSeleccionado(v)
    setMatriculaInput(v.matricula)
    setSugerenciasVehiculo([])
  }

  // ── Aplicar plantilla ─────────────────────────────────────────────────────
  const aplicarPlantilla = (p: Plantilla) => {
    if (lineas.length > 0) {
      // Sustituir o añadir — preguntamos implícitamente añadiendo
      setLineas(prev => [...prev, ...p.lineas_items])
    } else {
      setLineas(p.lineas_items)
    }
    toast.success(`"${p.nombre}" añadida`)
  }

  // ── Editar línea ─────────────────────────────────────────────────────────
  const actualizarPrecioLinea = (idx: number, precio: number) => {
    setLineas(prev => prev.map((l, i) => i === idx ? { ...l, precio_unitario: precio } : l))
  }

  const eliminarLinea = (idx: number) => {
    setLineas(prev => prev.filter((_, i) => i !== idx))
  }

  // ── Añadir línea manual ───────────────────────────────────────────────────
  const addLineaManual = () => {
    if (!lineaManual.concepto.trim()) {
      toast.error('El concepto es obligatorio')
      return
    }
    setLineas(prev => [...prev, { ...lineaManual }])
    setLineaManual({ concepto: '', descripcion: '', cantidad: 1, precio_unitario: 0 })
    setMostrarLineaManual(false)
  }

  // ── Emitir ────────────────────────────────────────────────────────────────
  const emitir = async () => {
    const matriculaFinal = matriculaInput.trim()
    if (!matriculaFinal) {
      toast.error('La matrícula es obligatoria')
      return
    }
    if (lineas.length === 0) {
      toast.error('Añade al menos una operación')
      return
    }
    if (requiereCliente && !clienteSeleccionado) {
      toast.error('Para importes > 400€ debes seleccionar el cliente')
      return
    }

    setEmitiendo(true)
    try {
      const res = await fetch('/api/facturas/rapida', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matricula: matriculaFinal,
          vehiculo_id: vehiculoSeleccionado?.id ?? null,
          cliente_id: clienteSeleccionado?.id ?? null,
          lineas_items: lineas,
          iva_porcentaje: IVA_DEFAULT,
          metodo_pago: metodoPagoEnviar,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Error al emitir la factura')
        return
      }

      setResultado({
        numero_factura: data.numero_factura,
        total: data.total,
        fecha: data.fecha,
        base_imponible: data.base_imponible,
        iva: data.iva,
      })
    } catch {
      toast.error('Error de conexión')
    } finally {
      setEmitiendo(false)
    }
  }

  // ── Imprimir ──────────────────────────────────────────────────────────────
  const imprimir = () => window.print()

  // ── Pantalla de éxito ─────────────────────────────────────────────────────
  if (resultado) {
    return (
      <div className="max-w-sm mx-auto space-y-4 py-6">
        <div
          ref={printRef}
          className="bg-white border-2 border-gray-200 rounded-2xl p-6 space-y-4 print:border-0 print:p-0"
        >
          {/* Cabecera recibo */}
          <div className="text-center border-b pb-4">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Check className="w-7 h-7 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Factura Emitida</h2>
            <p className="text-3xl font-black text-emerald-600 mt-1">
              {resultado.numero_factura}
            </p>
            <p className="text-gray-500 text-sm mt-1">{resultado.fecha}</p>
          </div>

          {/* Vehículo */}
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3">
            <Car className="w-4 h-4 text-gray-500" />
            <span className="font-mono font-bold tracking-wider text-gray-900">
              {matriculaInput}
            </span>
            {vehiculoSeleccionado?.marca && (
              <span className="text-gray-500 text-sm">
                {vehiculoSeleccionado.marca} {vehiculoSeleccionado.modelo}
              </span>
            )}
          </div>

          {/* Líneas */}
          <div className="space-y-1">
            {lineas.map((l, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-700">{l.concepto} × {l.cantidad}</span>
                <span className="font-medium">{(l.cantidad * l.precio_unitario).toFixed(2)} €</span>
              </div>
            ))}
          </div>

          {/* Totales */}
          <div className="border-t pt-3 space-y-1">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Base imponible</span>
              <span>{resultado.base_imponible.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>IVA ({IVA_DEFAULT}%)</span>
              <span>{resultado.iva.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span>TOTAL</span>
              <span className="text-emerald-600">{resultado.total.toFixed(2)} €</span>
            </div>
          </div>

          {/* Método de pago */}
          <div className="text-center text-xs text-gray-400">
            {metodoPago === 'M'
              ? `${NOMBRES_METODO[metodoPago1]} ${importe1.toFixed(2)}€ + ${NOMBRES_METODO[metodoPago2]} ${importe2.toFixed(2)}€`
              : `Pago: ${NOMBRES_METODO[metodoPago as MetodoPagoSimple]}`
            }
          </div>
        </div>

        {/* Acciones post-emisión */}
        <div className="grid grid-cols-2 gap-3 print:hidden">
          <Button onClick={imprimir} variant="outline" className="gap-2">
            <Printer className="w-4 h-4" />
            Imprimir
          </Button>
          <Button
            onClick={() => {
              setResultado(null)
              setLineas([])
              setMatriculaInput('')
              setVehiculoSeleccionado(null)
              setClienteSeleccionado(null)
              setBusquedaCliente('')
            }}
            className="bg-violet-600 hover:bg-violet-700 gap-2"
          >
            <Zap className="w-4 h-4" />
            Nueva
          </Button>
        </div>
        <Link href="/dashboard/facturas" className="block text-center text-sm text-gray-500 underline print:hidden">
          Ver todas las facturas
        </Link>
      </div>
    )
  }

  // ── Pantalla principal ────────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/facturas">
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Factura Rápida</h1>
          <p className="text-sm text-gray-500">Serie FS · Sin orden previa</p>
        </div>
      </div>

      {/* ── BLOQUE 1: Plantillas ──────────────────────────────────────────── */}
      <Card className="p-4">
        <h2 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-violet-500" />
          Operaciones rápidas
        </h2>

        {loadingPlantillas ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {plantillas.map(p => (
              <button
                key={p.id}
                onClick={() => aplicarPlantilla(p)}
                className="text-left p-3 rounded-xl border-2 border-gray-100 hover:border-violet-300 hover:bg-violet-50 active:scale-95 transition-all"
              >
                <p className="font-semibold text-gray-900 text-sm">{p.nombre}</p>
                <p className="text-violet-600 font-bold text-base mt-0.5">
                  {p.precio_total_estimado.toFixed(0)} €
                </p>
                {p.descripcion_operacion && (
                  <p className="text-gray-400 text-xs mt-0.5 line-clamp-1">{p.descripcion_operacion}</p>
                )}
              </button>
            ))}

            {/* Botón línea manual */}
            <button
              onClick={() => setMostrarLineaManual(true)}
              className="p-3 rounded-xl border-2 border-dashed border-gray-200 hover:border-gray-300 hover:bg-gray-50 active:scale-95 transition-all flex flex-col items-center justify-center gap-1 text-gray-400"
            >
              <Plus className="w-5 h-5" />
              <span className="text-xs font-medium">Personalizado</span>
            </button>
          </div>
        )}

        {/* Línea manual inline */}
        {mostrarLineaManual && (
          <div className="mt-3 p-3 bg-gray-50 rounded-xl space-y-3 border border-gray-200">
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-3">
                <Label className="text-xs">Concepto *</Label>
                <Input
                  placeholder="Ej: Diagnóstico"
                  value={lineaManual.concepto}
                  onChange={e => setLineaManual(p => ({ ...p, concepto: e.target.value }))}
                  className="h-8 text-sm"
                  autoFocus
                />
              </div>
              <div>
                <Label className="text-xs">Cant.</Label>
                <Input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={lineaManual.cantidad}
                  onChange={e => setLineaManual(p => ({ ...p, cantidad: parseFloat(e.target.value) || 1 }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Precio unitario (€ sin IVA)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={lineaManual.precio_unitario}
                  onChange={e => setLineaManual(p => ({ ...p, precio_unitario: parseFloat(e.target.value) || 0 }))}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={addLineaManual} className="flex-1">Añadir</Button>
              <Button size="sm" variant="outline" onClick={() => setMostrarLineaManual(false)}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ── BLOQUE 2: Resumen de líneas ───────────────────────────────────── */}
      {lineas.length > 0 && (
        <Card className="p-4">
          <h2 className="font-semibold text-gray-700 mb-3">Resumen</h2>
          <div className="space-y-2">
            {lineas.map((l, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{l.concepto}</p>
                  <p className="text-xs text-gray-400">× {l.cantidad}</p>
                </div>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={l.precio_unitario}
                  onChange={e => actualizarPrecioLinea(idx, parseFloat(e.target.value) || 0)}
                  className="w-24 h-8 text-sm text-right"
                />
                <span className="text-xs text-gray-500 w-4">€</span>
                <button
                  onClick={() => eliminarLinea(idx)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Totales */}
          <div className="border-t mt-3 pt-3 space-y-1">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Base imponible</span>
              <span>{baseImponible.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>IVA ({IVA_DEFAULT}%)</span>
              <span>{iva.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span>TOTAL</span>
              <span className={total > LIMITE_SIN_CLIENTE ? 'text-amber-600' : 'text-gray-900'}>
                {total.toFixed(2)} €
              </span>
            </div>
            {total > LIMITE_SIN_CLIENTE && (
              <p className="text-amber-600 text-xs flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Supera {LIMITE_SIN_CLIENTE}€ — se requiere cliente identificado
              </p>
            )}
          </div>
        </Card>
      )}

      {/* ── BLOQUE 3: Datos del cobro ─────────────────────────────────────── */}
      <Card className="p-4 space-y-4">
        <h2 className="font-semibold text-gray-700 flex items-center gap-2">
          <Car className="w-4 h-4 text-sky-500" />
          Datos del cobro
        </h2>

        {/* Matrícula */}
        <div className="relative">
          <Label>Matrícula *</Label>
          <div className="relative">
            <Input
              value={matriculaInput}
              onChange={handleMatriculaChange}
              placeholder="1234ABC"
              className="font-mono text-lg tracking-widest uppercase pr-8"
              autoComplete="off"
            />
            {buscandoVehiculo && (
              <Loader2 className="absolute right-2 top-2.5 w-4 h-4 animate-spin text-gray-400" />
            )}
            {!buscandoVehiculo && matriculaInput && (
              <Search className="absolute right-2 top-2.5 w-4 h-4 text-gray-300" />
            )}
          </div>

          {/* Sugerencias */}
          {sugerenciasVehiculo.length > 0 && (
            <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 overflow-hidden">
              {sugerenciasVehiculo.map(v => (
                <button
                  key={v.id}
                  onClick={() => seleccionarVehiculo(v)}
                  className="w-full text-left px-4 py-2.5 hover:bg-sky-50 border-b border-gray-100 last:border-0 flex items-center gap-3"
                >
                  <Car className="w-4 h-4 text-sky-500 flex-shrink-0" />
                  <div>
                    <p className="font-mono font-bold text-gray-900 text-sm">{v.matricula}</p>
                    {(v.marca || v.modelo) && (
                      <p className="text-gray-500 text-xs">{v.marca} {v.modelo}</p>
                    )}
                  </div>
                </button>
              ))}
              <button
                onClick={() => { setSugerenciasVehiculo([]); setMostrarModal(true) }}
                className="w-full text-left px-4 py-2.5 text-sky-600 text-sm font-medium hover:bg-sky-50 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Dar de alta como nuevo vehículo
              </button>
            </div>
          )}

          {/* Vehículo seleccionado */}
          {vehiculoSeleccionado && (
            <div className="mt-1 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-1.5">
              <Check className="w-3 h-3" />
              {vehiculoSeleccionado.marca} {vehiculoSeleccionado.modelo} — en tu taller
            </div>
          )}

          {/* Botón nuevo vehículo si no hay sugerencias */}
          {matriculaInput.length >= 4 && !vehiculoSeleccionado && sugerenciasVehiculo.length === 0 && !buscandoVehiculo && (
            <button
              onClick={() => setMostrarModal(true)}
              className="mt-1 text-xs text-sky-600 underline flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              Dar de alta como nuevo vehículo
            </button>
          )}
        </div>

        {/* Método de pago */}
        <div>
          <Label>Método de pago</Label>
          <div className="grid grid-cols-4 gap-2 mt-1">
            {(['E', 'T', 'B'] as MetodoPagoSimple[]).map(code => (
              <button
                key={code}
                onClick={() => setMetodoPago(code)}
                className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all active:scale-95 ${
                  metodoPago === code
                    ? 'border-violet-500 bg-violet-50 text-violet-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {NOMBRES_METODO[code]}
              </button>
            ))}
            <button
              onClick={() => {
                setMetodoPago('M')
                // Inicializar importe1 al 50% del total actual
                setImporte1(Math.round(total / 2 * 100) / 100)
              }}
              className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all active:scale-95 ${
                metodoPago === 'M'
                  ? 'border-violet-500 bg-violet-50 text-violet-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              Mixto
            </button>
          </div>

          {/* Panel de pago partido — solo visible cuando se selecciona Mixto */}
          {metodoPago === 'M' && (
            <div className="mt-3 p-3 bg-violet-50 rounded-xl border border-violet-200 space-y-2">
              <p className="text-xs text-violet-700 font-semibold mb-1">Detalle del pago mixto</p>

              {/* Primer pago */}
              <div className="flex items-center gap-2">
                <select
                  value={metodoPago1}
                  onChange={e => setMetodoPago1(e.target.value as MetodoPagoSimple)}
                  className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg bg-white w-28"
                >
                  {(['E', 'T', 'B'] as MetodoPagoSimple[]).map(c => (
                    <option key={c} value={c}>{NOMBRES_METODO[c]}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  max={total}
                  step={0.01}
                  value={importe1}
                  onChange={e => setImporte1(Math.min(total, Math.max(0, parseFloat(e.target.value) || 0)))}
                  className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-lg text-right bg-white"
                />
                <span className="text-sm text-gray-500">€</span>
              </div>

              {/* Segundo pago (resto automático) */}
              <div className="flex items-center gap-2">
                <select
                  value={metodoPago2}
                  onChange={e => setMetodoPago2(e.target.value as MetodoPagoSimple)}
                  className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg bg-white w-28"
                >
                  {(['E', 'T', 'B'] as MetodoPagoSimple[]).map(c => (
                    <option key={c} value={c}>{NOMBRES_METODO[c]}</option>
                  ))}
                </select>
                <div className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg text-right bg-gray-100 text-gray-700 font-medium">
                  {importe2.toFixed(2)}
                </div>
                <span className="text-sm text-gray-500">€</span>
              </div>

              {/* Validación visual */}
              {Math.abs(importe1 + importe2 - total) > 0.01 && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Los importes no suman el total ({total.toFixed(2)} €)
                </p>
              )}
            </div>
          )}
        </div>

        {/* Selector de cliente (solo si total > 400€) */}
        {requiereCliente && (
          <div className="border-t pt-4">
            <Label className="flex items-center gap-1.5 text-amber-700">
              <User className="w-3.5 h-3.5" />
              Cliente (obligatorio — total &gt; {LIMITE_SIN_CLIENTE}€)
            </Label>

            {loadingClientes ? (
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Cargando clientes...
              </div>
            ) : (
              <>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <Input
                    value={busquedaCliente}
                    onChange={e => setBusquedaCliente(e.target.value)}
                    placeholder="Buscar cliente..."
                    className="pl-9"
                  />
                </div>

                <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                  {clientes
                    .filter(c => !busquedaCliente || c.nombre.toLowerCase().includes(busquedaCliente.toLowerCase()) || (c.nif && c.nif.includes(busquedaCliente.toUpperCase())))
                    .slice(0, 8)
                    .map(c => {
                      const tieneNif = !!c.nif && !nifParecematricula(c.nif)
                      const tieneDireccion = !!c.direccion
                      const completo = tieneNif && tieneDireccion
                      return (
                        <button
                          key={c.id}
                          onClick={() => completo ? setClienteSeleccionado(c) : toast.warning('Este cliente no tiene NIF o dirección registrados')}
                          className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-all ${
                            clienteSeleccionado?.id === c.id
                              ? 'border-violet-400 bg-violet-50'
                              : completo
                                ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                : 'border-gray-100 opacity-60 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-900">{c.nombre}</span>
                            {completo
                              ? <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">OK</Badge>
                              : <Badge className="bg-amber-100 text-amber-700 text-[10px]">Incompleto</Badge>
                            }
                          </div>
                          {c.nif && <WarningNif nif={c.nif} />}
                          {!tieneNif && <p className="text-xs text-amber-600 mt-0.5">Sin NIF registrado</p>}
                          {!tieneDireccion && <p className="text-xs text-amber-600 mt-0.5">Sin dirección registrada</p>}
                        </button>
                      )
                    })}
                </div>

                {clienteSeleccionado && (
                  <div className="mt-2 flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm">
                    <span className="font-medium text-emerald-800">{clienteSeleccionado.nombre}</span>
                    <button onClick={() => setClienteSeleccionado(null)} className="text-emerald-500 hover:text-emerald-700">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Card>

      {/* ── Botón emitir ──────────────────────────────────────────────────── */}
      <Button
        onClick={emitir}
        disabled={
          emitiendo ||
          lineas.length === 0 ||
          !matriculaInput.trim() ||
          (requiereCliente && !clienteSeleccionado)
        }
        className="w-full py-5 text-lg font-bold bg-violet-600 hover:bg-violet-700 active:bg-violet-800 min-h-[56px] shadow-md gap-3"
      >
        {emitiendo ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Zap className="w-5 h-5" />
        )}
        {emitiendo
          ? 'Emitiendo...'
          : lineas.length === 0
            ? 'Selecciona una operación'
            : `Emitir FS — ${total.toFixed(2)} €`
        }
      </Button>

      {/* Texto de ayuda legal */}
      <p className="text-center text-xs text-gray-400">
        Facturas simplificadas · Serie FS · IVA {IVA_DEFAULT}% incluido
        {requiereCliente && ' · Identificación de cliente requerida (>400€)'}
      </p>

      {/* Modal nuevo vehículo */}
      <NuevoVehiculoModal
        open={mostrarModal}
        onClose={() => setMostrarModal(false)}
        matriculaInicial={matriculaInput}
        onCreado={(v) => {
          setVehiculoSeleccionado(v)
          setMatriculaInput(v.matricula)
          setSugerenciasVehiculo([])
        }}
      />
    </div>
  )
}
