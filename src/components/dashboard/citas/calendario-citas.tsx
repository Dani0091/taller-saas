'use client'

import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, isToday, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, User, Car, Download, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import type { Cita } from '@/types/citas'
import { ESTADOS_CITA, TIPOS_CITA } from '@/types/citas'
import { generarICSMultiple, descargarICS } from '@/lib/calendar/export'

type VistaCalendario = 'mes' | 'semana' | 'dia'

interface CalendarioCitasProps {
  onNuevaCita?: (fecha: Date) => void
  onEditarCita?: (cita: Cita) => void
}

export function CalendarioCitas({ onNuevaCita, onEditarCita }: CalendarioCitasProps) {
  const [mesActual, setMesActual] = useState(new Date())
  const [citas, setCitas] = useState<Cita[]>([])
  const [loading, setLoading] = useState(true)
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date | null>(null)
  const [vista, setVista] = useState<VistaCalendario>('mes')

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

  // Navegación según vista
  const navegarAnterior = () => {
    if (vista === 'mes') setMesActual(subMonths(mesActual, 1))
    else if (vista === 'semana') setMesActual(subWeeks(mesActual, 1))
    else setMesActual(subDays(mesActual, 1))
  }

  const navegarSiguiente = () => {
    if (vista === 'mes') setMesActual(addMonths(mesActual, 1))
    else if (vista === 'semana') setMesActual(addWeeks(mesActual, 1))
    else setMesActual(addDays(mesActual, 1))
  }

  // Obtener días según vista
  const getDiasVista = () => {
    if (vista === 'dia') {
      return [mesActual]
    } else if (vista === 'semana') {
      return eachDayOfInterval({
        start: startOfWeek(mesActual, { weekStartsOn: 1 }),
        end: endOfWeek(mesActual, { weekStartsOn: 1 })
      })
    } else {
      return eachDayOfInterval({
        start: startOfMonth(mesActual),
        end: endOfMonth(mesActual)
      })
    }
  }

  const diasMes = getDiasVista()

  // Obtener día de inicio de la semana (lunes = 0) - solo para vista mes
  const primerDiaMes = startOfMonth(mesActual).getDay()
  const diasVaciosInicio = vista === 'mes' ? (primerDiaMes === 0 ? 6 : primerDiaMes - 1) : 0

  // Título según vista
  const getTituloVista = () => {
    if (vista === 'dia') return format(mesActual, "EEEE d 'de' MMMM yyyy", { locale: es })
    if (vista === 'semana') {
      const inicio = startOfWeek(mesActual, { weekStartsOn: 1 })
      const fin = endOfWeek(mesActual, { weekStartsOn: 1 })
      return `${format(inicio, 'd MMM', { locale: es })} - ${format(fin, 'd MMM yyyy', { locale: es })}`
    }
    return format(mesActual, 'MMMM yyyy', { locale: es })
  }

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
        <CardHeader className="pb-2 space-y-3">
          {/* Selector de vista */}
          <div className="flex justify-center sm:justify-start">
            <div className="inline-flex rounded-lg border bg-gray-100 p-0.5">
              {(['mes', 'semana', 'dia'] as VistaCalendario[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setVista(v)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors capitalize
                    ${vista === v
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'}`}
                >
                  {v === 'mes' ? 'Mes' : v === 'semana' ? 'Semana' : 'Día'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="capitalize">{getTituloVista()}</span>
            </CardTitle>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={navegarAnterior}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => setMesActual(new Date())}
              >
                Hoy
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={navegarSiguiente}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              {citas.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportarCitasMes}
                  className="ml-1 gap-1 h-8 px-2"
                  title="Exportar citas"
                >
                  <Download className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          {/* Vista Día - Lista de citas */}
          {vista === 'dia' ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="font-medium">{format(mesActual, "EEEE d", { locale: es })}</span>
                {onNuevaCita && (
                  <Button size="sm" onClick={() => onNuevaCita(mesActual)}>
                    <Plus className="w-4 h-4 mr-1" />Nueva
                  </Button>
                )}
              </div>
              {getCitasDelDia(mesActual).length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No hay citas para este día
                </div>
              ) : (
                getCitasDelDia(mesActual).map(cita => (
                  <CitaCard key={cita.id} cita={cita} onClick={() => onEditarCita?.(cita)} />
                ))
              )}
            </div>
          ) : (
            <>
              {/* Cabecera días de la semana - Abreviaturas cortas en móvil */}
              <div className={`grid gap-0.5 sm:gap-1 mb-1 sm:mb-2 ${vista === 'semana' ? 'grid-cols-7' : 'grid-cols-7'}`}>
                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((dia, i) => (
                  <div key={dia} className="text-center text-[10px] sm:text-xs font-medium text-gray-500 py-1 sm:py-2">
                    <span className="sm:hidden">{dia}</span>
                    <span className="hidden sm:inline">{['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][i]}</span>
                  </div>
                ))}
              </div>

              {/* Grid de días */}
              <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
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
                        aspect-square p-0.5 sm:p-1 rounded-md sm:rounded-lg text-xs sm:text-sm relative
                        hover:bg-gray-100 transition-colors
                        ${esHoy ? 'bg-blue-50 font-bold' : ''}
                        ${esSeleccionado ? 'ring-2 ring-blue-500 bg-blue-100' : ''}
                        ${vista === 'mes' && !isSameMonth(dia, mesActual) ? 'text-gray-300' : ''}
                      `}
                    >
                      <span className={esHoy ? 'text-blue-600' : ''}>
                        {format(dia, 'd')}
                      </span>

                      {/* Indicadores de citas */}
                      {citasDelDia.length > 0 && (
                        <div className="absolute bottom-0.5 sm:bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                          {citasDelDia.slice(0, 3).map((cita, i) => (
                            <div
                              key={i}
                              className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full"
                              style={{ backgroundColor: cita.color }}
                            />
                          ))}
                          {citasDelDia.length > 3 && (
                            <span className="text-[6px] sm:text-[8px] text-gray-500">+{citasDelDia.length - 3}</span>
                          )}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </>
          )}
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
              {citasDelDiaSeleccionado.map(cita => (
                <CitaCard key={cita.id} cita={cita} onClick={() => onEditarCita?.(cita)} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Componente reutilizable para mostrar una cita
function CitaCard({ cita, onClick }: { cita: Cita; onClick?: () => void }) {
  const estadoCita = ESTADOS_CITA.find(e => e.value === cita.estado)

  return (
    <div
      onClick={onClick}
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
}
