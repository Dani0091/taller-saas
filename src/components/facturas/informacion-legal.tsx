/**
 * COMPONENTE INFORMACIÓN LEGAL
 * 
 * Muestra todos los datos legales y normativos requeridos
 * según la legislación española de facturación
 */

'use client'

import { Card } from '@/components/ui/card'
import { AlertCircle, CheckCircle, Info } from 'lucide-react'

interface InformacionLegalProps {
  // Datos del emisor (Taller)
  nifEmisor: string
  nombreEmisor: string
  direccionEmisor: string
  codigoPostalEmisor: string
  ciudadEmisor: string
  provinciaEmisor: string
  telefonoEmisor?: string
  emailEmisor?: string
  webEmisor?: string
  
  // Datos del receptor (Cliente)
  nifReceptor: string
  nombreReceptor: string
  direccionReceptor?: string
  codigoPostalReceptor?: string
  ciudadReceptor?: string
  provinciaReceptor?: string
  
  // Datos fiscales
  baseImponible: number
  porcentajeIVA: number
  cuotaIVA: number
  total: number
  
  // Condiciones
  condicionesPago?: string
  numeroFactura: string
  fechaEmision: string
  
  // Estado normativo
  verifactuAceptada?: boolean
  numeroverificacion?: string
}

export function InformacionLegal({
  nifEmisor,
  nombreEmisor,
  direccionEmisor,
  codigoPostalEmisor,
  ciudadEmisor,
  provinciaEmisor,
  telefonoEmisor,
  emailEmisor,
  webEmisor,
  nifReceptor,
  nombreReceptor,
  direccionReceptor,
  codigoPostalReceptor,
  ciudadReceptor,
  provinciaReceptor,
  baseImponible,
  porcentajeIVA,
  cuotaIVA,
  total,
  condicionesPago,
  numeroFactura,
  fechaEmision,
  verifactuAceptada,
  numeroverificacion,
}: InformacionLegalProps) {
  return (
    <div className="space-y-6">
      {/* DATOS DEL EMISOR */}
      <Card className="p-6 bg-gradient-to-br from-gray-50 to-gray-100">
        <h3 className="font-bold text-lg mb-4 text-gray-900">Datos del Emisor</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600 font-semibold">Razón Social</p>
            <p className="text-gray-900">{nombreEmisor}</p>
          </div>
          <div>
            <p className="text-gray-600 font-semibold">NIF/CIF</p>
            <p className="font-mono text-gray-900">{nifEmisor}</p>
          </div>
          <div>
            <p className="text-gray-600 font-semibold">Dirección</p>
            <p className="text-gray-900">{direccionEmisor}</p>
          </div>
          <div>
            <p className="text-gray-600 font-semibold">Localidad</p>
            <p className="text-gray-900">
              {codigoPostalEmisor} {ciudadEmisor}, {provinciaEmisor}
            </p>
          </div>
          {telefonoEmisor && (
            <div>
              <p className="text-gray-600 font-semibold">Teléfono</p>
              <p className="text-gray-900">{telefonoEmisor}</p>
            </div>
          )}
          {emailEmisor && (
            <div>
              <p className="text-gray-600 font-semibold">Email</p>
              <p className="text-gray-900">{emailEmisor}</p>
            </div>
          )}
          {webEmisor && (
            <div>
              <p className="text-gray-600 font-semibold">Sitio Web</p>
              <p className="text-gray-900">{webEmisor}</p>
            </div>
          )}
        </div>
      </Card>

      {/* DATOS DEL RECEPTOR */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <h3 className="font-bold text-lg mb-4 text-gray-900">Datos del Receptor</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600 font-semibold">Razón Social</p>
            <p className="text-gray-900">{nombreReceptor}</p>
          </div>
          <div>
            <p className="text-gray-600 font-semibold">NIF/CIF</p>
            <p className="font-mono text-gray-900">{nifReceptor}</p>
          </div>
          {direccionReceptor && (
            <div>
              <p className="text-gray-600 font-semibold">Dirección</p>
              <p className="text-gray-900">{direccionReceptor}</p>
            </div>
          )}
          {ciudadReceptor && (
            <div>
              <p className="text-gray-600 font-semibold">Localidad</p>
              <p className="text-gray-900">
                {codigoPostalReceptor} {ciudadReceptor}, {provinciaReceptor}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* DATOS FISCALES */}
      <Card className="p-6">
        <h3 className="font-bold text-lg mb-4 text-gray-900">Desglose Fiscal</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">Base Imponible</span>
            <span className="font-semibold text-gray-900">€{baseImponible.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">IVA ({porcentajeIVA}%)</span>
            <span className="font-semibold text-gray-900">€{cuotaIVA.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-3 bg-gray-100 p-2 rounded font-bold">
            <span>Total</span>
            <span className="text-lg text-blue-600">€{total.toFixed(2)}</span>
          </div>
        </div>
      </Card>

      {/* CONDICIONES LEGALES */}
      {condicionesPago && (
        <Card className="p-6 bg-yellow-50 border-yellow-200">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-gray-900 mb-2">Condiciones de Pago</h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {condicionesPago}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* INFORMACIÓN LEGAL */}
      <Card className="p-6">
        <h3 className="font-bold text-lg mb-4 text-gray-900">Información Legal</h3>
        <div className="space-y-3 text-sm">
          {/* Factura válida */}
          <div className="flex gap-3 items-start">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-900">Factura válida</p>
              <p className="text-gray-600">
                Emitida conforme al RD 1619/2012 sobre facturación
              </p>
            </div>
          </div>

          {/* IVA */}
          <div className="flex gap-3 items-start">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-900">IVA incluido</p>
              <p className="text-gray-600">
                IVA {porcentajeIVA}% aplicado según normativa vigente
              </p>
            </div>
          </div>

          {/* Conservación */}
          <div className="flex gap-3 items-start">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-900">Conservación</p>
              <p className="text-gray-600">
                Conserve esta factura durante 4 años a efectos fiscales
              </p>
            </div>
          </div>

          {/* Garantía */}
          <div className="flex gap-3 items-start pt-3 border-t">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-900">Garantía de reparaciones</p>
              <p className="text-gray-600 text-xs">
                Las reparaciones tienen garantía de 3 meses en mano de obra.
                Piezas nuevas: garantía del fabricante (mínimo 2 años).
                Piezas de segunda mano: garantía de 1 año según normativa.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* NOTAS LEGALES */}
      <Card className="p-6 bg-gray-900 text-white text-xs">
        <p className="mb-2">
          <span className="font-bold">Aviso Legal:</span> Factura emitida conforme a la
          legislación fiscal española (RD 1619/2012). El cliente dispone de hojas de
          reclamaciones a su disposición.
        </p>
        <p>
          Para cualquier consulta o reclamación sobre esta factura o los servicios
          prestados, contacte con el taller en la dirección o teléfono indicados.
        </p>
      </Card>
    </div>
  )
}
