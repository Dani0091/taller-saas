'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Download, Printer, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { EnlaceVolver } from '@/components/dashboard/enlace-volver'
import { InformacionLegal } from '@/components/facturas/informacion-legal'
import { CambiarEstado } from '@/components/facturas/cambiar-estado'
import { formatCurrency } from '@/lib/utils'
import { useDescargarPDF } from '@/hooks/useDescargarPDF'
import { useTaller } from '@/contexts/TallerContext'

interface Factura {
  id: string
  numero_factura: string
  fecha_emision: string
  fecha_vencimiento: string
  base_imponible: number
  iva: number
  total: number
  estado: string
  metodo_pago: string
  pdf_url?: string
  notas_internas?: string
  condiciones_pago?: string
  cliente?: {
    nombre: string
    nif: string
    direccion?: string
    codigo_postal?: string
    ciudad?: string
    provincia?: string
    email?: string
    telefono?: string
  }
  vehiculo_id?: string
  vehiculo?: {
    id: string
    matricula: string
    marca?: string
    modelo?: string
    año?: number
    color?: string
    vin?: string
    bastidor_vin?: string
  }
  lineas?: Array<{
    descripcion: string
    cantidad: number
    precio_unitario: number
  }>
  numero_verifactu?: string
  verifactu_qr?: string
  verifactu_qr_base64?: string
  verifactu_qr_url?: string
  verifactu_estado?: string
}

interface DatosEmpresa {
  nombre: string
  nif: string
  direccion: string
  codigo_postal: string
  ciudad: string
  provincia: string
  telefono?: string
  email?: string
  web?: string
}

const estadoColors: Record<string, string> = {
  'borrador': 'bg-gray-100 text-gray-800',
  'emitida': 'bg-primary/10 text-primary',
  'pagada': 'bg-success/10 text-success',
  'anulada': 'bg-destructive/10 text-destructive',
}

export default function VerFacturaPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { descargarFactura, imprimirFactura, cargando: cargandoPDF } = useDescargarPDF()
  const [factura, setFactura] = useState<Factura | null>(null)
  const [loading, setLoading] = useState(true)
  const [datosEmpresa, setDatosEmpresa] = useState<DatosEmpresa | null>(null)
  // El taller sale de la sesión (TallerContext, servido por la API)
  const { tallerId } = useTaller()

  useEffect(() => {
    const id = searchParams.get('id')
    if (id) {
      fetchFactura(id)
    }
  }, [searchParams])

  // Cargar datos empresa cuando tengamos taller_id
  useEffect(() => {
    if (tallerId) {
      fetchDatosEmpresa()
    }
  }, [tallerId])

  const fetchFactura = async (id: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/facturas/detalles?id=${id}`)
      const data = await response.json()

      if (data.error) {
        toast.error(data.error)
        router.push('/dashboard/facturas')
      } else {
        setFactura(data)
      }
    } catch (error) {
      console.error(error)
      toast.error('Error al cargar factura')
      router.push('/dashboard/facturas')
    } finally {
      setLoading(false)
    }
  }

  const fetchDatosEmpresa = async () => {
    if (!tallerId) return

    try {
      const response = await fetch(`/api/taller/config/obtener?taller_id=${tallerId}`)
      const data = await response.json()
      if (data) {
        setDatosEmpresa({
          nombre: data.nombre_empresa || 'Mi Taller',
          nif: data.cif || '',
          direccion: data.direccion || '',
          codigo_postal: data.codigo_postal || '',
          ciudad: data.ciudad || '',
          provincia: data.provincia || '',
          telefono: data.telefono || '',
          email: data.email || '',
          web: data.web || '',
        })
      }
    } catch (error) {
      console.error(error)
    }
  }

  const handleDescargarPDF = async () => {
    if (!factura) return
    await descargarFactura(factura.id, factura.numero_factura)
  }

  const handlePrint = async () => {
    if (!factura) return
    await imprimirFactura(factura.id, factura.numero_factura)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!factura) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-gray-500">Factura no encontrada</p>
      </div>
    )
  }

  return (
    <div>
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="mb-4">
          <EnlaceVolver href="/dashboard/facturas">Facturas</EnlaceVolver>
        </div>
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">{factura.numero_factura || 'Borrador'}</h2>
            <p className="text-muted-foreground">
              {new Date(factura.fecha_emision).toLocaleDateString('es-ES')}
            </p>
          </div>
          <Badge className={estadoColors[factura.estado]}>
            {factura.estado.toUpperCase()}
          </Badge>
        </div>

        {/* BOTONES ACCIÓN */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <Button
            onClick={handlePrint}
            disabled={cargandoPDF}
            className="gap-2"
            variant="outline"
          >
            {cargandoPDF ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Printer className="w-4 h-4" />
            )}
            Imprimir PDF
          </Button>

          <Button
            onClick={handleDescargarPDF}
            disabled={cargandoPDF}
            className="gap-2 bg-success hover:bg-success/90"
          >
            {cargandoPDF ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Descargar PDF
              </>
            )}
          </Button>

        </div>

        {/* CAMBIAR ESTADO */}
        {factura.estado !== 'anulada' && (
          <div className="mb-6">
            <CambiarEstado
              facturaId={factura.id}
              estadoActual={factura.estado as any}
              onEstadoActualizado={(estado) => {
                setFactura({ ...factura, estado })
              }}
            />
          </div>
        )}

        {/* CONTENIDO FACTURA */}
        <Card className="p-6 md:p-8 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
            {/* Cliente */}
            <div className=" border-primary pl-4">
              <h3 className="font-semibold text-gray-700 mb-2 text-sm uppercase">Facturado a:</h3>
              <p className="font-semibold text-gray-900 text-lg">{factura.cliente?.nombre}</p>
              <p className="text-gray-600 font-mono">{factura.cliente?.nif}</p>
              {factura.cliente?.direccion && (
                <p className="text-gray-600 text-sm mt-2">{factura.cliente.direccion}</p>
              )}
              {factura.cliente?.codigo_postal && (
                <p className="text-gray-600 text-sm">
                  {factura.cliente.codigo_postal} {factura.cliente.ciudad}, {factura.cliente.provincia}
                </p>
              )}
            </div>

            {/* Vehículo */}
            {factura.vehiculo && (
              <div className=" border-warning pl-4">
                <h3 className="font-semibold text-gray-700 mb-2 text-sm uppercase">
                  🚗 Vehículo
                </h3>
                <p className="font-mono font-bold text-primary text-xl tracking-wider">
                  {factura.vehiculo.matricula}
                </p>
                {(factura.vehiculo.marca || factura.vehiculo.modelo) && (
                  <p className="text-gray-900">
                    {factura.vehiculo.marca} {factura.vehiculo.modelo}
                  </p>
                )}
                {factura.vehiculo.año && (
                  <p className="text-gray-500 text-xs mt-1">{factura.vehiculo.año}</p>
                )}
                {factura.vehiculo.bastidor_vin && (
                  <p className="text-gray-500 text-xs mt-2">VIN: {factura.vehiculo.bastidor_vin}</p>
                )}
              </div>
            )}

            {/* Fechas y Vencimiento */}
            <div>
              <div className="mb-4">
                <p className="text-sm text-gray-600 uppercase font-semibold">Fecha de Emisión</p>
                <p className="font-semibold text-gray-900 text-lg">
                  {new Date(factura.fecha_emision).toLocaleDateString('es-ES')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 uppercase font-semibold">Fecha de Vencimiento</p>
                <p className="font-semibold text-gray-900 text-lg">
                  {new Date(factura.fecha_vencimiento).toLocaleDateString('es-ES')}
                </p>
              </div>
            </div>
          </div>

          {/* LÍNEAS */}
          {factura.lineas && factura.lineas.length > 0 && (
            <div className="mb-8">
              <h3 className="font-semibold text-gray-700 mb-4 text-sm uppercase">Concepto</h3>
              <table className="w-full text-sm">
                <thead className="border-b-2 border-gray-900 bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-2 font-bold">Descripción</th>
                    <th className="text-center py-3 px-2 font-bold">Cantidad</th>
                    <th className="text-right py-3 px-2 font-bold">Precio Unit.</th>
                    <th className="text-right py-3 px-2 font-bold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {factura.lineas.map((linea, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-2">{linea.descripcion}</td>
                      <td className="text-center py-3 px-2">{linea.cantidad}</td>
                      <td className="text-right py-3 px-2">{formatCurrency(linea.precio_unitario)}</td>
                      <td className="text-right py-3 px-2 font-semibold">
                        {formatCurrency(linea.cantidad * linea.precio_unitario)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TOTALES */}
          <div className="flex justify-end mb-6">
            <div className="w-full md:w-96">
              <div className="flex justify-between py-2 border-b border-gray-300 text-sm">
                <span className="text-gray-600">Base Imponible:</span>
                <span className="font-semibold">{formatCurrency(factura.base_imponible)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-300 text-sm">
                <span className="text-gray-600">IVA (21%):</span>
                <span className="font-semibold">{formatCurrency(factura.iva)}</span>
              </div>
              <div className="flex justify-between py-3 text-lg bg-primary text-primary-foreground px-3 rounded-lg font-bold mt-2 tabular-nums">
                <span>Total:</span>
                <span>{formatCurrency(factura.total)}</span>
              </div>
            </div>
          </div>

          {/* CONDICIONES Y MÉTODO DE PAGO */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-300">
            <div>
              <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Método de Pago:</p>
              <p className="font-semibold text-gray-900">{factura.metodo_pago}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Condiciones:</p>
              <p className="font-semibold text-gray-900">{factura.condiciones_pago || '-'}</p>
            </div>
          </div>

          {/* NOTAS */}
          {factura.notas_internas && (
            <div className="mt-4 p-3 bg-warning/5 rounded-lg border border-warning/30">
              <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Notas Internas:</p>
              <p className="text-sm text-gray-700">{factura.notas_internas}</p>
            </div>
          )}
        </Card>

        {/* INFORMACIÓN LEGAL */}
        {datosEmpresa && (
          <InformacionLegal
            nifEmisor={datosEmpresa.nif}
            nombreEmisor={datosEmpresa.nombre}
            direccionEmisor={datosEmpresa.direccion}
            codigoPostalEmisor={datosEmpresa.codigo_postal}
            ciudadEmisor={datosEmpresa.ciudad}
            provinciaEmisor={datosEmpresa.provincia}
            telefonoEmisor={datosEmpresa.telefono}
            emailEmisor={datosEmpresa.email}
            webEmisor={datosEmpresa.web}
            nifReceptor={factura.cliente?.nif || ''}
            nombreReceptor={factura.cliente?.nombre || ''}
            direccionReceptor={factura.cliente?.direccion}
            codigoPostalReceptor={factura.cliente?.codigo_postal}
            ciudadReceptor={factura.cliente?.ciudad}
            provinciaReceptor={factura.cliente?.provincia}
            baseImponible={factura.base_imponible}
            porcentajeIVA={21}
            cuotaIVA={factura.iva}
            total={factura.total}
            numeroFactura={factura.numero_factura}
            fechaEmision={factura.fecha_emision}
            verifactuAceptada={factura.verifactu_estado === 'aceptada'}
            numeroverificacion={factura.numero_verifactu}
          />
        )}
      </div>
    </div>
  )
}
