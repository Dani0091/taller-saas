'use client'

import { useState } from 'react'
import { Calendar, Download, ExternalLink, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  generarEnlaceGoogleCalendar,
  generarEnlaceOutlook,
  generarICS,
  descargarICS
} from '@/lib/calendar/export'

interface ExportarCalendarioProps {
  cita: {
    titulo: string
    descripcion?: string | null
    fecha_inicio: string
    fecha_fin?: string | null
    todo_el_dia?: boolean
  }
  ubicacion?: string
  className?: string
}

export function ExportarCalendario({ cita, ubicacion, className }: ExportarCalendarioProps) {
  const [mostrarMenu, setMostrarMenu] = useState(false)

  const citaExport = {
    titulo: cita.titulo,
    descripcion: cita.descripcion || undefined,
    fecha_inicio: cita.fecha_inicio,
    fecha_fin: cita.fecha_fin || undefined,
    todo_el_dia: cita.todo_el_dia,
    ubicacion
  }

  const handleGoogleCalendar = () => {
    const url = generarEnlaceGoogleCalendar(citaExport)
    window.open(url, '_blank')
    setMostrarMenu(false)
  }

  const handleOutlook = () => {
    const url = generarEnlaceOutlook(citaExport)
    window.open(url, '_blank')
    setMostrarMenu(false)
  }

  const handleDescargarICS = () => {
    const ics = generarICS(citaExport)
    const nombreArchivo = `cita-${cita.titulo.replace(/\s+/g, '-').toLowerCase()}.ics`
    descargarICS(ics, nombreArchivo)
    setMostrarMenu(false)
  }

  return (
    <div className={`relative ${className || ''}`}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setMostrarMenu(!mostrarMenu)}
        className="gap-2"
      >
        <Calendar className="w-4 h-4" />
        Calendario
        <ChevronDown className={`w-3 h-3 transition-transform ${mostrarMenu ? 'rotate-180' : ''}`} />
      </Button>

      {mostrarMenu && (
        <>
          {/* Overlay para cerrar */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMostrarMenu(false)}
          />

          {/* Menu */}
          <div className="absolute top-full left-0 mt-1 w-52 bg-white rounded-lg shadow-lg border z-50 py-1">
            <button
              onClick={handleGoogleCalendar}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <path fill="#4285F4" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12s4.477 10 10 10 10-4.477 10-10z" opacity="0.1" />
                <path fill="#4285F4" d="M12 6v6l4 2" stroke="#4285F4" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span>Google Calendar</span>
              <ExternalLink className="w-3 h-3 ml-auto text-gray-400" />
            </button>

            <button
              onClick={handleOutlook}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <rect width="20" height="16" x="2" y="4" rx="2" fill="#0078D4" opacity="0.8" />
                <path fill="white" d="M6 10h3v4H6zM10 10h3v4h-3zM14 10h3v4h-3z" />
              </svg>
              <span>Outlook</span>
              <ExternalLink className="w-3 h-3 ml-auto text-gray-400" />
            </button>

            <div className="border-t my-1" />

            <button
              onClick={handleDescargarICS}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4 text-gray-600" />
              <span>Descargar .ics</span>
              <span className="ml-auto text-xs text-gray-400">Apple, etc.</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Botones de exportación en línea (sin dropdown)
 */
export function BotonesCalendario({ cita, ubicacion }: ExportarCalendarioProps) {
  const citaExport = {
    titulo: cita.titulo,
    descripcion: cita.descripcion || undefined,
    fecha_inicio: cita.fecha_inicio,
    fecha_fin: cita.fecha_fin || undefined,
    todo_el_dia: cita.todo_el_dia,
    ubicacion
  }

  return (
    <div className="flex gap-2 flex-wrap">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          const url = generarEnlaceGoogleCalendar(citaExport)
          window.open(url, '_blank')
        }}
        className="gap-1 text-xs"
      >
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.2 4.8h-1.2V2.4h-2.4v2.4H8.4V2.4H6v2.4H4.8c-1.33 0-2.4 1.07-2.4 2.4v12c0 1.33 1.07 2.4 2.4 2.4h14.4c1.33 0 2.4-1.07 2.4-2.4v-12c0-1.33-1.07-2.4-2.4-2.4z" />
        </svg>
        Google
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          const url = generarEnlaceOutlook(citaExport)
          window.open(url, '_blank')
        }}
        className="gap-1 text-xs"
      >
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
          <rect width="18" height="14" x="3" y="5" rx="2" />
        </svg>
        Outlook
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          const ics = generarICS(citaExport)
          descargarICS(ics, `cita.ics`)
        }}
        className="gap-1 text-xs"
      >
        <Download className="w-3 h-3" />
        .ics
      </Button>
    </div>
  )
}
