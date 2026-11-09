'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { CalendarioCitas } from '@/components/dashboard/citas/calendario-citas'
import { FormularioCita } from '@/components/dashboard/citas/formulario-cita'
import type { Cita } from '@/types/citas'

export default function CitasPage() {
  const [showFormulario, setShowFormulario] = useState(false)
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date | null>(null)
  // Cita que se edita. Antes solo se guardaba el id y el formulario se abría
  // vacío, como cita nueva: no se podía editar ni borrar y al guardar se duplicaba.
  const [citaEditar, setCitaEditar] = useState<Cita | null>(null)
  const [key, setKey] = useState(0) // Para forzar recarga del calendario

  const handleNuevaCita = (fecha: Date) => {
    setFechaSeleccionada(fecha)
    setCitaEditar(null)
    setShowFormulario(true)
  }

  const handleEditarCita = async (citaId: string) => {
    try {
      const res = await fetch(`/api/citas/${citaId}`)
      const data = await res.json()
      if (!res.ok || !data?.cita) throw new Error(data?.error || 'No se pudo abrir la cita')
      setCitaEditar(data.cita as Cita)
      setFechaSeleccionada(null)
      setShowFormulario(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo abrir la cita')
    }
  }

  const handleCerrarFormulario = () => {
    setShowFormulario(false)
    setCitaEditar(null)
    setFechaSeleccionada(null)
  }

  const handleCitaGuardada = () => {
    handleCerrarFormulario()
    setKey(k => k + 1) // Forzar recarga del calendario
  }

  return (
    <div>

      <CalendarioCitas
        key={key}
        onNuevaCita={handleNuevaCita}
        onEditarCita={handleEditarCita}
      />

      {showFormulario && (
        <FormularioCita
          key={citaEditar?.id ?? 'nueva'}
          cita={citaEditar}
          fechaInicial={fechaSeleccionada}
          onClose={handleCerrarFormulario}
          onSave={handleCitaGuardada}
        />
      )}
    </div>
  )
}
