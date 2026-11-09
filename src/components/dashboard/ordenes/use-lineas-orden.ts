/**
 * @fileoverview Líneas de la ficha de orden
 * @description Estado de las líneas, la línea nueva, el añadido rápido y los
 * totales. En una orden ya creada cada cambio se guarda al momento por la API;
 * en el asistente se quedan en memoria hasta crear la orden.
 * Extraído sin cambios de detalle-orden-sheet.
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { calcularTotalesOrdenAction } from '@/actions/ordenes/calcular-totales-orden.action'
import type { TotalesOrdenDTO } from '@/application/dtos/orden.dto'
import { añadirLineaFicha, actualizarLineaFicha, borrarLineaFicha } from './ficha-api'

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

export type { TipoLinea, Linea }

interface Opciones {
  ordenSeleccionada?: string | null
  modoCrear: boolean
  ordenBloqueada: boolean
  tarifaHora: number
  ivaConfigTaller: number
  /** El % de IVA de la orden (toggle «Aplicar IVA») */
  ivaPorcentajeOrden?: number
}

export function useLineasOrden({
  ordenSeleccionada, modoCrear, ordenBloqueada, tarifaHora, ivaConfigTaller, ivaPorcentajeOrden,
}: Opciones) {
  const [lineas, setLineas] = useState<Linea[]>([])
  const [piezaRapida, setPiezaRapida] = useState({ tipo: 'pieza', descripcion: '', cantidad: 1, precio: 0 })
  const [totales, setTotales] = useState<TotalesOrdenDTO>({
    manoObra: 0,
    piezas: 0,
    servicios: 0,
    subtotal: 0,
    iva: 0,
    total: 0,
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

  // El tipo por defecto ya es 'mano_obra', así que el auto-relleno de precio del
  // <select> (que solo dispara en su onChange) nunca se ejecuta para ese caso inicial.
  // Sincronizamos aquí mientras el usuario no haya tocado el precio manualmente.
  useEffect(() => {
    if (nuevaLinea.tipo === 'mano_obra' && nuevaLinea.precio_unitario === 0) {
      setNuevaLinea(prev => ({ ...prev, precio_unitario: tarifaHora }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tarifaHora])

  // Cargar totales calculados en el servidor
  const cargarTotales = useCallback(async () => {
    if (!ordenSeleccionada || modoCrear) {
      // En modo crear, calcular totales localmente temporalmente
      // hasta que se guarde la orden y tengamos un ID
      // El % de IVA de la orden (toggle "Aplicar IVA") manda para todas las líneas,
      // salvo los suplidos, que por normativa siempre van al 0% independientemente del toggle.
      const ivaOrdenPct = ivaPorcentajeOrden ?? ivaConfigTaller
      const totalesTemp = lineas.reduce(
        (acc, linea) => {
          const subtotal = linea.cantidad * linea.precio_unitario
          const ivaPctLinea = linea.tipo === 'suplido' ? 0 : ivaOrdenPct
          const iva = subtotal * (ivaPctLinea / 100)
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
  }, [ordenSeleccionada, modoCrear, lineas, ivaConfigTaller, ivaPorcentajeOrden])

  // Actualizar totales cuando cambien las líneas
  useEffect(() => {
    cargarTotales()
  }, [cargarTotales])

  const agregarLinea = async () => {
    if (ordenBloqueada) {
      toast.error('Orden facturada: ya no se puede modificar')
      return
    }
    if (!nuevaLinea.descripcion) {
      toast.error('Añade una descripción')
      return
    }

    // En edición (orden ya existe), persistir la línea inmediatamente — igual que ya
    // hace eliminarLinea — para que el Resumen Económico (que recalcula desde la BD)
    // la vea de inmediato, en vez de quedar solo en estado local hasta el próximo
    // "Guardar" general. Sin esto, líneas añadidas parecían no sumar al total.
    if (!modoCrear && ordenSeleccionada) {
      let data: { id: string }
      try {
        data = await añadirLineaFicha(ordenSeleccionada, {
          tipo: nuevaLinea.tipo,
          descripcion: nuevaLinea.descripcion,
          cantidad: nuevaLinea.cantidad,
          precio_unitario: nuevaLinea.precio_unitario,
        })
      } catch (error) {
        console.error('Error guardando línea:', error)
        toast.error('Error al añadir la línea')
        return
      }

      setLineas([...lineas, { id: data.id, ...nuevaLinea }])
    } else {
      setLineas([...lineas, {
        id: `new-${Date.now()}`,
        ...nuevaLinea,
        isNew: true
      }])
    }

    setNuevaLinea({ tipo: 'mano_obra', descripcion: '', cantidad: 1, precio_unitario: 0 })

    if (nuevaLinea.precio_unitario === 0) {
      toast.warning('⚠️ Línea añadida sin precio. Edítala después para añadir el precio.')
    } else {
      toast.success('Línea añadida')
    }
  }

  const agregarPiezaRapida = async () => {
    if (ordenBloqueada) {
      toast.error('Orden facturada: ya no se puede modificar')
      return
    }
    const desc = piezaRapida.descripcion?.trim()
    const qty = piezaRapida.cantidad || 1
    const precio = piezaRapida.precio || 0
    const tipo = (piezaRapida.tipo || 'pieza') as TipoLinea

    if (!desc) {
      toast.error('Escribe una descripción')
      return
    }

    // Mismo fix que agregarLinea: persistir de inmediato en edición para que el
    // Resumen Económico (recalculado desde la BD) refleje la pieza al momento.
    if (!modoCrear && ordenSeleccionada) {
      // "estado" (presupuestado/confirmado/recibido) es solo un concepto de UI para
      // piezas — lineas_orden no tiene esa columna, así que no se envía.
      let data: { id: string }
      try {
        data = await añadirLineaFicha(ordenSeleccionada, { tipo, descripcion: desc, cantidad: qty, precio_unitario: precio })
      } catch (error) {
        console.error('Error guardando pieza rápida:', error)
        toast.error('Error al añadir el elemento')
        return
      }

      setLineas(prev => [...prev, {
        id: data.id,
        tipo,
        descripcion: desc,
        cantidad: qty,
        precio_unitario: precio,
        estado: precio === 0 ? 'presupuestado' : 'confirmado'
      }])
    } else {
      setLineas(prev => [...prev, {
        id: `new-${Date.now()}`,
        tipo,
        descripcion: desc,
        cantidad: qty,
        precio_unitario: precio,
        estado: precio === 0 ? 'presupuestado' : 'confirmado',
        isNew: true
      }])
    }

    setPiezaRapida({ tipo: 'pieza', descripcion: '', cantidad: 1, precio: 0 })
    toast.success('Elemento añadido')
  }

  const eliminarLinea = async (id: string) => {
    if (ordenBloqueada) {
      toast.error('Orden facturada: ya no se puede modificar')
      return
    }
    if (!id.startsWith('new-')) {
      try {
        await borrarLineaFicha(id)
      } catch (error) {
        console.error('Error borrando línea:', error)
        toast.error('Error al borrar la línea')
        return
      }
    }
    setLineas(lineas.filter(l => l.id !== id))
    toast.success('Línea eliminada')
  }

  const actualizarLinea = async (id: string, campo: 'cantidad' | 'precio_unitario' | 'estado', valor: number | string) => {
    if (ordenBloqueada) {
      toast.error('Orden facturada: ya no se puede modificar')
      return
    }
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

    const lineasActualizadas = lineas.map(l =>
      l.id === id ? { ...l, [campo]: valor } : l
    )
    setLineas(lineasActualizadas)

    // Igual que en agregarLinea: si ya está persistida (no es un id temporal "new-"),
    // guardar el cambio de inmediato para que el Resumen Económico quede sincronizado.
    // "estado" es solo un concepto de UI para piezas (lineas_orden no tiene esa columna),
    // así que ese campo se queda solo en estado local y nunca se manda a la BD.
    if (!id.startsWith('new-') && campo !== 'estado') {
      const linea = lineasActualizadas.find(l => l.id === id)
      if (linea) {
        try {
          await actualizarLineaFicha(id, { [campo]: valor })
        } catch (error) {
          console.error('Error actualizando línea:', error)
          toast.error('Error al guardar el cambio')
        }
      }
    }
  }

  return {
    lineas, setLineas, nuevaLinea, setNuevaLinea, piezaRapida, setPiezaRapida, totales,
    agregarLinea, agregarPiezaRapida, eliminarLinea, actualizarLinea,
  }
}
