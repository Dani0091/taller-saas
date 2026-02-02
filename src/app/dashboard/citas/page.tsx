'use client'

import { useState } from 'react'
import { CalendarioCitas } from '@/components/dashboard/citas/calendario-citas'
import { FormularioCita } from '@/components/dashboard/citas/formulario-cita'
import type { Cita } from '@/types/citas'

export default function CitasPage() {
  const [showFormulario, setShowFormulario] = useState(false)
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date | null>(null)
  const [citaIdEditar, setCitaIdEditar] = useState<string | null>(null)
  const [key, setKey] = useState(0) // Para forzar recarga del calendario

  const handleNuevaCita = (fecha: Date) => {
    setFechaSeleccionada(fecha)
    setCitaIdEditar(null)
    setShowFormulario(true)
  }

  const handleEditarCita = (citaId: string) => {
    setCitaIdEditar(citaId)
    setFechaSeleccionada(null)
    setShowFormulario(true)
  }

  const handleCerrarFormulario = () => {
    setShowFormulario(false)
    setCitaIdEditar(null)
    setFechaSeleccionada(null)
  }

  const handleCitaGuardada = () => {
    handleCerrarFormulario()
    setKey(k => k + 1) // Forzar recarga del calendario
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Citas y Avisos</h1>
        <p className="text-gray-600">Gestiona las citas, recordatorios e ITVs de tus clientes</p>
      </div>

      <CalendarioCitas
        key={key}
        onNuevaCita={handleNuevaCita}
        onEditarCita={handleEditarCita}
      />

      {showFormulario && (
        <FormularioCita
          cita={undefined}
          fechaInicial={fechaSeleccionada}
          onClose={handleCerrarFormulario}
          onSave={handleCitaGuardada}
        />
      )}
    </div>
  )
}
