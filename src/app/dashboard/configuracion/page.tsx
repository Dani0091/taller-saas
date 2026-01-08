'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Settings, Upload, X, Image as ImageIcon, FileText, CreditCard, Palette } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface Config {
  id: string | null
  taller_id: string
  tarifa_hora: number
  incluye_iva: boolean
  porcentaje_iva: number
  tarifa_con_iva: boolean
  nombre_empresa: string | null
  cif: string | null
  direccion: string | null
  telefono: string | null
  email: string | null
  logo_url: string | null
  // Configuración de facturación
  serie_factura: string | null
  numero_factura_inicial: number | null
  iban: string | null
  condiciones_pago: string | null
  notas_factura: string | null
  // Colores de marca
  color_primario: string | null
  color_secundario: string | null
}

export default function ConfiguracionPage() {
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<Config | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [tallerId, setTallerId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Obtener taller_id del usuario autenticado
  useEffect(() => {
    const obtenerTallerId = async () => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session?.user?.email) {
          toast.error('No hay sesión activa')
          setLoading(false)
          return
        }

        const { data: usuario, error } = await supabase
          .from('usuarios')
          .select('taller_id')
          .eq('email', session.user.email)
          .single()

        if (error || !usuario) {
          toast.error('No se pudo obtener datos del usuario')
          setLoading(false)
          return
        }

        setTallerId(usuario.taller_id)
      } catch (error) {
        console.error('Error obteniendo taller_id:', error)
        toast.error('Error de autenticación')
        setLoading(false)
      }
    }
    obtenerTallerId()
  }, [])

  // Cargar config cuando tengamos taller_id
  useEffect(() => {
    if (tallerId) {
      fetchConfig()
    }
  }, [tallerId])

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes')
      return
    }

    // Validar tamaño (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('El archivo es demasiado grande (máx. 2MB)')
      return
    }

    // Convertir a base64
    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      setLogoPreview(base64)
      setFormData(prev => prev ? { ...prev, logo_url: base64 } : null)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveLogo = () => {
    setLogoPreview(null)
    setFormData(prev => prev ? { ...prev, logo_url: null } : null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const fetchConfig = async () => {
    if (!tallerId) return

    try {
      setLoading(true)
      const response = await fetch(`/api/taller/config/obtener?taller_id=${tallerId}`)
      const data = await response.json()

      const configData = {
        ...data,
        tarifa_con_iva: data.tarifa_con_iva !== undefined ? data.tarifa_con_iva : true,
        tarifa_hora: data.tarifa_hora || 45.00,
        incluye_iva: data.incluye_iva !== undefined ? data.incluye_iva : true,
        porcentaje_iva: data.porcentaje_iva || 21.00,
        logo_url: data.logo_url || null,
        // Nuevos campos de facturación
        serie_factura: data.serie_factura || 'FA',
        numero_factura_inicial: data.numero_factura_inicial || 1,
        iban: data.iban || null,
        condiciones_pago: data.condiciones_pago || 'Pago a 30 días',
        notas_factura: data.notas_factura || null,
        // Colores de marca
        color_primario: data.color_primario || '#0284c7',
        color_secundario: data.color_secundario || '#0369a1',
      }

      setConfig(configData)
      setFormData(configData)
      if (data.logo_url) {
        setLogoPreview(data.logo_url)
      }
    } catch (error) {
      toast.error('Error al cargar configuración')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    const isCheckbox = (e.target as HTMLInputElement).type === 'checkbox'
    const checked = isCheckbox ? (e.target as HTMLInputElement).checked : undefined

    setFormData(prev => prev ? {
      ...prev,
      [name]: isCheckbox
        ? checked
        : (name === 'tarifa_hora' || name === 'porcentaje_iva' || name === 'numero_factura_inicial'
          ? parseFloat(value) || 0
          : value)
    } : null)
  }

  const handleRadioChange = (value: boolean) => {
    setFormData(prev => prev ? { ...prev, tarifa_con_iva: value } : null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData || !tallerId) return

    setSaving(true)
    try {
      const response = await fetch(`/api/taller/config/actualizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taller_id: tallerId,
          tarifa_hora: formData.tarifa_hora,
          incluye_iva: formData.incluye_iva,
          porcentaje_iva: formData.porcentaje_iva,
          tarifa_con_iva: formData.tarifa_con_iva,
          nombre_empresa: formData.nombre_empresa,
          cif: formData.cif,
          direccion: formData.direccion,
          telefono: formData.telefono,
          email: formData.email,
          logo_url: formData.logo_url,
          // Nuevos campos de facturación
          serie_factura: formData.serie_factura,
          numero_factura_inicial: formData.numero_factura_inicial,
          iban: formData.iban,
          condiciones_pago: formData.condiciones_pago,
          notas_factura: formData.notas_factura,
          // Colores de marca
          color_primario: formData.color_primario,
          color_secundario: formData.color_secundario,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        // La API devuelve { success: true, data: {...} }
        const configData = result.data || result
        const updatedConfig = {
          ...formData, // Mantener valores actuales como base
          ...configData, // Sobrescribir con valores de la API
          // Asegurar valores por defecto para campos numéricos
          tarifa_hora: configData.tarifa_hora ?? formData.tarifa_hora ?? 45.00,
          porcentaje_iva: configData.porcentaje_iva ?? formData.porcentaje_iva ?? 21.00,
          tarifa_con_iva: configData.tarifa_con_iva !== undefined ? configData.tarifa_con_iva : true,
        }
        setConfig(updatedConfig)
        setFormData(updatedConfig)
        toast.success('Configuración guardada correctamente')
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Error al guardar')
      }
    } catch (error) {
      toast.error('Error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <p className="text-gray-500">Cargando configuración...</p>
      </div>
    )
  }

  if (!formData) {
    return (
      <div className="flex justify-center items-center py-16">
        <p className="text-gray-500">Error al cargar</p>
      </div>
    )
  }

  // Calcular tarifa base (sin IVA) y con IVA
  const tarifaBase = formData.tarifa_con_iva 
    ? formData.tarifa_hora / (1 + formData.porcentaje_iva / 100)
    : formData.tarifa_hora

  const tarifaConIva = formData.tarifa_con_iva
    ? formData.tarifa_hora
    : formData.tarifa_hora * (1 + formData.porcentaje_iva / 100)

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Settings className="w-6 h-6 md:w-8 md:h-8 text-sky-600" />
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Configuración</h1>
        </div>
        <p className="text-gray-600">Gestiona la tarifa, IVA y datos de tu taller</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Datos de la Empresa */}
        <Card className="p-4 md:p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-6 pb-4 border-b">Datos de la Empresa</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="nombre_empresa" className="block text-sm font-semibold mb-2">
                  Nombre de la Empresa
                </Label>
                <Input
                  id="nombre_empresa"
                  name="nombre_empresa"
                  placeholder="Ej: Mi Taller SL"
                  value={formData.nombre_empresa || ''}
                  onChange={handleChange}
                  className="w-full"
                />
              </div>

              <div>
                <Label htmlFor="cif" className="block text-sm font-semibold mb-2">
                  CIF/NIF
                </Label>
                <Input
                  id="cif"
                  name="cif"
                  placeholder="Ej: A12345678"
                  value={formData.cif || ''}
                  onChange={handleChange}
                  className="w-full"
                />
              </div>

              <div>
                <Label htmlFor="email" className="block text-sm font-semibold mb-2">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="correo@taller.com"
                  value={formData.email || ''}
                  onChange={handleChange}
                  className="w-full"
                />
              </div>

              <div>
                <Label htmlFor="telefono" className="block text-sm font-semibold mb-2">
                  Teléfono
                </Label>
                <Input
                  id="telefono"
                  name="telefono"
                  placeholder="+34 123 456 789"
                  value={formData.telefono || ''}
                  onChange={handleChange}
                  className="w-full"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="direccion" className="block text-sm font-semibold mb-2">
                  Dirección
                </Label>
                <Input
                  id="direccion"
                  name="direccion"
                  placeholder="Calle Principal 123, 28001 Madrid"
                  value={formData.direccion || ''}
                  onChange={handleChange}
                  className="w-full"
                />
              </div>

              {/* Logo Upload */}
              <div className="md:col-span-2">
                <Label className="block text-sm font-semibold mb-2">
                  Logo de la Empresa
                </Label>
                <div className="flex items-start gap-4">
                  {/* Preview */}
                  <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <ImageIcon className="w-12 h-12 text-gray-300" />
                    )}
                  </div>

                  {/* Upload Controls */}
                  <div className="flex-1 space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-upload"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        Subir Logo
                      </Button>
                      {logoPreview && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleRemoveLogo}
                          className="gap-2 text-red-600 hover:bg-red-50"
                        >
                          <X className="w-4 h-4" />
                          Eliminar
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      Formatos: JPG, PNG, GIF. Máximo 2MB.
                    </p>
                    <p className="text-xs text-gray-500">
                      El logo aparecerá en las facturas PDF.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Tarifa y Fiscalidad */}
          <Card className="p-6 md:p-8 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <h2 className="text-xl font-bold mb-6 pb-4 border-b border-blue-200">Tarifa y Fiscalidad</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Tipo de tarifa */}
              <div>
                <Label className="block text-sm font-semibold mb-3">Precio por Hora</Label>
                <div className="space-y-2">
                  <div 
                    className="flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer"
                    style={{
                      borderColor: !formData.tarifa_con_iva ? '#3b82f6' : '#e5e7eb',
                      backgroundColor: !formData.tarifa_con_iva ? '#eff6ff' : '#f9fafb'
                    }}
                    onClick={() => handleRadioChange(false)}
                  >
                    <input
                      type="radio"
                      id="sin_iva"
                      name="tarifa_type"
                      checked={!formData.tarifa_con_iva}
                      onChange={() => handleRadioChange(false)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="sin_iva" className="cursor-pointer text-sm font-medium flex-1">
                      Sin IVA (base)
                    </label>
                  </div>

                  <div 
                    className="flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer"
                    style={{
                      borderColor: formData.tarifa_con_iva ? '#3b82f6' : '#e5e7eb',
                      backgroundColor: formData.tarifa_con_iva ? '#eff6ff' : '#f9fafb'
                    }}
                    onClick={() => handleRadioChange(true)}
                  >
                    <input
                      type="radio"
                      id="con_iva"
                      name="tarifa_type"
                      checked={formData.tarifa_con_iva}
                      onChange={() => handleRadioChange(true)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="con_iva" className="cursor-pointer text-sm font-medium flex-1">
                      Con IVA (final)
                    </label>
                  </div>
                </div>
              </div>

              {/* Input de tarifa */}
              <div>
                <Label htmlFor="tarifa_hora" className="block text-sm font-semibold mb-2">
                  Tarifa por Hora ({formData.tarifa_con_iva ? 'Con IVA' : 'Sin IVA'}) (€)
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-sky-600">€</span>
                  <Input
                    id="tarifa_hora"
                    name="tarifa_hora"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.tarifa_hora}
                    onChange={handleChange}
                    className="flex-1 text-lg font-bold"
                  />
                  <span className="text-sm text-gray-600">/h</span>
                </div>
              </div>

              {/* IVA */}
              <div>
                <Label htmlFor="porcentaje_iva" className="block text-sm font-semibold mb-2">
                  Porcentaje IVA (%)
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="porcentaje_iva"
                    name="porcentaje_iva"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.porcentaje_iva}
                    onChange={handleChange}
                    className="flex-1 text-lg font-bold"
                  />
                  <span className="text-sm text-gray-600">%</span>
                </div>
              </div>

              {/* Incluir IVA en facturas */}
              <div>
                <Label className="block text-sm font-semibold mb-2">
                  Facturas
                </Label>
                <div className="flex items-center gap-3 mt-3 p-3 bg-white rounded-lg border border-blue-200">
                  <input
                    type="checkbox"
                    id="incluye_iva"
                    name="incluye_iva"
                    checked={formData.incluye_iva}
                    onChange={handleChange}
                    className="w-5 h-5 cursor-pointer"
                  />
                  <label htmlFor="incluye_iva" className="cursor-pointer text-sm font-medium">
                    Mostrar IVA desglosado
                  </label>
                </div>
              </div>
            </div>

            {/* Previsualización */}
            <div className="mt-6 pt-6 border-t border-blue-200">
              <p className="text-sm text-gray-700 mb-4 font-semibold">
                Ejemplo de factura: 2 horas de trabajo
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                <div className="bg-white p-4 rounded-lg border border-blue-100">
                  <p className="text-gray-600 text-xs uppercase">Base Imponible</p>
                  <p className="text-2xl font-bold text-sky-600 mt-2">€{(tarifaBase * 2).toFixed(2)}</p>
                </div>

                {formData.incluye_iva && (
                  <div className="bg-white p-4 rounded-lg border border-orange-100">
                    <p className="text-gray-600 text-xs uppercase">IVA ({formData.porcentaje_iva}%)</p>
                    <p className="text-2xl font-bold text-orange-600 mt-2">
                      €{((tarifaBase * 2 * formData.porcentaje_iva) / 100).toFixed(2)}
                    </p>
                  </div>
                )}

                <div className="bg-white p-4 rounded-lg border border-green-100 md:col-span={formData.incluye_iva ? 1 : 2}">
                  <p className="text-gray-600 text-xs uppercase">Total {formData.incluye_iva ? 'con IVA' : 'factura'}</p>
                  <p className="text-2xl font-bold text-green-600 mt-2">
                    €{(tarifaConIva * 2).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                <p className="text-xs text-gray-600 uppercase font-semibold mb-2">Conversión:</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600">Base (sin IVA):</p>
                    <p className="font-bold">€{tarifaBase.toFixed(2)}/h</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Total (con IVA):</p>
                    <p className="font-bold">€{tarifaConIva.toFixed(2)}/h</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Configuración de Facturación */}
          <Card className="p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-6 pb-4 border-b">
              <FileText className="w-6 h-6 text-sky-600" />
              <h2 className="text-xl font-bold">Configuración de Facturación</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Serie de factura */}
              <div>
                <Label htmlFor="serie_factura" className="block text-sm font-semibold mb-2">
                  Serie de Factura
                </Label>
                <Input
                  id="serie_factura"
                  name="serie_factura"
                  placeholder="FA"
                  value={formData.serie_factura || ''}
                  onChange={handleChange}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Prefijo para tus facturas (ej: FA, 2024/, F-)
                </p>
              </div>

              {/* Número inicial */}
              <div>
                <Label htmlFor="numero_factura_inicial" className="block text-sm font-semibold mb-2">
                  Número Inicial de Factura
                </Label>
                <Input
                  id="numero_factura_inicial"
                  name="numero_factura_inicial"
                  type="number"
                  min="1"
                  placeholder="1"
                  value={formData.numero_factura_inicial || ''}
                  onChange={handleChange}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Para continuar tu numeración actual
                </p>
              </div>

              {/* Preview de numeración */}
              <div className="md:col-span-2 p-4 bg-sky-50 rounded-lg border border-sky-200">
                <p className="text-sm text-sky-800">
                  <strong>Ejemplo:</strong> Tu próxima factura será{' '}
                  <span className="font-mono bg-white px-2 py-1 rounded border">
                    {formData.serie_factura || 'FA'}{String(formData.numero_factura_inicial || 1).padStart(3, '0')}
                  </span>
                </p>
              </div>

              {/* Aviso importante */}
              <div className="md:col-span-2 p-4 bg-amber-50 rounded-lg border border-amber-300">
                <p className="text-sm text-amber-800 font-medium mb-1">
                  ⚠️ Importante sobre la numeración
                </p>
                <p className="text-xs text-amber-700">
                  Si ya tienes facturas emitidas, cambiar la serie o el número inicial podría causar
                  conflictos en la numeración secuencial. La ley exige que las facturas sigan una
                  numeración correlativa sin saltos ni duplicados. Solo modifica estos valores si
                  estás empezando o si necesitas continuar una numeración existente.
                </p>
              </div>
            </div>
          </Card>

          {/* Datos Bancarios */}
          <Card className="p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-6 pb-4 border-b">
              <CreditCard className="w-6 h-6 text-sky-600" />
              <h2 className="text-xl font-bold">Datos Bancarios y Condiciones</h2>
            </div>

            <div className="space-y-6">
              {/* IBAN */}
              <div>
                <Label htmlFor="iban" className="block text-sm font-semibold mb-2">
                  IBAN (Cuenta bancaria)
                </Label>
                <Input
                  id="iban"
                  name="iban"
                  placeholder="ES00 0000 0000 0000 0000 0000"
                  value={formData.iban || ''}
                  onChange={handleChange}
                  className="w-full font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Aparecerá en las facturas para pagos por transferencia
                </p>
              </div>

              {/* Condiciones de pago */}
              <div>
                <Label htmlFor="condiciones_pago" className="block text-sm font-semibold mb-2">
                  Condiciones de Pago por Defecto
                </Label>
                <Input
                  id="condiciones_pago"
                  name="condiciones_pago"
                  placeholder="Pago a 30 días"
                  value={formData.condiciones_pago || ''}
                  onChange={handleChange}
                  className="w-full"
                />
              </div>

              {/* Notas por defecto en facturas */}
              <div>
                <Label htmlFor="notas_factura" className="block text-sm font-semibold mb-2">
                  Notas Legales / Pie de Factura
                </Label>
                <Textarea
                  id="notas_factura"
                  name="notas_factura"
                  placeholder="Ej: Inscrito en el Registro Mercantil de... / Garantía de 2 años en reparaciones..."
                  value={formData.notas_factura || ''}
                  onChange={handleChange}
                  rows={3}
                  className="w-full resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Este texto aparecerá en todas tus facturas
                </p>
              </div>
            </div>
          </Card>

          {/* Colores de Marca */}
          <Card className="p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-6 pb-4 border-b">
              <Palette className="w-6 h-6 text-sky-600" />
              <h2 className="text-xl font-bold">Colores de Marca</h2>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              Personaliza los colores de tus facturas PDF para que coincidan con tu identidad de marca.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Color primario */}
              <div>
                <Label htmlFor="color_primario" className="block text-sm font-semibold mb-2">
                  Color Primario (Cabecera)
                </Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    id="color_primario"
                    name="color_primario"
                    value={formData.color_primario || '#0284c7'}
                    onChange={handleChange}
                    className="w-12 h-12 rounded-lg border-2 border-gray-200 cursor-pointer"
                  />
                  <Input
                    name="color_primario"
                    value={formData.color_primario || '#0284c7'}
                    onChange={handleChange}
                    placeholder="#0284c7"
                    className="flex-1 font-mono"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Se usa en la cabecera de la factura
                </p>
              </div>

              {/* Color secundario */}
              <div>
                <Label htmlFor="color_secundario" className="block text-sm font-semibold mb-2">
                  Color Secundario (Acentos)
                </Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    id="color_secundario"
                    name="color_secundario"
                    value={formData.color_secundario || '#0369a1'}
                    onChange={handleChange}
                    className="w-12 h-12 rounded-lg border-2 border-gray-200 cursor-pointer"
                  />
                  <Input
                    name="color_secundario"
                    value={formData.color_secundario || '#0369a1'}
                    onChange={handleChange}
                    placeholder="#0369a1"
                    className="flex-1 font-mono"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Se usa en títulos y totales
                </p>
              </div>

              {/* Preview de colores */}
              <div className="md:col-span-2 p-4 rounded-lg border border-gray-200">
                <p className="text-sm font-semibold mb-3">Vista previa:</p>
                <div className="flex items-center gap-4">
                  <div
                    className="w-full h-12 rounded-lg flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: formData.color_primario || '#0284c7' }}
                  >
                    Cabecera de Factura
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3">
                  <div
                    className="px-4 py-2 rounded text-white font-semibold"
                    style={{ backgroundColor: formData.color_secundario || '#0369a1' }}
                  >
                    Total: €1.234,56
                  </div>
                  <p
                    className="font-semibold"
                    style={{ color: formData.color_secundario || '#0369a1' }}
                  >
                    Texto de acento
                  </p>
                </div>
              </div>

              {/* Presets de colores */}
              <div className="md:col-span-2">
                <p className="text-sm font-semibold mb-2">Presets rápidos:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: 'Azul', primary: '#0284c7', secondary: '#0369a1' },
                    { name: 'Verde', primary: '#059669', secondary: '#047857' },
                    { name: 'Rojo', primary: '#dc2626', secondary: '#b91c1c' },
                    { name: 'Naranja', primary: '#ea580c', secondary: '#c2410c' },
                    { name: 'Morado', primary: '#7c3aed', secondary: '#6d28d9' },
                    { name: 'Gris', primary: '#475569', secondary: '#334155' },
                  ].map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setFormData(prev => prev ? {
                        ...prev,
                        color_primario: preset.primary,
                        color_secundario: preset.secondary
                      } : null)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50 transition-colors"
                    >
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: preset.primary }}
                      />
                      <span className="text-sm">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

      {/* Botones */}
      <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={fetchConfig}
          className="px-6 order-2 sm:order-1"
        >
          Descartar
        </Button>
        <Button
          type="submit"
          disabled={saving}
          className="px-8 gap-2 bg-sky-600 hover:bg-sky-700 order-1 sm:order-2"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
      </form>
    </div>
  )
}
