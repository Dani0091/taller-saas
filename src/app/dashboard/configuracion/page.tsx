'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Loader2, Settings, Upload, X, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'

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
}

export default function ConfiguracionPage() {
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<Config | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchConfig()
  }, [])

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
    try {
      setLoading(true)
      const tallerId = localStorage.getItem('taller_id')

      if (!tallerId) {
        toast.error('No se encontró taller')
        setLoading(false)
        return
      }

      const response = await fetch(`/api/taller/config/obtener?taller_id=${tallerId}`)
      const data = await response.json()

      const configData = {
        ...data,
        tarifa_con_iva: data.tarifa_con_iva !== undefined ? data.tarifa_con_iva : true,
        tarifa_hora: data.tarifa_hora || 45.00,
        incluye_iva: data.incluye_iva !== undefined ? data.incluye_iva : true,
        porcentaje_iva: data.porcentaje_iva || 21.00,
        logo_url: data.logo_url || null,
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target

    setFormData(prev => prev ? {
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'tarifa_hora' || name === 'porcentaje_iva' ? parseFloat(value) : value)
    } : null)
  }

  const handleRadioChange = (value: boolean) => {
    setFormData(prev => prev ? { ...prev, tarifa_con_iva: value } : null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData) return

    setSaving(true)
    try {
      const tallerId = localStorage.getItem('taller_id')

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
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const updatedConfig = {
          ...data,
          tarifa_con_iva: data.tarifa_con_iva !== undefined ? data.tarifa_con_iva : true,
        }
        setConfig(updatedConfig)
        setFormData(updatedConfig)
        toast.success('Configuración guardada correctamente')
      } else {
        toast.error('Error al guardar')
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl md:text-4xl font-bold">Configuración del Taller</h1>
          </div>
          <p className="text-gray-600">Gestiona la tarifa, IVA y datos de tu taller</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Datos de la Empresa */}
          <Card className="p-6 md:p-8 shadow-sm">
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
                  <span className="text-xl font-bold text-blue-600">€</span>
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
                  <p className="text-2xl font-bold text-blue-600 mt-2">€{(tarifaBase * 2).toFixed(2)}</p>
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

          {/* Botones */}
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={fetchConfig}
              className="px-6"
            >
              Descartar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="px-8 gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Guardando...' : 'Guardar Configuración'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
