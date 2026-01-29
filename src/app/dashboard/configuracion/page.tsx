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
import { masterConverter } from '@/lib/utils/master-converter'

// ==================== INTERFACES ====================

interface ConfigTaller {
  id?: string
  taller_id: string
  nombre_taller?: string
  nombre_empresa?: string
  nif?: string
  cif?: string
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
  incluye_iva?: boolean
  porcentaje_iva?: number
  tarifa_con_iva?: boolean
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

// ==================== VALORES POR DEFECTO ====================

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
  tarifa_hora: 45.00,
  iva_default: 21.00,
  porcentaje_iva: 21.00,
  moneda: 'EUR',
  idioma: 'es',
  formato_fecha: 'dd/MM/yyyy',
  iban: null,
  condiciones_pago: null,
  notas_factura: null,
  color_primario: '#0284c7',
  color_secundario: '#0369a1',
  tarifa_con_iva: true,
  incluye_iva: true
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

const TIPOS_CLIENTE = [
  { value: 'particular', label: 'Particular', icon: '👤', desc: 'Clientes individuales' },
  { value: 'empresa', label: 'Empresa', icon: '🏢', desc: 'Empresas y sociedades' },
  { value: 'autonomo', label: 'Autónomo', icon: '💼', desc: 'Trabajadores autónomos' },
  { value: 'flota', label: 'Flota', icon: '🚗', desc: 'Gestores de flotas' },
]

export default function ConfiguracionPage() {
  const [config, setConfig] = useState<ConfigTaller | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<ConfigTaller | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [firmaPreview, setFirmaPreview] = useState<string | null>(null)
  const [tallerId, setTallerId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const firmaInputRef = useRef<HTMLInputElement>(null)

  const [tarifas, setTarifas] = useState<TarifaConfig[]>([])
  const [tarifaEditando, setTarifaEditando] = useState<string | null>(null)
  const [guardandoTarifa, setGuardandoTarifa] = useState<string | null>(null)

  const [series, setSeries] = useState<SerieConfig[]>([])
  const [cargandoSeries, setCargandoSeries] = useState(false)
  const [mostrarFormSerie, setMostrarFormSerie] = useState(false)
  const [serieEditando, setSerieEditando] = useState<SerieConfig | null>(null)
  const [formSerie, setFormSerie] = useState<SerieConfig>(SERIE_DEFAULTS)

  useEffect(() => {
    const obtenerTallerId = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user?.email) {
          setLoading(false)
          return
        }
        const { data: usuario, error } = await supabase
          .from('usuarios')
          .select('taller_id')
          .eq('email', session.user.email)
          .single()

        if (!error && usuario) setTallerId(usuario.taller_id)
      } catch (error) {
        console.error('Error auth:', error)
      } finally {
        setLoading(false)
      }
    }
    obtenerTallerId()
  }, [])

  useEffect(() => {
    if (tallerId) {
      fetchConfig()
      fetchTarifas()
      fetchSeries()
    }
  }, [tallerId])

  const fetchConfig = async () => {
    if (!tallerId) return
    try {
      setLoading(true)
      const response = await fetch(`/api/taller/config/obtener?taller_id=${tallerId}`)
      const data = await response.json()
      const configData = { ...CONFIG_DEFAULTS, ...data }
      setConfig(configData)
      setFormData(configData)
      if (data.logo_url) setLogoPreview(data.logo_url)
      if (data.firma_url) setFirmaPreview(data.firma_url)
    } catch (error) {
      toast.error('Error al cargar configuración')
    } finally {
      setLoading(false)
    }
  }

  const fetchTarifas = async () => {
    try {
      const response = await fetch('/api/tarifas')
      const data = await response.json()
      if (data.tarifas) setTarifas(data.tarifas)
    } catch (error) {
      console.error('Error al cargar tarifas:', error)
    }
  }

  const fetchSeries = async () => {
    if (!tallerId) return
    try {
      setCargandoSeries(true)
      const response = await fetch(`/api/series/obtener?taller_id=${tallerId}`)
      const data = await response.json()
      if (data.series) setSeries(data.series)
    } catch (error) {
      console.error('Error al cargar series:', error)
    } finally {
      setCargandoSeries(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined

    setFormData(prev => {
      if (!prev) return null
      return {
        ...prev,
        [name]: checked !== undefined ? checked : value
      }
    })
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'firma') => {
    const file = e.target.files?.[0]
    if (!file || !tallerId) return

    if (file.size > 2 * 1024 * 1024) {
      toast.error('El archivo es demasiado grande (máx 2MB)')
      return
    }

    try {
      const formDataUpload = new FormData()
      formDataUpload.append('file', file)
      formDataUpload.append('taller_id', tallerId)
      formDataUpload.append('tipo', type)

      const response = await fetch('/api/taller/upload', {
        method: 'POST',
        body: formDataUpload,
      })

      if (!response.ok) throw new Error('Error al subir archivo')

      const data = await response.json()
      if (type === 'logo') {
        setLogoPreview(data.url)
        setFormData(prev => prev ? { ...prev, logo_url: data.url } : null)
      } else {
        setFirmaPreview(data.url)
        setFormData(prev => prev ? { ...prev, firma_url: data.url } : null)
      }
      toast.success(`${type === 'logo' ? 'Logo' : 'Firma'} subida correctamente`)
    } catch (error) {
      toast.error(`Error al subir ${type}`)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData || !tallerId) return

    setSaving(true)
    try {
      const response = await fetch('/api/taller/config/actualizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, taller_id: tallerId }),
      })

      if (!response.ok) throw new Error('Error al actualizar')

      toast.success('Configuración guardada correctamente')
      fetchConfig()
    } catch (error) {
      toast.error('Error al guardar la configuración')
    } finally {
      setSaving(false)
    }
  }

  const handleGuardarTarifa = async (tarifa: TarifaConfig) => {
    setGuardandoTarifa(tarifa.id || 'nueva')
    try {
      const response = await fetch('/api/tarifas/actualizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...tarifa, taller_id: tallerId }),
      })

      if (!response.ok) throw new Error('Error al guardar tarifa')

      toast.success('Tarifa guardada correctamente')
      fetchTarifas()
      setTarifaEditando(null)
    } catch (error) {
      toast.error('Error al guardar la tarifa')
    } finally {
      setGuardandoTarifa(null)
    }
  }

  // ✅ FIX: Separar CREAR de ACTUALIZAR
  const handleGuardarSerie = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formSerie.nombre || !formSerie.prefijo) {
      toast.error('Nombre y prefijo son requeridos')
      return
    }

    if (!tallerId) {
      toast.error('No se encontró el taller')
      return
    }

    try {
      // ✅ DIFERENCIAR: ¿Crear o Actualizar?
      const isCreating = !serieEditando || !serieEditando.id
      const endpoint = isCreating ? '/api/series/crear' : '/api/series/actualizar'

      const body = isCreating
        ? {
            taller_id: tallerId,
            nombre: formSerie.nombre,
            prefijo: formSerie.prefijo.toUpperCase(),
            ultimo_numero: formSerie.ultimo_numero || 0,
            activa: true
          }
        : {
            id: serieEditando!.id,
            nombre: formSerie.nombre,
            prefijo: formSerie.prefijo.toUpperCase(),
            ultimo_numero: formSerie.ultimo_numero,
            activa: formSerie.activa ?? true
          }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        toast.error(data.error || 'Error al guardar serie')
        return
      }

      toast.success(isCreating ? 'Serie creada correctamente' : 'Serie actualizada correctamente')
      fetchSeries()
      setMostrarFormSerie(false)
      setSerieEditando(null)
      setFormSerie(SERIE_DEFAULTS)
    } catch (error) {
      console.error('Error guardando serie:', error)
      toast.error('Error al guardar la serie')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl space-y-8">
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-sky-100 rounded-lg">
            <Settings className="w-6 h-6 text-sky-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
            <p className="text-sm text-gray-500">Gestiona los datos de tu taller y preferencias</p>
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={saving} className="bg-sky-600 hover:bg-sky-700">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Guardar cambios
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Datos Generales */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-sky-500" />
              Identidad del Taller
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre Comercial</Label>
                  <Input name="nombre_taller" value={formData?.nombre_taller || ''} onChange={handleChange} placeholder="Ej: Taller Mecánico Pro" />
                </div>
                <div className="space-y-2">
                  <Label>Razón Social / Nombre Empresa</Label>
                  <Input name="nombre_empresa" value={formData?.nombre_empresa || ''} onChange={handleChange} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>NIF / CIF</Label>
                    <Input name="nif" value={formData?.nif || formData?.cif || ''} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input name="telefono" value={formData?.telefono || ''} onChange={handleChange} />
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl bg-gray-50 space-y-3">
                {logoPreview ? (
                  <div className="relative group">
                    <img src={logoPreview} alt="Logo" className="max-h-32 rounded-lg object-contain" />
                    <button onClick={() => setLogoPreview(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">Logo del taller (PNG, JPG)</p>
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  Seleccionar Logo
                </Button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'logo')} />
              </div>
            </div>
          </Card>

          {/* Tarifas */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-sky-500" />
                Tarifas por Tipo de Cliente
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {TIPOS_CLIENTE.map((tipo) => {
                const tarifa = tarifas.find(t => t.tipo_cliente === tipo.value) || { ...TARIFA_DEFAULTS, tipo_cliente: tipo.value }
                const isEditing = tarifaEditando === tipo.value

                return (
                  <div key={tipo.value} className="p-4 border rounded-xl hover:border-sky-200 transition-colors bg-white">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{tipo.icon}</span>
                        <div>
                          <p className="font-medium text-gray-900">{tipo.label}</p>
                          <p className="text-xs text-gray-500">{tipo.desc}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setTarifaEditando(isEditing ? null : tipo.value)}>
                        {isEditing ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4 text-gray-400" />}
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 p-2 rounded-lg">
                        <p className="text-[10px] text-gray-500 uppercase font-bold">Mano Obra</p>
                        {isEditing ? (
                          <Input
                            type="number"
                            className="h-7 text-sm"
                            value={tarifa.tarifa_hora}
                            onChange={(e) => {
                               const val = Number(e.target.value);
                               setTarifas(prev => {
                                 const exists = prev.find(t => t.tipo_cliente === tipo.value);
                                 if (exists) return prev.map(t => t.tipo_cliente === tipo.value ? {...t, tarifa_hora: val} : t);
                                 return [...prev, {...TARIFA_DEFAULTS, tipo_cliente: tipo.value, tarifa_hora: val}];
                               })
                            }}
                          />
                        ) : (
                          <p className="text-sm font-semibold text-sky-700">{tarifa.tarifa_hora}€/h</p>
                        )}
                      </div>
                      <div className="bg-gray-50 p-2 rounded-lg">
                        <p className="text-[10px] text-gray-500 uppercase font-bold">Desc. Piezas</p>
                        {isEditing ? (
                          <Input
                            type="number"
                            className="h-7 text-sm"
                            value={tarifa.descuento_piezas_porcentaje}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setTarifas(prev => {
                                const exists = prev.find(t => t.tipo_cliente === tipo.value);
                                if (exists) return prev.map(t => t.tipo_cliente === tipo.value ? {...t, descuento_piezas_porcentaje: val} : t);
                                return [...prev, {...TARIFA_DEFAULTS, tipo_cliente: tipo.value, descuento_piezas_porcentaje: val}];
                              })
                            }}
                          />
                        ) : (
                          <p className="text-sm font-semibold text-emerald-600">{tarifa.descuento_piezas_porcentaje}%</p>
                        )}
                      </div>
                    </div>
                    {isEditing && (
                      <Button
                        className="w-full mt-3 h-8 bg-sky-600"
                        size="sm"
                        disabled={guardandoTarifa === (tarifa.id || 'nueva')}
                        onClick={() => handleGuardarTarifa(tarifa)}
                      >
                        {guardandoTarifa === (tarifa.id || 'nueva') ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Guardar Tarifa'}
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Personalización de Facturas */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-sky-500" />
              Personalización de Facturas
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>IBAN (Cuenta Bancaria)</Label>
                <Input
                  name="iban"
                  value={formData?.iban || ''}
                  onChange={handleChange}
                  placeholder="ES00 0000 0000 0000 0000 0000"
                  className="font-mono"
                />
                <p className="text-xs text-gray-500">Se mostrará en las facturas para transferencias bancarias</p>
              </div>

              <div className="space-y-2">
                <Label>Condiciones de Pago</Label>
                <Textarea
                  name="condiciones_pago"
                  value={formData?.condiciones_pago || ''}
                  onChange={handleChange}
                  placeholder="Ej: Pago a 30 días desde la fecha de emisión"
                  rows={2}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500">Aparecerá en el pie de todas las facturas</p>
              </div>

              <div className="space-y-2">
                <Label>Notas Legales / Texto Adicional</Label>
                <Textarea
                  name="notas_factura"
                  value={formData?.notas_factura || ''}
                  onChange={handleChange}
                  placeholder="Ej: Garantía de 12 meses en todas las reparaciones. No se aceptan devoluciones de piezas especiales."
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500">Información adicional que aparecerá en todas las facturas (garantías, términos, etc.)</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Color Primario</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      name="color_primario"
                      value={formData?.color_primario || '#0284c7'}
                      onChange={handleChange}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      name="color_primario"
                      value={formData?.color_primario || '#0284c7'}
                      onChange={handleChange}
                      placeholder="#0284c7"
                      className="font-mono flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Color Secundario</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      name="color_secundario"
                      value={formData?.color_secundario || '#0369a1'}
                      onChange={handleChange}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      name="color_secundario"
                      value={formData?.color_secundario || '#0369a1'}
                      onChange={handleChange}
                      placeholder="#0369a1"
                      className="font-mono flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-8">
          {/* Series de Facturación */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5 text-sky-500" />
                Series
              </h2>
              <Button size="sm" variant="outline" onClick={() => { setMostrarFormSerie(true); setSerieEditando(null); setFormSerie(SERIE_DEFAULTS); }}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-3">
              {series.map(serie => (
                <div key={serie.id} className="p-3 border rounded-lg flex items-center justify-between bg-white group">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{serie.nombre}</p>
                    <p className="text-xs text-gray-500">Prefijo: <span className="font-mono font-bold text-sky-600">{serie.prefijo}</span> | Nº: {serie.ultimo_numero}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" onClick={() => { setSerieEditando(serie); setFormSerie(serie); setMostrarFormSerie(true); }}>
                      <Edit2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {mostrarFormSerie && (
              <form onSubmit={handleGuardarSerie} className="mt-4 p-4 border rounded-lg bg-gray-50 space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs">Nombre de Serie</Label>
                  <Input value={formSerie.nombre} onChange={e => setFormSerie({...formSerie, nombre: e.target.value})} placeholder="Ej: Facturas Ordinarias" className="h-8 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label className="text-xs">Prefijo</Label>
                    <Input value={formSerie.prefijo} onChange={e => setFormSerie({...formSerie, prefijo: e.target.value})} placeholder="F" className="h-8 text-sm uppercase" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Último Nº</Label>
                    <Input type="number" value={formSerie.ultimo_numero} onChange={e => setFormSerie({...formSerie, ultimo_numero: Number(e.target.value)})} className="h-8 text-sm" />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="button" size="sm" variant="outline" className="flex-1" onClick={() => setMostrarFormSerie(false)}>Cancelar</Button>
                  <Button type="submit" size="sm" className="flex-1 bg-sky-600">
                    {serieEditando ? 'Actualizar' : 'Crear'} Serie
                  </Button>
                </div>
              </form>
            )}
          </Card>

          <GoogleCalendarConnection tallerId={tallerId || undefined} />
        </div>
      </div>
    </div>
  )
}
