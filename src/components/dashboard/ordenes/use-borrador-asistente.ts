/**
 * @fileoverview Borrador del asistente de nueva orden (localStorage)
 * @description Guarda lo que se lleva escrito en el asistente y, al volver a
 * abrirlo, pregunta si continuar. Restaurar en silencio dejaba el paso 1 en
 * blanco: el borrador solo guarda vehiculo_id, sin el vehículo cargado.
 * Extraído sin cambios de detalle-orden-sheet.
 */
'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'

const CLAVE = 'orden_form_wizard'

type Paso = 1 | 2 | 3 | 4

interface Opciones<T> {
  /** Solo en el asistente (crear), nunca al editar */
  activo: boolean
  formData: T
  paso: Paso
  onRestaurar: (formData: Partial<T>, paso: Paso) => void | Promise<void>
  onDescartar: () => void
}

export function useBorradorAsistente<T extends { vehiculo_id?: string; cliente_id?: string; descripcion_problema?: string }>({
  activo, formData, paso, onRestaurar, onDescartar,
}: Opciones<T>) {
  const restauradoRef = useRef(false)
  const [mostrarModalBorrador, setMostrarModalBorrador] = useState(false)
  const pendienteRef = useRef<{ formData: Partial<T>; paso: Paso } | null>(null)

  useEffect(() => {
    if (!activo) return
    try {
      const guardado = localStorage.getItem(CLAVE)
      if (guardado) {
        const { formData: fd, stepCrear: sc } = JSON.parse(guardado)
        const tieneContenido = fd && (fd.vehiculo_id || fd.cliente_id || (fd.descripcion_problema && fd.descripcion_problema.trim()))
        if (tieneContenido) {
          pendienteRef.current = { formData: fd, paso: sc || 1 }
          setMostrarModalBorrador(true)
        } else {
          localStorage.removeItem(CLAVE)
        }
      }
    } catch {
      // Ignorar borradores corruptos
    } finally {
      restauradoRef.current = true
    }
  }, [activo])

  const continuarBorrador = async () => {
    const borrador = pendienteRef.current
    setMostrarModalBorrador(false)
    if (!borrador) return
    await onRestaurar(borrador.formData, borrador.paso)
    toast.info('Borrador restaurado')
  }

  const empezarDeNuevo = () => {
    localStorage.removeItem(CLAVE)
    pendienteRef.current = null
    setMostrarModalBorrador(false)
    onDescartar()
  }

  useEffect(() => {
    if (!activo || !restauradoRef.current || mostrarModalBorrador) return
    const t = setTimeout(() => {
      try {
        localStorage.setItem(CLAVE, JSON.stringify({ formData, stepCrear: paso }))
      } catch {
        // localStorage lleno o no disponible — no es crítico
      }
    }, 500)
    return () => clearTimeout(t)
  }, [activo, formData, paso, mostrarModalBorrador])

  return { mostrarModalBorrador, continuarBorrador, empezarDeNuevo }
}
