/**
 * PLANTILLA DE FACTURA MEJORADA
 * 
 * Cumplimiento normativa:
 * - RD 1619/2012
 * - Orden HAP/492/2017
 * - Directiva UE 2006/112/CE
 * - Verifactu 2024-2025
 */

'use client'

interface LineaFactura {
  descripcion: string
  cantidad: number
  precioUnitario: number
  total: number
}

interface DatosEmisor {
  nombre: string
  nif: string
  direccion: string
  codigoPostal: string
  ciudad: string
  provincia: string
  pais: string
  telefono?: string
  email?: string
  web?: string
}

interface DatosReceptor {
  nombre: string
  nif: string
  direccion?: string
  codigoPostal?: string
  ciudad?: string
  provincia?: string
  pais?: string
  telefono?: string
  email?: string
}

interface DatosVehiculo {
  modelo?: string
  matricula?: string
  km?: number
  vin?: string
}

interface PlantillaFacturaProps {
  numeroFactura: string
  serie: string
  fechaEmision: string
  fechaVencimiento: string
  emisor: DatosEmisor
  receptor: DatosReceptor
  vehiculo?: DatosVehiculo
  lineas: LineaFactura[]
  baseImponible: number
  ivaPercentaje: number
  cuotaIVA: number
  descuento?: number
  envio?: number
  total: number
  metodoPago?: string
  condicionesPago?: string
  notas?: string
  verifactuNumero?: string
  verifactuQR?: string
  verifactuURL?: string
  logo?: string
  // Campos adicionales para renting/flotas
  numeroAutorizacion?: string
  referenciaExterna?: string
  personaContacto?: string
  telefonoContacto?: string
}

export function PlantillaFactura({
  numeroFactura,
  serie,
  fechaEmision,
  fechaVencimiento,
  emisor,
  receptor,
  vehiculo,
  lineas,
  baseImponible,
  ivaPercentaje,
  cuotaIVA,
  descuento = 0,
  envio = 0,
  total,
  metodoPago = 'Transferencia bancaria',
  condicionesPago = '',
  notas,
  verifactuNumero,
  verifactuQR,
  verifactuURL,
  logo,
  // Campos adicionales
  numeroAutorizacion,
  referenciaExterna,
  personaContacto,
  telefonoContacto,
}: PlantillaFacturaProps) {
  return (
    <div className="bg-white p-12 font-sans text-gray-900" style={{ width: '210mm', height: '297mm' }}>
      {/* HEADER CON LÍNEA DE COLOR */}
      <div className="border-t-4 border-blue-600 mb-8 pb-8">
        <div className="flex justify-between items-start">
          {/* LOGO Y DATOS EMISOR */}
          <div className="flex-1">
            {logo && (
              <img src={logo} alt="Logo" className="h-16 mb-4" />
            )}
            <h2 className="text-2xl font-black text-gray-900 mb-1">
              {emisor.nombre}
            </h2>
            <p className="text-sm text-gray-600">
              {emisor.direccion}, {emisor.codigoPostal} {emisor.ciudad}
            </p>
            <p className="text-sm text-gray-600">
              {emisor.provincia}, {emisor.pais}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              CIF: <span className="font-mono font-bold">{emisor.nif}</span>
            </p>
            {emisor.telefono && (
              <p className="text-xs text-gray-500">
                Teléfono: {emisor.telefono}
              </p>
            )}
            {emisor.email && (
              <p className="text-xs text-gray-500">
                Email: {emisor.email}
              </p>
            )}
          </div>

          {/* TIPO DE DOCUMENTO Y NÚMERO */}
          <div className="text-right">
            <h1 className="text-5xl font-black text-gray-300 mb-2">FACTURA</h1>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-xs text-gray-600 uppercase font-semibold">Número de Factura</p>
              <p className="text-2xl font-mono font-bold text-blue-600">
                {serie}-{numeroFactura}
              </p>
              <p className="text-xs text-gray-600 mt-2 uppercase font-semibold">Fecha de Emisión</p>
              <p className="text-lg font-semibold">
                {new Date(fechaEmision).toLocaleDateString('es-ES')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN DE DATOS: CLIENTE Y VEHÍCULO */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        {/* RECEPTOR */}
        <div className="border-l-4 border-blue-600 pl-4">
          <h3 className="text-xs uppercase font-bold text-gray-600 mb-2">Facturado a:</h3>
          <p className="font-bold text-lg text-gray-900">{receptor.nombre}</p>
          <p className="text-sm text-gray-600 font-mono">{receptor.nif}</p>
          {receptor.direccion && (
            <p className="text-sm text-gray-600 mt-2">
              {receptor.direccion}
            </p>
          )}
          {receptor.codigoPostal && (
            <p className="text-sm text-gray-600">
              {receptor.codigoPostal} {receptor.ciudad}, {receptor.provincia}
            </p>
          )}
          {receptor.pais && (
            <p className="text-sm text-gray-600">{receptor.pais}</p>
          )}
          {receptor.email && (
            <p className="text-sm text-gray-600 mt-2">{receptor.email}</p>
          )}
        </div>

        {/* VEHÍCULO (SI APLICA) */}
        {vehiculo && (
          <div className="border-l-4 border-orange-600 pl-4">
            <h3 className="text-xs uppercase font-bold text-gray-600 mb-2">Vehículo:</h3>
            {vehiculo.modelo && (
              <p className="text-sm text-gray-900">
                <span className="font-semibold">Modelo:</span> {vehiculo.modelo}
              </p>
            )}
            {vehiculo.matricula && (
              <p className="text-sm text-gray-900 font-mono">
                <span className="font-semibold">Matrícula:</span> {vehiculo.matricula}
              </p>
            )}
            {vehiculo.km && (
              <p className="text-sm text-gray-900">
                <span className="font-semibold">Km:</span> {vehiculo.km.toLocaleString('es-ES')}
              </p>
            )}
            {vehiculo.vin && (
              <p className="text-sm text-gray-900 font-mono">
                <span className="font-semibold">VIN:</span> {vehiculo.vin}
              </p>
            )}
          </div>
        )}
      </div>

      {/* DATOS ADICIONALES RENTING/FLOTAS */}
      {(numeroAutorizacion || referenciaExterna || personaContacto) && (
        <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
          {numeroAutorizacion && (
            <div>
              <h3 className="text-xs uppercase font-bold text-amber-700 mb-1">Nº Autorización:</h3>
              <p className="text-sm font-mono font-bold text-gray-900">{numeroAutorizacion}</p>
            </div>
          )}
          {referenciaExterna && (
            <div>
              <h3 className="text-xs uppercase font-bold text-amber-700 mb-1">Referencia:</h3>
              <p className="text-sm font-mono text-gray-900">{referenciaExterna}</p>
            </div>
          )}
          {personaContacto && (
            <div>
              <h3 className="text-xs uppercase font-bold text-amber-700 mb-1">Contacto:</h3>
              <p className="text-sm text-gray-900">{personaContacto}</p>
              {telefonoContacto && (
                <p className="text-xs text-gray-600">{telefonoContacto}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* INFORMACIÓN DE PAGO */}
      <div className="grid grid-cols-2 gap-8 mb-8 pb-8 border-b-2 border-gray-200">
        <div>
          <h3 className="text-xs uppercase font-bold text-gray-600 mb-2">Fecha de Vencimiento:</h3>
          <p className="text-lg font-semibold">
            {new Date(fechaVencimiento).toLocaleDateString('es-ES')}
          </p>
        </div>
        <div>
          <h3 className="text-xs uppercase font-bold text-gray-600 mb-2">Método de Pago:</h3>
          <p className="text-lg font-semibold">{metodoPago}</p>
        </div>
        <div className="col-span-2">
          <h3 className="text-xs uppercase font-bold text-gray-600 mb-2">Condiciones de Pago:</h3>
          <p className="text-sm">{condicionesPago}</p>
        </div>
      </div>

      {/* TABLA DE LÍNEAS */}
      <table className="w-full mb-8 text-sm">
        <thead>
          <tr className="border-b-2 border-blue-600 bg-blue-50">
            <th className="text-left py-3 px-2 font-bold text-gray-900">DESCRIPCIÓN</th>
            <th className="text-center py-3 px-2 font-bold text-gray-900">CANTIDAD</th>
            <th className="text-right py-3 px-2 font-bold text-gray-900">PRECIO UNIT.</th>
            <th className="text-right py-3 px-2 font-bold text-gray-900">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {lineas.map((linea, idx) => (
            <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
              <td className="py-3 px-2 text-gray-900">{linea.descripcion}</td>
              <td className="text-center py-3 px-2 text-gray-900">{linea.cantidad}</td>
              <td className="text-right py-3 px-2 text-gray-900 font-mono">
                €{linea.precioUnitario.toFixed(2)}
              </td>
              <td className="text-right py-3 px-2 text-gray-900 font-semibold font-mono">
                €{linea.total.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* TOTALES */}
      <div className="flex justify-end mb-8">
        <div className="w-96">
          {/* Subtotal */}
          <div className="flex justify-between py-2 border-b border-gray-300 text-sm">
            <span className="text-gray-600">Subtotal:</span>
            <span className="font-mono text-gray-900">€{baseImponible.toFixed(2)}</span>
          </div>

          {/* Descuento */}
          {descuento > 0 && (
            <div className="flex justify-between py-2 border-b border-gray-300 text-sm">
              <span className="text-gray-600">Descuento:</span>
              <span className="font-mono text-red-600">-€{descuento.toFixed(2)}</span>
            </div>
          )}

          {/* Envío */}
          {envio > 0 && (
            <div className="flex justify-between py-2 border-b border-gray-300 text-sm">
              <span className="text-gray-600">Envío/Manipulación:</span>
              <span className="font-mono text-gray-900">€{envio.toFixed(2)}</span>
            </div>
          )}

          {/* BASE IMPONIBLE */}
          <div className="flex justify-between py-2 border-b-2 border-gray-300 text-sm bg-gray-50 px-2">
            <span className="font-semibold text-gray-900">Base Imponible:</span>
            <span className="font-mono font-bold text-gray-900">€{baseImponible.toFixed(2)}</span>
          </div>

          {/* IVA DESGLOSADO */}
          <div className="flex justify-between py-2 border-b-2 border-blue-600 text-sm bg-blue-50 px-2">
            <span className="font-semibold text-gray-900">IVA ({ivaPercentaje}%):</span>
            <span className="font-mono font-bold text-blue-600">€{cuotaIVA.toFixed(2)}</span>
          </div>

          {/* TOTAL */}
          <div className="flex justify-between py-3 text-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white px-2 rounded-lg mt-2">
            <span className="font-black">TOTAL A PAGAR:</span>
            <span className="font-mono font-black">€{total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* VERIFACTU (SI APLICA) */}
      {verifactuNumero && (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 mb-6 text-xs">
          <p className="font-bold text-gray-900 mb-1">Verificación AEAT - Verifactu</p>
          <p className="font-mono text-gray-700">
            Número de verificación: <span className="font-bold">{verifactuNumero}</span>
          </p>
          {verifactuURL && (
            <p className="text-gray-600 mt-1">
              Verificar en: {verifactuURL}
            </p>
          )}
        </div>
      )}

      {/* NOTAS */}
      {notas && (
        <div className="bg-gray-50 p-3 mb-6 rounded border border-gray-200">
          <p className="text-xs font-bold text-gray-600 mb-1">Notas:</p>
          <p className="text-xs text-gray-700 whitespace-pre-wrap">{notas}</p>
        </div>
      )}

      {/* PIE - INFORMACIÓN LEGAL */}
      <div className="border-t-2 border-gray-300 pt-4 mt-6 text-xs text-gray-600">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p className="font-bold text-gray-700 mb-1">Información Legal</p>
            <p>Factura emitida según RD 1619/2012</p>
            <p>Cumplimiento Orden HAP/492/2017</p>
            <p>Directiva UE 2006/112/CE</p>
          </div>
          <div>
            <p className="font-bold text-gray-700 mb-1">Conservación</p>
            <p>Período de conservación: 4 años</p>
            <p>Formato: Electrónico/Digital</p>
            <p>Accesibilidad: Según normativa</p>
          </div>
          <div>
            <p className="font-bold text-gray-700 mb-1">Derechos del Cliente</p>
            <p>Puede verificar esta factura en el portal de AEAT</p>
            <p>Tiene derecho a solicitar información adicional</p>
            <p>Conservar copia para sus registros</p>
          </div>
        </div>
        <p className="border-t border-gray-300 pt-2 text-center text-gray-500 italic">
          {emisor.email} | {emisor.telefono} | {emisor.web}
        </p>
      </div>
    </div>
  )
}
