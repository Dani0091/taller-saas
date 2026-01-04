/**
 * @fileoverview Página de recuperación de contraseña
 * @description Permite solicitar un email para restablecer la contraseña
 */
'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft, Mail } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

export default function RecuperarPage() {
  const supabase = useMemo(() => createClient(), [])

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('Introduce tu email')
      return
    }

    setLoading(true)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/nueva-password`,
      })

      if (resetError) throw resetError

      setSuccess(true)
      toast.success('Email enviado correctamente')
    } catch (error: any) {
      console.error('Error:', error)
      setError(error.message || 'Error al enviar el email')
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-500 to-sky-700 p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Revisa tu email
          </h1>
          <p className="text-gray-600 mb-6">
            Hemos enviado un enlace a <strong>{email}</strong> para restablecer tu contraseña.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Si no recibes el email en unos minutos, revisa tu carpeta de spam.
          </p>
          <Link href="/auth/login">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al inicio de sesión
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-500 to-sky-700 p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Recuperar contraseña
          </h1>
          <p className="text-gray-600">
            Te enviaremos un enlace para restablecer tu contraseña
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
              Email
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError('')
              }}
              placeholder="tu@email.com"
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
                Enviando...
              </>
            ) : (
              'Enviar enlace de recuperación'
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/auth/login" className="text-sm text-gray-600 hover:text-sky-600">
            <ArrowLeft className="w-4 h-4 inline mr-1" />
            Volver al inicio de sesión
          </Link>
        </div>
      </Card>
    </div>
  )
}
