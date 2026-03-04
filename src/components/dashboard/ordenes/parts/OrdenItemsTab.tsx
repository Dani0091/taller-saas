/**
 * @fileoverview Tab de Items (Elementos de facturación)
 * @description Lista de líneas de trabajo y formularios de añadir
 * REGLAS:
 * - Sin createClient() - solo Server Actions
 * - ⚠️ Cálculo temporal del subtotal en añadir línea (se recalcula en servidor)
 * - Componente pasivo que recibe props
 */
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Plus, Trash2, Mic, MicOff, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { NumberInput } from '@/components/ui/number-input'
import { FRACCIONES_HORA, CANTIDADES } from '@/lib/constants'
import { OrdenTotalSummary } from './OrdenTotalSummary'
import { TotalesOrdenDTO } from '@/application/dtos/orden.dto'

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

interface NuevaLinea {
  tipo: TipoLinea
  descripcion: string
  cantidad: number
  precio_unitario: number
}

interface PiezaRapida {
  tipo: string
  descripcion: string
  cantidad: number
  precio: number
}

interface OrdenItemsTabProps {
  // Datos
  lineas: Linea[]
  nuevaLinea: NuevaLinea
  piezaRapida: PiezaRapida
  tarifaHora: number
  totales: TotalesOrdenDTO

  // Callbacks para nueva línea
  onNuevaLineaChange: (linea: NuevaLinea) => void
  onAgregarLinea: () => void

  // Callbacks para líneas existentes
  onActualizarLinea: (id: string, campo: 'cantidad' | 'precio_unitario' | 'estado', valor: number | string) => void
  onEliminarLinea: (id: string) => void

  // Callbacks para pieza rápida
  onPiezaRapidaChange: (pieza: PiezaRapida) => void
  onAgregarPiezaRapida: () => void
}

/** Extrae cantidad y descripción de un texto dictado por voz.
 *  Ejemplos:
 *    "3 filtros de aceite"     → { cantidad: 3,   descripcion: "filtros de aceite" }
 *    "dos pastillas de freno"  → { cantidad: 2,   descripcion: "pastillas de freno" }
 *    "cambio de aceite"        → { cantidad: 1,   descripcion: "cambio de aceite" }
 */
function parsearVoz(texto: string): { cantidad: number; descripcion: string } {
  const palabrasNumericas: Record<string, number> = {
    un: 1, uno: 1, una: 1,
    dos: 2, tres: 3, cuatro: 4, cinco: 5,
    seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  }
  const texto2 = texto.trim()
  // Número al inicio (entero o decimal)
  const matchNum = texto2.match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/)
  if (matchNum) {
    return {
      cantidad: parseFloat(matchNum[1].replace(',', '.')),
      descripcion: matchNum[2].trim(),
    }
  }
  // Palabra numérica al inicio
  const palabras = texto2.toLowerCase().split(/\s+/)
  const primeraPalabra = palabras[0]
  if (palabrasNumericas[primeraPalabra]) {
    return {
      cantidad: palabrasNumericas[primeraPalabra],
      descripcion: palabras.slice(1).join(' ').trim() || texto2,
    }
  }
  return { cantidad: 1, descripcion: texto2 }
}

export function OrdenItemsTab({
  lineas,
  nuevaLinea,
  piezaRapida,
  tarifaHora,
  totales,
  onNuevaLineaChange,
  onAgregarLinea,
  onActualizarLinea,
  onEliminarLinea,
  onPiezaRapidaChange,
  onAgregarPiezaRapida,
}: OrdenItemsTabProps) {
  const [escuchando, setEscuchando] = useState(false)
  const [vozError, setVozError] = useState<string | null>(null)
  const recognitionRef = useRef<any>(null)

  // Limpia el error después de 4s
  useEffect(() => {
    if (vozError) {
      const t = setTimeout(() => setVozError(null), 4000)
      return () => clearTimeout(t)
    }
  }, [vozError])

  const iniciarVoz = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setVozError('Tu navegador no soporta reconocimiento de voz')
      return
    }
    const rec = new SpeechRecognition()
    rec.lang = 'es-ES'
    rec.interimResults = false
    rec.maxAlternatives = 1
    recognitionRef.current = rec

    rec.onstart = () => setEscuchando(true)
    rec.onend = () => setEscuchando(false)
    rec.onerror = (e: any) => {
      setEscuchando(false)
      if (e.error === 'not-allowed' || e.error === 'permission-denied') {
        setVozError('Por favor, permite el acceso al micrófono para dictar')
      } else if (e.error === 'network') {
        setVozError('Sin conexión para reconocimiento de voz. Comprueba la red.')
      } else if (e.error !== 'no-speech') {
        setVozError('Error de voz: ' + e.error)
      }
    }
    rec.onresult = (e: any) => {
      const texto = e.results[0][0].transcript
      const { cantidad, descripcion } = parsearVoz(texto)
      onNuevaLineaChange({
        ...nuevaLinea,
        descripcion,
        cantidad,
        // Auto-precio si es mano de obra
        precio_unitario: nuevaLinea.tipo === 'mano_obra' && nuevaLinea.precio_unitario === 0
          ? tarifaHora
          : nuevaLinea.precio_unitario,
      })
    }
    rec.start()
  }, [nuevaLinea, onNuevaLineaChange, tarifaHora])

  const detenerVoz = useCallback(() => {
    recognitionRef.current?.stop()
    setEscuchando(false)
  }, [])

  return (
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
                onNuevaLineaChange({
                  ...nuevaLinea,
                  tipo: nuevoTipo,
                  // Auto-rellenar precio si es mano de obra
                  precio_unitario: nuevoTipo === 'mano_obra' ? tarifaHora : 0
                })
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
            <div className="flex gap-2">
              <Input
                value={nuevaLinea.descripcion}
                onChange={(e) => onNuevaLineaChange({ ...nuevaLinea, descripcion: e.target.value })}
                placeholder="Ej: Cambio de aceite y filtro"
                className="flex-1"
              />
              <button
                type="button"
                onClick={escuchando ? detenerVoz : iniciarVoz}
                title={escuchando ? 'Detener dictado' : 'Dictar descripción por voz'}
                className={`shrink-0 h-10 w-10 flex items-center justify-center rounded-lg border transition-all ${
                  escuchando
                    ? 'bg-red-500 border-red-500 text-white animate-pulse'
                    : 'bg-white border-gray-300 text-gray-500 hover:border-sky-400 hover:text-sky-600'
                }`}
              >
                {escuchando ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>
            {escuchando && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                Escuchando… di la cantidad y la descripción
              </p>
            )}
            {vozError && (
              <p className="text-xs text-amber-600 mt-1">{vozError}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-gray-600 mb-1 block">
                {nuevaLinea.tipo === 'mano_obra' ? '⏱️ Horas de trabajo' : '📦 Cantidad (uds)'}
              </Label>
              {nuevaLinea.tipo === 'mano_obra' ? (
                <select
                  value={nuevaLinea.cantidad}
                  onChange={(e) => onNuevaLineaChange({ ...nuevaLinea, cantidad: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-sky-500 bg-white text-center"
                >
                  {FRACCIONES_HORA.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              ) : (
                <select
                  value={nuevaLinea.cantidad}
                  onChange={(e) => onNuevaLineaChange({ ...nuevaLinea, cantidad: parseFloat(e.target.value) })}
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
              <NumberInput
                value={nuevaLinea.precio_unitario}
                onChange={(value) => {
                  if (value != null) {
                    onNuevaLineaChange({ ...nuevaLinea, precio_unitario: value })
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

          <Button onClick={onAgregarLinea} className="w-full gap-2 bg-sky-600 hover:bg-sky-700">
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
                      <NumberInput
                        value={linea.cantidad}
                        onChange={(value) => onActualizarLinea(linea.id, 'cantidad', value ?? 0)}
                        className="w-12 px-1 py-0.5 text-xs border border-gray-300 rounded text-center"
                        min={0.01}
                        step={linea.tipo === 'mano_obra' ? 0.25 : 1}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500">€</span>
                        <NumberInput
                          value={linea.precio_unitario}
                          onChange={(value) => onActualizarLinea(linea.id, 'precio_unitario', value ?? 0)}
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
                          onChange={(e) => onActualizarLinea(linea.id, 'estado', e.target.value)}
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
                        onClick={() => onEliminarLinea(linea.id)}
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
                onChange={(e) => onPiezaRapidaChange({ ...piezaRapida, tipo: e.target.value })}
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
                onChange={(e) => onPiezaRapidaChange({ ...piezaRapida, descripcion: e.target.value })}
                className="col-span-5 text-xs px-2 py-1 border border-gray-300 rounded"
              />
              <NumberInput
                value={piezaRapida.cantidad}
                onChange={(value) => onPiezaRapidaChange({ ...piezaRapida, cantidad: value ?? 1 })}
                placeholder="Cant"
                className="col-span-1 text-xs"
                min={1}
                step={piezaRapida.tipo === 'mano_obra' ? 0.25 : 1}
              />
              <NumberInput
                value={piezaRapida.precio || 0}
                onChange={(value) => onPiezaRapidaChange({ ...piezaRapida, precio: value ?? 0 })}
                placeholder="Precio"
                className="col-span-2 text-xs"
                min={0}
                step={0.01}
              />
              <Button
                size="sm"
                onClick={onAgregarPiezaRapida}
                className="col-span-2 h-7 text-xs"
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Resumen de totales con componente extraído */}
      <OrdenTotalSummary totales={totales} />
    </>
  )
}
