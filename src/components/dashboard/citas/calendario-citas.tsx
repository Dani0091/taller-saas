'use client'

import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, isToday, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, User, Car, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import type { Cita } from '@/types/citas'
import { ESTADOS_CITA, TIPOS_CITA } from '@/types/citas'
import { generarICSMultiple, descargarICS } from '@/lib/calendar/export'

interface CalendarioCitasProps {
  onNuevaCita?: (fecha: Date) => void
  onEditarCita?: (cita: Cita) => void
}

export function CalendarioCitas({ onNuevaCita, onEditarCita }: CalendarioCitasProps) {
  const [mesActual, setMesActual] = useState(new Date())
  const [citas, setCitas] = useState<Cita[]>([])
  const [loading, setLoading] = useState(true)
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date | null>(null)

  // Cargar citas del mes
  useEffect(() => {
    cargarCitas()
  }, [mesActual])

  const cargarCitas = async () => {
    try {
      setLoading(true)
      const inicio = startOfMonth(mesActual)
      const fin = endOfMonth(mesActual)

      const res = await fetch(
        `/api/citas?desde=${inicio.toISOString()}&hasta=${fin.toISOString()}`
      )
      const data = await res.json()

      if (data.citas) {
        setCitas(data.citas)
      }
    } catch (error) {
      console.error('Error cargando citas:', error)
      toast.error('Error al cargar citas')
    } finally {
      setLoading(false)
    }
  }

  const diasMes = eachDayOfInterval({
    start: startOfMonth(mesActual),
    end: endOfMonth(mesActual)
  })

  // Obtener día de inicio de la semana (lunes = 0)
  const primerDiaMes = startOfMonth(mesActual).getDay()
  const diasVaciosInicio = primerDiaMes === 0 ? 6 : primerDiaMes - 1

  const getCitasDelDia = (dia: Date) => {
    return citas.filter(cita =>
      isSameDay(parseISO(cita.fecha_inicio), dia)
    )
  }

  const handleDiaClick = (dia: Date) => {
    setDiaSeleccionado(dia)
  }

  const citasDelDiaSeleccionado = diaSeleccionado
    ? getCitasDelDia(diaSeleccionado)
    : []

  // Exportar todas las citas del mes
  const exportarCitasMes = () => {
    if (citas.length === 0) {
      toast.error('No hay citas para exportar')
      return
    }

    const citasExport = citas.map(c => ({
      titulo: c.titulo,
      descripcion: c.descripcion || undefined,
      fecha_inicio: c.fecha_inicio,
      fecha_fin: c.fecha_fin || undefined,
      todo_el_dia: c.todo_el_dia
    }))

    const ics = generarICSMultiple(citasExport)
    const nombreArchivo = `citas-${format(mesActual, 'yyyy-MM')}.ics`
    descargarICS(ics, nombreArchivo)
    toast.success(`${citas.length} citas exportadas`)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Calendario */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              {format(mesActual, 'MMMM yyyy', { locale: es })}
            </CardTitle>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setMesActual(subMonths(mesActual, 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMesActual(new Date())}
              >
                Hoy
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setMesActual(addMonths(mesActual, 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              {citas.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportarCitasMes}
                  className="ml-2 gap-1"
                  title="Exportar citas del mes"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Exportar</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Cabecera días de la semana */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(dia => (
              <div key={dia} className="text-center text-xs font-medium text-gray-500 py-2">
                {dia}
              </div>
            ))}
          </div>

          {/* Grid de días */}
          <div className="grid grid-cols-7 gap-1">
            {/* Días vacíos al inicio */}
            {Array.from({ length: diasVaciosInicio }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {/* Días del mes */}
            {diasMes.map(dia => {
              const citasDelDia = getCitasDelDia(dia)
              const esHoy = isToday(dia)
              const esSeleccionado = diaSeleccionado && isSameDay(dia, diaSeleccionado)

              return (
                <button
                  key={dia.toISOString()}
                  onClick={() => handleDiaClick(dia)}
                  className={`
                    aspect-square p-1 rounded-lg text-sm relative
                    hover:bg-gray-100 transition-colors
                    ${esHoy ? 'bg-blue-50 font-bold' : ''}
                    ${esSeleccionado ? 'ring-2 ring-blue-500 bg-blue-100' : ''}
                    ${!isSameMonth(dia, mesActual) ? 'text-gray-300' : ''}
                  `}
                >
                  <span className={esHoy ? 'text-blue-600' : ''}>
                    {format(dia, 'd')}
                  </span>

                  {/* Indicadores de citas */}
                  {citasDelDia.length > 0 && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                      {citasDelDia.slice(0, 3).map((cita, i) => (
                        <div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: cita.color }}
                        />
                      ))}
                      {citasDelDia.length > 3 && (
                        <span className="text-[8px] text-gray-500">+{citasDelDia.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Panel lateral: citas del día */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {diaSeleccionado
                ? format(diaSeleccionado, "d 'de' MMMM", { locale: es })
                : 'Selecciona un día'}
            </CardTitle>
            {diaSeleccionado && onNuevaCita && (
              <Button
                size="sm"
                onClick={() => onNuevaCita(diaSeleccionado)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Nueva
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Cargando...</div>
          ) : !diaSeleccionado ? (
            <div className="text-center py-8 text-gray-500">
              <CalendarIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Selecciona un día para ver sus citas</p>
            </div>
          ) : citasDelDiaSeleccionado.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No hay citas para este día</p>
              {onNuevaCita && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => onNuevaCita(diaSeleccionado)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Crear cita
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {citasDelDiaSeleccionado.map(cita => {
                const tipoCita = TIPOS_CITA.find(t => t.value === cita.tipo)
                const estadoCita = ESTADOS_CITA.find(e => e.value === cita.estado)

                return (
                  <div
                    key={cita.id}
                    onClick={() => onEditarCita?.(cita)}
                    className="p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors"
                    style={{ borderLeftColor: cita.color, borderLeftWidth: '4px' }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{cita.titulo}</h4>

                        {/* Hora */}
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                          <Clock className="w-3 h-3" />
                          {cita.todo_el_dia
                            ? 'Todo el día'
                            : format(parseISO(cita.fecha_inicio), 'HH:mm')}
                        </div>

                        {/* Cliente */}
                        {cita.cliente && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                            <User className="w-3 h-3" />
                            {cita.cliente.nombre}
                          </div>
                        )}

                        {/* Vehículo */}
                        {cita.vehiculo && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                            <Car className="w-3 h-3" />
                            {cita.vehiculo.matricula}
                          </div>
                        )}
                      </div>

                      {/* Estado */}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${estadoCita?.color || 'bg-gray-500'} text-white`}>
                        {estadoCita?.label || cita.estado}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
