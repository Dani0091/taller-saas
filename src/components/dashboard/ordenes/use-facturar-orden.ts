/**
 * @fileoverview Facturar desde la ficha de orden
 * @description Borrador editable, emisión directa y cobro rápido. Antes de
 * facturar se guarda la orden. Extraído sin cambios de detalle-orden-sheet.
 */
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { datosOrdenFicha, type FormularioOrden } from '@/lib/ordenes/ficha-datos'
import { guardarOrdenFicha } from './ficha-api'

interface Opciones {
  ordenSeleccionada?: string | null
  tallerId: string
  formData: FormularioOrden
  serieSeleccionada: string
  setGuardando: (guardando: boolean) => void
  onActualizar: () => void
}

export function useFacturarOrden({
  ordenSeleccionada, tallerId, formData, serieSeleccionada, setGuardando, onActualizar,
}: Opciones) {
  const router = useRouter()
  const [generandoFactura, setGenerandoFactura] = useState(false)

  // Función auxiliar para guardar orden antes de facturar
  const guardarOrdenAntesDeFacturar = async () => {
    if (!ordenSeleccionada) return false

    try {
      await guardarOrdenFicha(ordenSeleccionada, datosOrdenFicha(formData))
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
          taller_id: tallerId,
          serie: serieSeleccionada || undefined
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
          taller_id: tallerId,
          serie: serieSeleccionada || undefined
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

  // Cobro Rápido — Factura simplificada (< 3000€)
  const cobroRapido = async () => {
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
      toast.loading('Procesando cobro rápido...')
      const res = await fetch('/api/facturas/cobro-rapido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orden_id: ordenSeleccionada, serie: serieSeleccionada || undefined }),
      })
      const data = await res.json()
      toast.dismiss()

      if (!res.ok) {
        throw new Error(data.error || 'Error en cobro rápido')
      }

      toast.success(`⚡ ${data.message || `Factura ${data.numero_factura} emitida y pagada`}`)
      onActualizar()
      router.push(`/dashboard/facturas?ref=${data.id}`)
    } catch (error: any) {
      toast.dismiss()
      toast.error(error.message)
    } finally {
      setGenerandoFactura(false)
    }
  }

  return { generandoFactura, crearBorradorFactura, emitirFacturaDirecta, cobroRapido }
}
