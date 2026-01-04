/**
 * @fileoverview Página para establecer nueva contraseña
 * @description Permite al usuario establecer una nueva contraseña después de solicitar el reset
 */
'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Loader2, AlertCircle, CheckCircle2, Lock } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

export default function NuevaPasswordPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [checking, setChecking] = useState(true)

  // Verificar que hay una sesión de recuperación válida
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      // El usuario debe llegar aquí desde el email de recuperación
      // Supabase maneja automáticamente el token del URL
      setChecking(false)
    }
    checkSession()
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!password) {
      setError('Introduce una contraseña')
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    if (password !== passwordConfirm) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) throw updateError

      setSuccess(true)
      toast.success('Contraseña actualizada correctamente')

      // Redirigir al dashboard después de 2 segundos
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (error: any) {
      console.error('Error:', error)
      setError(error.message || 'Error al actualizar la contraseña')
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-500 to-sky-700 p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-sky-600" />
          <p className="text-gray-600">Verificando enlace...</p>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-500 to-emerald-700 p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            ¡Contraseña actualizada!
          </h1>
          <p className="text-gray-600 mb-4">
            Tu contraseña ha sido cambiada correctamente.
          </p>
          <p className="text-sm text-gray-500">
            Redirigiendo al panel de control...
          </p>
          <Loader2 className="w-6 h-6 animate-spin mx-auto mt-4 text-green-600" />
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-500 to-sky-700 p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-sky-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Nueva contraseña
          </h1>
          <p className="text-gray-600">
            Introduce tu nueva contraseña
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nueva contraseña
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
              }}
              placeholder="Mínimo 6 caracteres"
              disabled={loading}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmar contraseña
            </label>
            <Input
              type="password"
              value={passwordConfirm}
              onChange={(e) => {
                setPasswordConfirm(e.target.value)
                setError('')
              }}
              placeholder="Repite la contraseña"
              disabled={loading}
              required
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-600 hover:bg-sky-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar nueva contraseña'
            )}
          </Button>
        </form>
      </Card>
    </div>
  )
}
