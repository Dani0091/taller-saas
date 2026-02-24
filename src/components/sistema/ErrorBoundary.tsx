'use client'

import React from 'react'
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react'

interface Props {
  children: React.ReactNode
  usuarioId?: string
}

interface State {
  hasError: boolean
  errorMessage: string
  errorStack: string
}

/**
 * ErrorBoundary — Red de seguridad de renderizado
 *
 * Captura cualquier error de React en el árbol de componentes hijo,
 * lo registra en logs_sistema_criticos vía API, y muestra una pantalla
 * de recuperación con opciones para limpiar caché o recargar.
 *
 * IMPORTANTE: Debe ser una clase porque React solo soporta
 * componentDidCatch en componentes de clase.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, errorMessage: '', errorStack: '' }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message ?? 'Error desconocido',
      errorStack: error?.stack ?? '',
    }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Enviar al registro de fallos sin bloquear el render
    this.registrarError(error, info).catch(console.error)
  }

  private async registrarError(error: Error, info: React.ErrorInfo) {
    try {
      await fetch('/api/logs/error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error_mensaje:  error?.message ?? 'Error desconocido',
          archivo_origen: info?.componentStack?.split('\n')[1]?.trim() ?? 'ErrorBoundary',
          usuario_id:     this.props.usuarioId ?? null,
          stack_trace:    error?.stack ?? null,
          metadata: {
            componentStack: info?.componentStack,
            url: typeof window !== 'undefined' ? window.location.href : null,
            timestamp: new Date().toISOString(),
          },
        }),
      })
    } catch {
      // Silencioso — no queremos recursión de errores
    }
  }

  private handleLimpiarYRecargar = () => {
    try {
      localStorage.clear()
      sessionStorage.clear()
    } catch {
      // Puede fallar en modo privado — continuar igualmente
    }

    // Limpiar caché del Service Worker si existe
    if (typeof window !== 'undefined' && 'caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name))
      }).catch(() => {}).finally(() => window.location.reload())
    } else if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  private handleRecargarSolo = () => {
    this.setState({ hasError: false, errorMessage: '', errorStack: '' })
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl border border-red-100 p-8 text-center">

          {/* Icono */}
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>

          {/* Título */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Algo salió mal
          </h1>
          <p className="text-gray-500 mb-6">
            Se ha producido un error inesperado. El incidente ha sido registrado
            automáticamente.
          </p>

          {/* Mensaje del error (colapsable, solo dev-friendly) */}
          {this.state.errorMessage && (
            <details className="mb-6 text-left bg-gray-50 rounded-lg p-4 border border-gray-200">
              <summary className="text-sm font-semibold text-gray-600 cursor-pointer select-none">
                Detalles técnicos
              </summary>
              <p className="mt-2 text-xs text-red-700 font-mono break-all">
                {this.state.errorMessage}
              </p>
            </details>
          )}

          {/* Botones de recuperación */}
          <div className="space-y-3">
            {/* Opción 1: Limpiar caché y recargar (versión estable) */}
            <button
              onClick={this.handleLimpiarYRecargar}
              className="w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
              Limpiar caché y cargar versión estable
            </button>

            {/* Opción 2: Solo recargar */}
            <button
              onClick={this.handleRecargarSolo}
              className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-medium py-3 px-6 rounded-xl border border-gray-300 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Intentar de nuevo
            </button>
          </div>

          <p className="mt-6 text-xs text-gray-400">
            Si el problema persiste, contacta con soporte indicando la hora del error.
          </p>
        </div>
      </div>
    )
  }
}
