'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Settings, Upload, X, Image as ImageIcon, FileText, CreditCard, Palette, Users, Save, Plus, Trash2, Edit2, List } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { GoogleCalendarConnection } from '@/components/dashboard/configuracion/google-calendar-connection'

// Importaciones Senior Level para Data Mismatch
import { masterConverter } from '@/lib/utils/master-converter'

// ==================== INTERFACES UNIFICADAS - FUENTE ÚNICA DE VERDAD ====================

interface ConfigTaller {
  id?: string
  taller_id: string
  nombre_taller?: string
  nombre_empresa?: string
  nif?: string
  telefono: string
  email: string
  direccion?: string
  codigo_postal?: string
  ciudad?: string
  provincia?: string
  pais?: string
  logo_url?: string | null
  firma_url?: string | null
  tarifa_hora: number
  iva_default?: number
  porcentaje_anticipo?: number | null
  plazo_pago_dias?: number | null
  moneda?: string
  idioma?: string
  formato_fecha?: string
  iban?: string | null
  condiciones_pago?: string | null
  notas_factura?: string | null
  color_primario?: string | null
  color_secundario?: string | null
  serie_factura?: string | null
  numero_factura_inicial?: number | null
}

interface TarifaConfig {
  id?: string
  tipo_cliente: string
  tarifa_hora: number
  tarifa_hora_urgente: number | null
  descuento_piezas_porcentaje: number
  descuento_mano_obra_porcentaje: number
  dias_pago: number
  limite_credito: number | null
  activo: boolean
}

interface SerieConfig {
  id?: string
  taller_id?: string
  nombre: string
  prefijo: string
  ultimo_numero: number
  activa: boolean
}

// ==================== ALIAS PARA COMPATIBILIDAD ====================
// Mantenemos compatibilidad con el código existente
type Tarifa = TarifaConfig
type SerieFacturacion = SerieConfig

// ==================== VALORES POR DEFECTO UNIFICADOS ====================
const CONFIG_DEFAULTS: ConfigTaller = {
  taller_id: '',
  telefono: '',
  email: '',
  pais: 'España',
  logo_url: null,
  firma_url: null,
  tarifa_hora: 45.00,
  iva_default: 21.00,
  moneda: 'EUR',
  idioma: 'es',
  formato_fecha: 'dd/MM/yyyy',
  iban: null,
  condiciones_pago: null,
  notas_factura: null,
  color_primario: null,
  color_secundario: null,
}

const TARIFA_DEFAULTS: TarifaConfig = {
  tipo_cliente: '',
  tarifa_hora: 45.00,
  tarifa_hora_urgente: null,
  descuento_piezas_porcentaje: 0,
  descuento_mano_obra_porcentaje: 0,
  dias_pago: 30,
  limite_credito: null,
  activo: true,
}

const SERIE_DEFAULTS: SerieConfig = {
  nombre: '',
  prefijo: '',
  ultimo_numero: 0,
  activa: true,
}

interface TarifaConfig {
  id?: string
  tipo_cliente: string
  tarifa_hora: number  // Siempre number
  tarifa_hora_urgente: number | null
  descuento_piezas_porcentaje: number  // Siempre number
  descuento_mano_obra_porcentaje: number  // Siempre number
  dias_pago: number  // Siempre number
  limite_credito: number | null
  activo: boolean
}

interface SerieConfig {
  id?: string
  nombre: string
  prefijo: string
  ultimo_numero: number  // Siempre number
  activa: boolean
}

// Valores por defecto para prevenir undefined
const CONFIG_DEFAULTS: ConfigTaller = {
  taller_id: '',
  nombre_taller: '',
  nif: '',
  telefono: '',
  email: '',
  direccion: '',
  codigo_postal: '',
  ciudad: '',
  provincia: '',
  pais: 'España',
  logo_url: null,
  firma_url: null,
  tarifa_hora: 45.00,  // Por defecto 45€
  iva_default: 21.00,  // Por defecto 21%
  porcentaje_anticipo: null,
  plazo_pago_dias: null,
  moneda: 'EUR',
  idioma: 'es',
  formato_fecha: 'dd/MM/yyyy',
  iban: null,
  condiciones_pago: null,
  notas_factura: null,
  color_primario: null,
  color_secundario: null,
}

const TARIFA_DEFAULTS: TarifaConfig = {
  tipo_cliente: '',
  tarifa_hora: 45.00,
  tarifa_hora_urgente: null,
  descuento_piezas_porcentaje: 0,
  descuento_mano_obra_porcentaje: 0,
  dias_pago: 30,
  limite_credito: null,
  activo: true,
}

const SERIE_DEFAULTS: SerieConfig = {
  nombre: '',
  prefijo: '',
  ultimo_numero: 0,
  activa: true,
}

interface Tarifa {
  id?: string
  tipo_cliente: string
  tarifa_hora: number
  tarifa_hora_urgente: number | null
  descuento_piezas_porcentaje: number
  descuento_mano_obra_porcentaje: number
  dias_pago: number
  limite_credito: number | null
  activo: boolean
}

interface SerieFacturacion {
  id: string
  taller_id: string
  nombre: string
  prefijo: string
  ultimo_numero: number
  activa: boolean // ✅ CAMPO AÑADIDO - UNIFICACIÓN CON SerieConfig
}

// ✅ UNIFICACIÓN DE TIPOS - Ambas interfaces ahora son iguales
type SerieConfig = SerieFacturacion

const TIPOS_CLIENTE = [
  { value: 'particular', label: 'Particular', icon: '👤', desc: 'Clientes individuales' },
  { value: 'empresa', label: 'Empresa', icon: '🏢', desc: 'Empresas y sociedades' },
  { value: 'autonomo', label: 'Autónomo', icon: '💼', desc: 'Trabajadores autónomos' },
  { value: 'flota', label: 'Flota', icon: '🚗', desc: 'Gestores de flotas' },
]

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
  const [config, setConfig] = useState<ConfigTaller | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<ConfigTaller | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [tallerId, setTallerId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Estado para tarifas por tipo de cliente - Tipado explícito
  const [tarifas, setTarifas] = useState<TarifaConfig[]>([])
  const [tarifaEditando, setTarifaEditando] = useState<string | null>(null)
  const [guardandoTarifa, setGuardandoTarifa] = useState<string | null>(null)

  // Estado para series de facturación - Tipado explícito
  const [series, setSeries] = useState<SerieConfig[]>([])
  const [cargandoSeries, setCargandoSeries] = useState(false)
  const [mostrarFormSerie, setMostrarFormSerie] = useState(false)
  const [serieEditando, setSerieEditando] = useState<SerieConfig | null>(null)
  const [formSerie, setFormSerie] = useState<SerieConfig>(SERIE_DEFAULTS)

  // Estado para tarifa individual - Tipado explícito para prevenir errores
  const [formTarifa, setFormTarifa] = useState<TarifaConfig>(TARIFA_DEFAULTS)

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

  // Cargar config y tarifas cuando tengamos taller_id
  useEffect(() => {
    if (tallerId) {
      fetchConfig()
      fetchTarifas()
      fetchSeries()
    }
  }, [tallerId])

  const fetchTarifas = async () => {
    try {
      const response = await fetch('/api/tarifas')
      const data = await response.json()

      if (data.tarifas) {
        setTarifas(data.tarifas)
      }
    } catch (error) {
      console.error('Error cargando tarifas:', error)
    }
  }

  const getTarifaPorTipo = (tipo: string): Tarifa => {
    const tarifa = tarifas.find(t => t.tipo_cliente === tipo)
    return tarifa || {
      tipo_cliente: tipo,
      tarifa_hora: formData?.tarifa_hora ?? CONFIG_DEFAULTS.tarifa_hora,
      tarifa_hora_urgente: null,
      descuento_piezas_porcentaje: 0,
      descuento_mano_obra_porcentaje: 0,
      dias_pago: 0,
      limite_credito: null,
      activo: true
    }
  }

  const guardarTarifa = async (tarifa: Tarifa) => {
    setGuardandoTarifa(tarifa.tipo_cliente)
    try {
      const response = await fetch('/api/tarifas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tarifa)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }

      const data = await response.json()

      // Actualizar la lista de tarifas
      setTarifas(prev => {
        const exists = prev.find(t => t.tipo_cliente === tarifa.tipo_cliente)
        if (exists) {
          return prev.map(t => t.tipo_cliente === tarifa.tipo_cliente ? data.tarifa : t)
        } else {
          return [...prev, data.tarifa]
        }
      })

      setTarifaEditando(null)
      toast.success(`Tarifa ${TIPOS_CLIENTE.find(t => t.value === tarifa.tipo_cliente)?.label} guardada`)
    } catch (error: any) {
      toast.error(error.message || 'Error guardando tarifa')
    } finally {
      setGuardandoTarifa(null)
    }
  }

  const fetchSeries = async () => {
    if (!tallerId) return

    try {
      setCargandoSeries(true)
      const response = await fetch(`/api/series/obtener?taller_id=${tallerId}`)
      const data = await response.json()

      if (data.series) {
        setSeries(data.series)
      }
    } catch (error) {
      console.error('Error cargando series:', error)
      toast.error('Error al cargar series')
    } finally {
      setCargandoSeries(false)
    }
  }

  const handleCrearSerie = async () => {
    if (!formSerie.nombre || !formSerie.prefijo) {
      toast.error('Nombre y prefijo son requeridos')
      return
    }

    if (!tallerId) {
      toast.error('No se encontró el taller')
      return
    }

    try {
      const response = await fetch('/api/series/crear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taller_id: tallerId,
          nombre: formSerie.nombre,
          prefijo: formSerie.prefijo.toUpperCase(),
          ultimo_numero: formSerie.ultimo_numero || 0,
          activa: true // ✅ CAMPO AÑADIDO - REGLA DEL OBJETO COMPLETO
        })
      })

      const data = await response.json()

      if (data.error) {
        toast.error(data.error)
      } else {
        toast.success('Serie creada correctamente')
        fetchSeries()
        setMostrarFormSerie(false)
        setFormSerie(SERIE_DEFAULTS) // ✅ USAR DEFAULTS - REGLA DEL OBJETO COMPLETO
      }
    } catch (error) {
      console.error('Error creando serie:', error)
      toast.error('Error al crear serie')
    }
  }

  const handleActualizarSerie = async () => {
    if (!serieEditando || !formSerie.nombre || !formSerie.prefijo) {
      toast.error('Nombre y prefijo son requeridos')
      return
    }

    try {
      const response = await fetch('/api/series/actualizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: serieEditando.id,
            nombre: formSerie.nombre,
            prefijo: formSerie.prefijo.toUpperCase(),
            ultimo_numero: formSerie.ultimo_numero,
            activa: serieEditando?.activa ?? true // ✅ CAMPO AÑADIDO - REGLA DEL OBJETO COMPLETO
          })
      })

      const data = await response.json()

      if (data.error) {
        toast.error(data.error)
      } else {
        toast.success('Serie actualizada correctamente')
        fetchSeries()
        setSerieEditando(null)
        setFormSerie({ nombre: '', prefijo: '', ultimo_numero: 0, activa: false })
      }
    } catch (error) {
      console.error('Error actualizando serie:', error)
      toast.error('Error al actualizar serie')
    }
  }

  const handleEliminarSerie = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta serie? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      const response = await fetch('/api/series/eliminar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })

      const data = await response.json()

      if (data.error) {
        toast.error(data.error)
      } else {
        toast.success('Serie eliminada correctamente')
        fetchSeries()
      }
    } catch (error) {
      console.error('Error eliminando serie:', error)
      toast.error('Error al eliminar serie')
    }
  }

  const handleEditarSerie = (serie: SerieFacturacion) => {
    setSerieEditando(serie)
    setFormSerie({
      nombre: serie.nombre,
      prefijo: serie.prefijo,
      ultimo_numero: serie.ultimo_numero,
      activa: serie.activa ?? false // ✅ USO DEL OPERADOR ?? POR SI ACASO VENGA NULO
    })
    setMostrarFormSerie(true)
  }

  const handleCancelarFormSerie = () => {
    setMostrarFormSerie(false)
    setSerieEditando(null)
    setFormSerie({ nombre: '', prefijo: '', ultimo_numero: 0, activa: false })
  }

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
      // ✅ USO DEL OPERADOR ENCADENADO OPCIONAL - PREVIENE CRASHES
      setFormData(prev => prev ? { ...prev, logo_url: base64 } : prev)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveLogo = () => {
    setLogoPreview(null)
    // ✅ USO DEL OPERADOR ?? - PREVIENE CRASHES SI PREV ES NULL
    setFormData(prev => prev ? { ...prev, logo_url: null } : prev)
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
        tarifa_hora: data.tarifa_hora ?? CONFIG_DEFAULTS.tarifa_hora,
        incluye_iva: data.incluye_iva ?? true,
        porcentaje_iva: data.porcentaje_iva ?? CONFIG_DEFAULTS.iva_default,
        logo_url: data.logo_url ?? null,
        // Nuevos campos de facturación
        serie_factura: data.serie_factura ?? 'FA',
        numero_factura_inicial: data.numero_factura_inicial ?? 1,
        iban: data.iban || null,
        condiciones_pago: data.condiciones_pago || null,
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
            ? (value === '' ? 0 : Number(value))
            : value)
    } : null)
  }

const handleRadioChange = (value: boolean) => {
    // ✅ USO DEL OPERADOR ?? - PREVIENE CRASHES SI PREV ES NULL
    setFormData(prev => prev ? { ...prev, tarifa_con_iva: value } : prev)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData || !tallerId) return

    setSaving(true)
    try {
      // ✅ Estructura correcta para el fetch/update
      const response = await fetch(`/api/taller/config/actualizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taller_id: tallerId,
          tarifa_hora: Number(formData.tarifa_hora) || 0,
          porcentaje_iva: Number(formData.porcentaje_iva) || 0,
          incluye_iva: formData.incluye_iva ?? true,
          tarifa_con_iva: formData.tarifa_con_iva ?? true,
          nombre_empresa: formData.nombre_empresa || '',
          cif: formData.cif || '',
          direccion: formData.direccion || '',
          telefono: formData.telefono || '',
          email: formData.email || '',
          logo_url: formData.logo_url || null,
          serie_factura: formData.serie_factura || 'FA',
          numero_factura_inicial: Number(formData.numero_factura_inicial) || 1,
          iban: formData.iban || '',
          condiciones_pago: formData.condiciones_pago || null,
          notas_factura: formData.notas_factura || null,
          color_primario: formData.color_primario || null,
          color_secundario: formData.color_secundario || null,
        }), // Este cierra el JSON.stringify
      }); // Este cierra el fetch

      if (response.ok) {
        const result = await response.json()
        const configData = result.data || result
        const updatedConfig = {
          ...formData,
          ...configData,
          tarifa_hora: Number(configData.tarifa_hora) || Number(formData.tarifa_hora) || CONFIG_DEFAULTS.tarifa_hora,
          porcentaje_iva: Number(configData.porcentaje_iva) || Number(formData.porcentaje_iva) || CONFIG_DEFAULTS.iva_default,
          tarifa_con_iva: configData.tarifa_con_iva ?? true,
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
                placeholder="Calle Principal 123, 46001 Valencia"
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
                <NumberInput
                  id="tarifa_hora"
                  name="tarifa_hora"
                  value={formData.tarifa_hora}
                  onChange={(value) => {
                    if (value !== null && value !== undefined) {
                      setFormData(prev => prev ? { ...prev, tarifa_hora: value } : null)
                    }
                  }}
                  min={0}
                  step={0.01}
                  placeholder="45.00"
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
                <NumberInput
                  id="porcentaje_iva"
                  name="porcentaje_iva"
                  value={formData.porcentaje_iva}
                  onChange={(value) => {
                    if (value !== null && value !== undefined) {
                      setFormData(prev => prev ? { ...prev, porcentaje_iva: value } : null)
                    }
                  }}
                  min={0}
                  max={100}
                  step={0.01}
                  placeholder="21.00"
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

          {/* Sistema Unificado de Series */}
          <div className="space-y-6">
            {/* Información de la serie por defecto */}
            <div className="p-4 bg-gradient-to-r from-sky-50 to-blue-50 rounded-lg border-2 border-sky-300">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sky-800 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Serie por Defecto (Configuración Rápida)
                </h3>
                <span className="px-2 py-1 bg-sky-600 text-white text-xs rounded-full">Fallback</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-600 font-semibold">Prefijo por Defecto</Label>
                  <Input
                    name="serie_factura"
                    placeholder="FA"
                    value={formData.serie_factura || ''}
                    onChange={handleChange}
                    className="font-mono text-lg font-bold"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Prefijo que se usará si no tienes series creadas
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600 font-semibold">Número Inicial</Label>
                  <NumberInput
                    value={formData.numero_factura_inicial}
                    onChange={(value) => {
                      if (value !== null && value !== undefined) {
                        setFormData(prev => prev ? { ...prev, numero_factura_inicial: value } : prev)
                      }
                    }}
                    placeholder="1"
                    className="font-mono"
                    min={1}
                    step={1}
                    allowEmpty={true}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Número inicial para nuevas series
                  </p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-white rounded border border-sky-200">
                <p className="text-xs text-sky-700 font-semibold mb-1">
                  Vista previa de próxima factura:
                </p>
                <p className="text-lg">
                  <span className="font-mono font-bold text-sky-600">
                    {formData.serie_factura || 'FA'}{String(formData.numero_factura_inicial || 1).padStart(3, '0')}
                  </span>
                </p>
              </div>
            </div>

            {/* Aviso importante mejorado */}
            <div className="p-4 bg-amber-50 rounded-lg border-2 border-amber-300">
              <p className="text-amber-900 font-semibold mb-2 flex items-center gap-2">
                <span className="text-xl">⚠️</span>
                Importante sobre Numeración de Facturas
              </p>
              <ul className="text-sm text-amber-800 space-y-1 ml-6 list-disc">
                <li>Las facturas deben seguir numeración correlativa sin saltos (requisito legal)</li>
                <li>Si creas series abajo, esas tendrán prioridad sobre esta configuración</li>
                <li>Solo modifica estos valores al empezar o para continuar numeración existente</li>
                <li>El sistema creará automáticamente las series la primera vez que factures</li>
              </ul>
            </div>

            {/* Series Adicionales */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <List className="w-4 h-4 text-purple-600" />
                    Series Adicionales
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Para rectificativas, abonos u otras series especiales
                  </p>
                </div>
              </div>

              {/* Lista de series existentes */}
              {cargandoSeries ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                </div>
              ) : series.length > 0 ? (
                <div className="space-y-2 mb-4">
                  {series.map((serie) => (
                    <div
                      key={serie.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border hover:border-purple-300 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <span className="font-mono font-bold text-purple-600 bg-purple-100 px-2 py-1 rounded">
                          {serie.prefijo}
                        </span>
                        <div>
                          <p className="font-medium text-gray-900">{serie.nombre}</p>
                          <p className="text-xs text-gray-500">
                            Próximo: {serie.prefijo}{(serie.ultimo_numero + 1).toString().padStart(3, '0')}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditarSerie(serie)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEliminarSerie(serie.id)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 bg-gray-50 rounded-lg border-2 border-dashed mb-4">
                  <p className="text-sm text-gray-500">Sin series adicionales</p>
                </div>
              )}

              {/* Formulario para crear/editar serie */}
              {mostrarFormSerie ? (
                <div className="p-4 bg-purple-50 rounded-lg border-2 border-purple-400 shadow-lg">
                  <h4 className="font-bold text-gray-900 mb-4">
                    {serieEditando ? 'Editar Serie' : 'Nueva Serie'}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <Label className="text-sm font-semibold mb-2">Nombre *</Label>
                      <Input
                        placeholder="Ej: Factura, Rectificativa"
                        value={formSerie.nombre}
                        onChange={(e) => setFormSerie({ ...formSerie, nombre: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold mb-2">Prefijo *</Label>
                      <Input
                        placeholder="Ej: FA, RE, AB"
                        value={formSerie.prefijo}
                        onChange={(e) => setFormSerie({ ...formSerie, prefijo: e.target.value.toUpperCase() })}
                        className="font-mono"
                        maxLength={5}
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold mb-2">Número Inicial</Label>
                      <NumberInput
                        value={formSerie.ultimo_numero}
                        onChange={(value) => {
                          const numeroConvertido = masterConverter(value, 'precio', { min: 0 })
                          setFormSerie({ ...formSerie, ultimo_numero: numeroConvertido })
                        }}
                        placeholder="0"
                        min={0}
                        step={1}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancelarFormSerie}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      onClick={serieEditando ? handleActualizarSerie : handleCrearSerie}
                      className="flex-1 bg-purple-600 hover:bg-purple-700"
                    >
                      {serieEditando ? 'Actualizar' : 'Crear Serie'}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  onClick={() => setMostrarFormSerie(true)}
                  className="w-full gap-2 bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="w-4 h-4" />
                  Nueva Serie de Facturación
                </Button>
              )}

              {/* Información importante */}
              <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-300">
                <p className="text-sm text-amber-800 font-medium mb-1">
                  ⚠️ Importante
                </p>
                <ul className="text-xs text-amber-700 space-y-1 ml-4 list-disc">
                  <li>Cada serie debe tener un prefijo único</li>
                  <li>El número inicial solo se usa al crear la serie</li>
                  <li>No puedes eliminar series que tengan facturas asociadas</li>
                  <li>El contador se incrementa automáticamente al crear facturas</li>
                </ul>
              </div>
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

        {/* Tarifas por Tipo de Cliente */}
        <Card className="p-6 md:p-8 shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-emerald-200">
            <Users className="w-6 h-6 text-emerald-600" />
            <h2 className="text-xl font-bold">Tarifas por Tipo de Cliente</h2>
          </div>

          <p className="text-sm text-gray-600 mb-6">
            Configura precios diferenciados para cada tipo de cliente. Si no configuras una tarifa
            específica, se usará la tarifa general del taller.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TIPOS_CLIENTE.map((tipo) => {
              const tarifa = getTarifaPorTipo(tipo.value)
              const editando = tarifaEditando === tipo.value
              const guardando = guardandoTarifa === tipo.value

              return (
                <div
                  key={tipo.value}
                  className={`p-4 rounded-xl border-2 transition-all ${editando
                    ? 'bg-white border-emerald-400 shadow-lg'
                    : tarifas.find(t => t.tipo_cliente === tipo.value)
                      ? 'bg-white border-emerald-200'
                      : 'bg-gray-50 border-gray-200'
                    }`}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{tipo.icon}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900">{tipo.label}</h3>
                        <p className="text-xs text-gray-500">{tipo.desc}</p>
                      </div>
                    </div>
                    {!editando && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setTarifaEditando(tipo.value)}
                        className="text-xs"
                      >
                        Editar
                      </Button>
                    )}
                  </div>

                  {editando ? (
                    <TarifaEditor
                      tarifa={tarifa}
                      onSave={guardarTarifa}
                      onCancel={() => setTarifaEditando(null)}
                      guardando={guardando}
                      tarifaBase={formData?.tarifa_hora || 45}
                    />
                  ) : (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-emerald-50 p-2 rounded-lg">
                        <span className="text-xs text-gray-500 block">Tarifa/hora</span>
                        <span className="font-bold text-emerald-700">
                          {tarifa.tarifa_hora.toFixed(2)}€
                        </span>
                      </div>
                      {tarifa.tarifa_hora_urgente && (
                        <div className="bg-amber-50 p-2 rounded-lg">
                          <span className="text-xs text-gray-500 block">Urgente</span>
                          <span className="font-bold text-amber-700">
                            {tarifa.tarifa_hora_urgente.toFixed(2)}€
                          </span>
                        </div>
                      )}
                      {tarifa.descuento_mano_obra_porcentaje > 0 && (
                        <div className="bg-blue-50 p-2 rounded-lg">
                          <span className="text-xs text-gray-500 block">Dto. M.O.</span>
                          <span className="font-bold text-blue-700">
                            {tarifa.descuento_mano_obra_porcentaje}%
                          </span>
                        </div>
                      )}
                      {tarifa.descuento_piezas_porcentaje > 0 && (
                        <div className="bg-purple-50 p-2 rounded-lg">
                          <span className="text-xs text-gray-500 block">Dto. Piezas</span>
                          <span className="font-bold text-purple-700">
                            {tarifa.descuento_piezas_porcentaje}%
                          </span>
                        </div>
                      )}
                      {tarifa.dias_pago > 0 && (
                        <div className="bg-gray-50 p-2 rounded-lg">
                          <span className="text-xs text-gray-500 block">Días pago</span>
                          <span className="font-bold text-gray-700">
                            {tarifa.dias_pago} días
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {!editando && tarifas.find(t => t.tipo_cliente === tipo.value) && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                      Tarifa personalizada
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-6 p-4 bg-white rounded-lg border border-emerald-200">
            <p className="text-sm text-gray-600">
              <strong>Nota:</strong> Las tarifas se aplicarán automáticamente al crear órdenes
              según el tipo de cliente seleccionado. Los descuentos se aplicarán sobre el total
              de mano de obra o piezas según corresponda.
            </p>
          </div>
        </Card>

        {/* Integración Google Calendar */}
        <GoogleCalendarConnection tallerId={tallerId || undefined} />

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

// Componente para editar tarifa
function TarifaEditor({
  tarifa,
  onSave,
  onCancel,
  guardando,
  tarifaBase
}: {
  tarifa: Tarifa
  onSave: (t: Tarifa) => void
  onCancel: () => void
  guardando: boolean
  tarifaBase: number
}) {
  const [formTarifa, setFormTarifa] = useState<Tarifa>({
    ...tarifa,
    tarifa_hora: tarifa.tarifa_hora || tarifaBase
  })

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs text-gray-600">Tarifa/hora (€)</Label>
          <NumberInput
            value={formTarifa.tarifa_hora}
            onChange={(value) => {
              const precioConvertido = masterConverter(value, 'tarifa', { allowDecimals: true, min: 0 })
              setFormTarifa({ ...formTarifa, tarifa_hora: precioConvertido })
            }}
            min={0}
            step={0.01}
            className="text-sm"
          />
        </div>
        <div>
          <Label className="text-xs text-gray-600">Urgente (€)</Label>
          <NumberInput
            value={formTarifa.tarifa_hora_urgente || 0}
            onChange={(value) => {
              const precioConvertido = masterConverter(value, 'tarifa', { allowDecimals: true, min: 0 })
              setFormTarifa({ ...formTarifa, tarifa_hora_urgente: precioConvertido || null })
            }}
            min={0}
            step={0.01}
            className="text-sm"
            allowEmpty
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs text-gray-600">Dto. M.O. (%)</Label>
          <NumberInput
            value={formTarifa.descuento_mano_obra_porcentaje}
            onChange={(value) => {
              const porcentajeConvertido = masterConverter(value, 'precio', { min: 0, max: 100 })
              setFormTarifa({ ...formTarifa, descuento_mano_obra_porcentaje: porcentajeConvertido })
            }}
            min={0}
            max={100}
            step={1}
            className="text-sm"
          />
        </div>
        <div>
          <Label className="text-xs text-gray-600">Dto. Piezas (%)</Label>
          <NumberInput
            value={formTarifa.descuento_piezas_porcentaje}
            onChange={(value) => {
              const porcentajeConvertido = masterConverter(value, 'precio', { min: 0, max: 100 })
              setFormTarifa({ ...formTarifa, descuento_piezas_porcentaje: porcentajeConvertido })
            }}
            min={0}
            max={100}
            step={1}
            className="text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs text-gray-600">Días pago</Label>
          <NumberInput
            value={formTarifa.dias_pago}
            onChange={(value) => {
              if (value !== null && value !== undefined) {
                setFormTarifa({ ...formTarifa, dias_pago: value })
              }
            }}
            className="text-sm"
            placeholder="0"
            min={0}
            step={1}
          />
        </div>
        <div>
          <Label className="text-xs text-gray-600">Límite crédito (€)</Label>
          <NumberInput
            value={formTarifa.limite_credito || 0}
            onChange={(value) => {
              const creditoConvertido = masterConverter(value, 'tarifa', { allowDecimals: true, min: 0 })
              setFormTarifa({ ...formTarifa, limite_credito: creditoConvertido || null })
            }}
            min={0}
            step={100}
            className="text-sm"
            allowEmpty
          />
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          className="flex-1 text-xs"
        >
          Cancelar
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => onSave(formTarifa)}
          disabled={guardando}
          className="flex-1 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700"
        >
          {guardando ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Save className="w-3 h-3" />
          )}
          Guardar
        </Button>
      </div>
    </div>
  )
}
