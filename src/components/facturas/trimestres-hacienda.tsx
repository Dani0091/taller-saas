/**
 * @fileoverview Trimestres para Hacienda en el listado de facturas
 * @description Los últimos cinco trimestres con su plazo de presentación
 * (303 / 130). Elegir uno filtra el listado; «Exportar» descarga el ZIP con
 * los PDF y el libro de facturas emitidas en CSV.
 */
'use client'

import { CalendarClock, Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  trimestresRecientes, claveTrimestre, etiquetaTrimestre, plazoPresentacion, trimestreAPresentar, diasEntre,
  type Trimestre,
} from '@/lib/facturas/trimestres'
import { diaMadrid } from '@/lib/dashboard/metricas'
import { useExportarTrimestre } from '@/hooks/useExportarTrimestre'

const fechaCorta = (iso: string, conAño = false) => {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', ...(conAño ? { year: 'numeric' } : {}) })
}

interface Props {
  seleccionado: string | null
  onSeleccionar: (clave: string | null) => void
}

export function TrimestresHacienda({ seleccionado, onSeleccionar }: Props) {
  const hoy = diaMadrid(new Date())
  const [a, m, d] = hoy.split('-').map(Number)
  const trimestres = trimestresRecientes(new Date(a, m - 1, d), 5)
  const aPresentar = claveTrimestre(trimestreAPresentar(hoy).trimestre)
  const { exportarTrimestre, progreso, exportando } = useExportarTrimestre()

  const estado = (t: Trimestre) => {
    const plazo = plazoPresentacion(t)
    if (hoy < plazo.desde) return { texto: `En curso · se presenta del ${fechaCorta(plazo.desde)} al ${fechaCorta(plazo.hasta, true)}`, tono: 'text-muted-foreground' }
    if (hoy <= plazo.hasta) {
      const dias = diasEntre(hoy, plazo.hasta)
      return { texto: `Plazo abierto: ${dias === 0 ? 'último día' : `quedan ${dias} día${dias === 1 ? '' : 's'}`} (hasta el ${fechaCorta(plazo.hasta)})`, tono: 'text-warning font-medium' }
    }
    return { texto: `Plazo cerrado el ${fechaCorta(plazo.hasta, true)}`, tono: 'text-muted-foreground' }
  }

  const elegido = seleccionado ? trimestres.find((t) => claveTrimestre(t) === seleccionado) : undefined

  return (
    <section aria-labelledby="titulo-trimestres" className="rounded-xl border bg-card p-4 md:p-5 shadow-xs space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="titulo-trimestres" className="font-semibold text-foreground flex items-center gap-2">
            <CalendarClock aria-hidden className="size-4 text-primary" />
            Trimestres para Hacienda
          </h2>
          <p className="text-sm text-muted-foreground">IVA (303) e IRPF (130). Elige un trimestre para ver sus facturas y exportarlas.</p>
        </div>
      </div>

      <div role="group" aria-label="Trimestres" className="-mx-4 px-4 md:mx-0 md:px-0 flex md:grid md:grid-cols-5 gap-2 overflow-x-auto snap-x pb-1">
        {trimestres.map((t) => {
          const clave = claveTrimestre(t)
          const activo = seleccionado === clave
          const e = estado(t)
          return (
            <button
              key={clave}
              type="button"
              aria-pressed={activo}
              onClick={() => onSeleccionar(activo ? null : clave)}
              className={`snap-start shrink-0 w-44 md:w-auto text-left rounded-lg border p-3 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
                activo ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'bg-card hover:bg-accent'
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className={`font-semibold tabular-nums ${activo ? 'text-primary' : 'text-foreground'}`}>{etiquetaTrimestre(t, false)}</span>
                {clave === aPresentar && (
                  <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning">Toca</span>
                )}
              </span>
              <span className="block text-xs text-muted-foreground">{etiquetaTrimestre(t).split('(')[1]?.replace(')', '')}</span>
              <span className={`mt-1.5 block text-xs leading-snug ${e.tono}`}>{e.texto}</span>
            </button>
          )
        })}
      </div>

      {elegido && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg bg-muted px-3 py-3 animate-in fade-in-0 slide-in-from-top-1 duration-150">
          <p className="text-sm text-foreground flex-1">
            <span className="font-medium">{etiquetaTrimestre(elegido)}</span>: el listado muestra sus facturas. La exportación incluye el PDF de cada una y el libro de facturas emitidas para la gestoría.
          </p>
          <Button onClick={() => exportarTrimestre(claveTrimestre(elegido))} disabled={exportando} className="gap-2 shrink-0">
            {exportando ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Download aria-hidden className="size-4" />}
            {exportando
              ? progreso && progreso.total > 0 ? `PDF ${progreso.hechas} de ${progreso.total}…` : 'Preparando…'
              : `Exportar ${etiquetaTrimestre(elegido, false)}`}
          </Button>
        </div>
      )}
    </section>
  )
}
