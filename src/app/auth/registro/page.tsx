/**
 * @fileoverview Página de registro/onboarding para nuevos talleres
 * @description Permite crear una cuenta de taller con usuario administrador
 */
'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Loader2, AlertCircle, CheckCircle2, Building2, User, ArrowRight, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

type Step = 'taller' | 'usuario' | 'confirmacion'

interface FormData {
  // Datos del taller
  nombre_taller: string
  cif: string
  direccion: string
  telefono: string
  email_taller: string
  // Datos del usuario admin
  nombre_usuario: string
  email_usuario: string
  password: string
  password_confirm: string
}

export default function RegistroPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [step, setStep] = useState<Step>('taller')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState<FormData>({
    nombre_taller: '',
    cif: '',
    direccion: '',
    telefono: '',
    email_taller: '',
    nombre_usuario: '',
    email_usuario: '',
    password: '',
    password_confirm: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError('')
  }

  const validateStep1 = () => {
    if (!formData.nombre_taller.trim()) {
      setError('El nombre del taller es obligatorio')
      return false
    }
    if (!formData.cif.trim()) {
      setError('El CIF/NIF es obligatorio')
      return false
    }
    return true
  }

  const validateStep2 = () => {
    if (!formData.nombre_usuario.trim()) {
      setError('Tu nombre es obligatorio')
      return false
    }
    if (!formData.email_usuario.trim()) {
      setError('El email es obligatorio')
      return false
    }
    if (!formData.password) {
      setError('La contraseña es obligatoria')
      return false
    }
    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return false
    }
    if (formData.password !== formData.password_confirm) {
      setError('Las contraseñas no coinciden')
      return false
    }
    return true
  }

  const handleNext = () => {
    if (step === 'taller' && validateStep1()) {
      setStep('usuario')
    } else if (step === 'usuario' && validateStep2()) {
      setStep('confirmacion')
    }
  }

  const handleBack = () => {
    if (step === 'usuario') setStep('taller')
    if (step === 'confirmacion') setStep('usuario')
    setError('')
  }

  const handleSubmit = async () => {
    setError('')
    setLoading(true)

    try {
      // Llamar a la API de registro que usa service role key
      const response = await fetch('/api/auth/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_taller: formData.nombre_taller,
          cif: formData.cif,
          direccion: formData.direccion,
          telefono: formData.telefono,
          email_taller: formData.email_taller,
          nombre_usuario: formData.nombre_usuario,
          email_usuario: formData.email_usuario,
          password: formData.password,
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al registrar')
      }

      // Iniciar sesión automáticamente después del registro
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email_usuario,
        password: formData.password,
      })

      if (signInError) {
        console.error('Error auto-login:', signInError)
        // No es crítico, el usuario puede hacer login manualmente
      }

      setSuccess(true)
      toast.success('¡Taller registrado correctamente!')

      // Redirigir al dashboard después de 2 segundos
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)

    } catch (error: any) {
      console.error('Error en registro:', error)
      setError(error.message || 'Error al registrar')
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-500 to-emerald-700 p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            ¡Bienvenido a TallerAgil!
          </h1>
          <p className="text-gray-600 mb-4">
            Tu taller <strong>{formData.nombre_taller}</strong> ha sido creado correctamente.
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
      <Card className="w-full max-w-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            TallerAgil
          </h1>
          <p className="text-gray-600">
            Registra tu taller en minutos
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
            step === 'taller' ? 'bg-sky-600 text-white' : 'bg-sky-100 text-sky-600'
          }`}>
            1
          </div>
          <div className={`w-12 h-1 rounded ${step !== 'taller' ? 'bg-sky-600' : 'bg-gray-200'}`} />
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
            step === 'usuario' ? 'bg-sky-600 text-white' : step === 'confirmacion' ? 'bg-sky-100 text-sky-600' : 'bg-gray-200 text-gray-400'
          }`}>
            2
          </div>
          <div className={`w-12 h-1 rounded ${step === 'confirmacion' ? 'bg-sky-600' : 'bg-gray-200'}`} />
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
            step === 'confirmacion' ? 'bg-sky-600 text-white' : 'bg-gray-200 text-gray-400'
          }`}>
            3
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2 mb-6">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Step 1: Datos del Taller */}
        {step === 'taller' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-sky-600" />
              <h2 className="text-lg font-semibold">Datos del Taller</h2>
            </div>

            <div>
              <Label htmlFor="nombre_taller">Nombre del Taller *</Label>
              <Input
                id="nombre_taller"
                name="nombre_taller"
                value={formData.nombre_taller}
                onChange={handleChange}
                placeholder="Ej: Taller Mecánico García"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="cif">CIF/NIF *</Label>
              <Input
                id="cif"
                name="cif"
                value={formData.cif}
                onChange={handleChange}
                placeholder="Ej: B12345678"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="direccion">Dirección</Label>
              <Input
                id="direccion"
                name="direccion"
                value={formData.direccion}
                onChange={handleChange}
                placeholder="Calle, número, ciudad"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleChange}
                  placeholder="600 123 456"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="email_taller">Email del taller</Label>
                <Input
                  id="email_taller"
                  name="email_taller"
                  type="email"
                  value={formData.email_taller}
                  onChange={handleChange}
                  placeholder="taller@email.com"
                  className="mt-1"
                />
              </div>
            </div>

            <Button onClick={handleNext} className="w-full mt-6 bg-sky-600 hover:bg-sky-700">
              Siguiente
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Step 2: Datos del Usuario */}
        {step === 'usuario' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-sky-600" />
              <h2 className="text-lg font-semibold">Tu cuenta de administrador</h2>
            </div>

            <div>
              <Label htmlFor="nombre_usuario">Tu nombre *</Label>
              <Input
                id="nombre_usuario"
                name="nombre_usuario"
                value={formData.nombre_usuario}
                onChange={handleChange}
                placeholder="Ej: Juan García"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="email_usuario">Email de acceso *</Label>
              <Input
                id="email_usuario"
                name="email_usuario"
                type="email"
                value={formData.email_usuario}
                onChange={handleChange}
                placeholder="tu@email.com"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">Este será tu usuario para iniciar sesión</p>
            </div>

            <div>
              <Label htmlFor="password">Contraseña *</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Mínimo 6 caracteres"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="password_confirm">Confirmar contraseña *</Label>
              <Input
                id="password_confirm"
                name="password_confirm"
                type="password"
                value={formData.password_confirm}
                onChange={handleChange}
                placeholder="Repite la contraseña"
                className="mt-1"
              />
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Atrás
              </Button>
              <Button onClick={handleNext} className="flex-1 bg-sky-600 hover:bg-sky-700">
                Siguiente
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Confirmación */}
        {step === 'confirmacion' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-sky-600" />
              <h2 className="text-lg font-semibold">Confirma tus datos</h2>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase">Taller</p>
                <p className="font-semibold text-gray-900">{formData.nombre_taller}</p>
                <p className="text-sm text-gray-600">CIF: {formData.cif}</p>
                {formData.direccion && <p className="text-sm text-gray-600">{formData.direccion}</p>}
              </div>

              <div className="border-t pt-3">
                <p className="text-xs text-gray-500 uppercase">Administrador</p>
                <p className="font-semibold text-gray-900">{formData.nombre_usuario}</p>
                <p className="text-sm text-gray-600">{formData.email_usuario}</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800">
                Al registrarte aceptas los términos de uso y política de privacidad de TallerAgil.
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={handleBack} className="flex-1" disabled={loading}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Atrás
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Crear mi taller
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            ¿Ya tienes cuenta?{' '}
            <Link href="/auth/login" className="text-sky-600 hover:underline font-medium">
              Iniciar sesión
            </Link>
          </p>
        </div>
      </Card>
    </div>
  )
}
