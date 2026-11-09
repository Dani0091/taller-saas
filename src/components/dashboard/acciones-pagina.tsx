/**
 * @fileoverview Acciones de la página en la cabecera
 * @description Cada pantalla pone sus botones principales («Nueva orden»,
 * «Guardar cambios»…) junto al título de la cabecera, para que todas tengan
 * la misma estructura: título a la izquierda, acciones a la derecha.
 */
'use client'

import { useSyncExternalStore, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export const ID_ACCIONES_PAGINA = 'acciones-pagina'

const sinSuscripcion = () => () => {}

export function AccionesPagina({ children }: { children: ReactNode }) {
  // El hueco lo pinta la cabecera; en el servidor no existe
  const destino = useSyncExternalStore(
    sinSuscripcion,
    () => document.getElementById(ID_ACCIONES_PAGINA),
    () => null
  )
  return destino ? createPortal(children, destino) : null
}
