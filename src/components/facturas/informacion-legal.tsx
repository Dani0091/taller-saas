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

      {/* CUMPLIMIENTO NORMATIVO */}
      <Card className="p-6">
        <h3 className="font-bold text-lg mb-4 text-gray-900">Cumplimiento Normativo</h3>
        <div className="space-y-3 text-sm">
          {/* Factura electrónica */}
          <div className="flex gap-3 items-start">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-900">Factura Electrónica</p>
              <p className="text-gray-600">
                Cumple con RD 1619/2012 - Emisión de factura electrónica
              </p>
            </div>
          </div>

          {/* IVA */}
          <div className="flex gap-3 items-start">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-900">IVA Registrado</p>
              <p className="text-gray-600">
                IVA {porcentajeIVA}% incluido en la cuota repercutida
              </p>
            </div>
          </div>

          {/* Verifactu */}
          <div className="flex gap-3 items-start">
            {verifactuAceptada ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold text-gray-900">Verifactu</p>
              <p className="text-gray-600">
                {verifactuAceptada
                  ? `Registro aceptado por AEAT - Verificación: ${numeroverificacion}`
                  : 'Pendiente de registro en AEAT'}
              </p>
            </div>
          </div>

          {/* Derechos del receptor */}
          <div className="flex gap-3 items-start pt-3 border-t">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-900">Información al Receptor</p>
              <p className="text-gray-600 text-xs">
                En cumplimiento de la Orden HAP/492/2017, el receptor tiene derecho a 
                solicitar datos adicionales sobre esta factura y verificarla en el 
                portal de AEAT.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* NOTAS LEGALES */}
      <Card className="p-6 bg-gray-900 text-white text-xs">
        <p className="mb-2">
          <span className="font-bold">Aviso Legal:</span> Esta factura ha sido emitida 
          de acuerdo con la legislación fiscal española vigente. El emisor es responsable 
          del contenido y veracidad de los datos consignados. En caso de discrepancias, 
          se estará a lo dispuesto en la normativa tributaria aplicable.
        </p>
        <p>
          Normativa aplicable: Real Decreto 1619/2012, Orden HAP/492/2017, 
          Instrucciones AEAT sobre Facturación Electrónica y Verifactu.
        </p>
      </Card>
    </div>
  )
}
