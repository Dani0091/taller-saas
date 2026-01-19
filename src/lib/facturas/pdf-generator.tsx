/**
 * GENERADOR DE PDF PARA FACTURAS
 *
 * Utiliza @react-pdf/renderer para crear PDFs profesionales
 * Cumplimiento normativa española y europea
 * Personalización de colores por taller
 */

import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

/**
 * Crea estilos dinámicos basados en colores personalizados
 */
const createStyles = (colorPrimario: string, colorSecundario: string) => StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30, // Reducido de 40 a 30 para mejor uso del espacio A4
    paddingBottom: 50, // Espacio para footer
    fontFamily: 'Helvetica',
    fontSize: 9, // Tamaño base más pequeño
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20, // Reducido de 30
    borderTopWidth: 3, // Reducido de 4
    borderTopColor: colorPrimario,
    paddingTop: 15, // Reducido de 20
  },
  leftHeader: {
    flex: 1,
  },
  rightHeader: {
    flex: 1,
    textAlign: 'right',
  },
  title: {
    fontSize: 18, // Reducido de 24
    fontWeight: 'bold',
    marginBottom: 5, // Reducido de 8
    color: '#111827',
  },
  subtitle: {
    fontSize: 8, // Reducido de 9
    color: '#666666',
    marginBottom: 1, // Reducido de 2
  },
  facturaNumber: {
    fontSize: 22, // Reducido de 28
    fontWeight: 'bold',
    color: '#cccccc',
    marginBottom: 8, // Reducido de 12
  },
  facturaBox: {
    border: '1px solid #e5e7eb',
    backgroundColor: '#f3f4f6',
    padding: 8, // Reducido de 12
    borderRadius: 3, // Reducido de 4
  },
  infoDatos: {
    flexDirection: 'row',
    marginBottom: 15, // Reducido de 20
    gap: 20, // Reducido de 30
  },
  dataBlock: {
    flex: 1,
    borderLeftWidth: 2, // Reducido de 3
    borderLeftColor: colorPrimario,
    paddingLeft: 8, // Reducido de 12
  },
  dataBlockVehicle: {
    flex: 1,
    borderLeftWidth: 2, // Reducido de 3
    borderLeftColor: '#f97316',
    paddingLeft: 8, // Reducido de 12
  },
  dataLabel: {
    fontSize: 7, // Reducido de 8
    fontWeight: 'bold',
    color: '#666666',
    textTransform: 'uppercase',
    marginBottom: 2, // Reducido de 4
  },
  dataValue: {
    fontSize: 9, // Reducido de 11
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 1, // Reducido de 2
  },
  dataValueSmall: {
    fontSize: 8, // Reducido de 9
    color: '#666666',
  },
  table: {
    marginBottom: 12, // Reducido de 20
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colorPrimario + '15', // Color con opacidad
    borderBottomWidth: 1, // Reducido de 2
    borderBottomColor: colorPrimario,
    paddingVertical: 5, // Reducido de 8
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 4, // Reducido de 6
    minHeight: 18, // Altura mínima para consistencia
  },
  tableCell: {
    flex: 1,
    paddingHorizontal: 4, // Reducido de 8
    fontSize: 8, // Reducido de 9
  },
  tableCellRight: {
    flex: 1,
    paddingHorizontal: 4, // Reducido de 8
    fontSize: 8, // Reducido de 9
    textAlign: 'right',
  },
  totalsBox: {
    marginLeft: 'auto',
    width: '40%', // Reducido de 45%
    marginBottom: 12, // Reducido de 20
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2, // Reducido de 4
    paddingHorizontal: 8, // Reducido de 12
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    fontSize: 8, // Reducido de 9
  },
  totalRowBold: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3, // Reducido de 6
    paddingHorizontal: 8, // Reducido de 12
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1, // Reducido de 2
    borderBottomColor: '#e5e7eb',
    fontSize: 8, // Reducido de 9
    fontWeight: 'bold',
  },
  totalFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6, // Reducido de 10
    paddingHorizontal: 8, // Reducido de 12
    backgroundColor: colorSecundario,
    color: '#ffffff',
    fontSize: 10, // Reducido de 12
    fontWeight: 'bold',
    marginTop: 2, // Reducido de 4
    borderRadius: 3, // Reducido de 4
  },
  verifactuBox: {
    backgroundColor: '#fef3c7',
    borderLeftWidth: 2, // Reducido de 3
    borderLeftColor: '#eab308',
    padding: 6, // Reducido de 10
    marginBottom: 8, // Reducido de 15
    fontSize: 7, // Reducido de 8
  },
  notasBox: {
    backgroundColor: '#f3f4f6',
    padding: 8, // Reducido de 12
    marginBottom: 8, // Reducido de 15
    fontSize: 8, // Reducido de 9
    borderRadius: 3, // Reducido de 4
  },
  ibanBox: {
    backgroundColor: colorPrimario + '10',
    borderWidth: 1,
    borderColor: colorPrimario,
    padding: 8, // Reducido de 12
    marginBottom: 8, // Reducido de 15
    borderRadius: 3, // Reducido de 4
  },
  footer: {
    position: 'absolute', // Fijado al fondo
    bottom: 20,
    left: 30,
    right: 30,
    paddingTop: 8, // Reducido de 15
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    fontSize: 6, // Reducido de 7
    color: '#666666',
  },
  footerGrid: {
    flexDirection: 'row',
    marginBottom: 6, // Reducido de 10
    gap: 10, // Reducido de 15
  },
  footerColumn: {
    flex: 1,
    fontSize: 6, // Reducido de 7
  },
})

/**
 * Props del componente PDF de Factura
 */
interface PDFFacturaProps {
  numeroFactura: string
  serie: string
  fechaEmision: string
  fechaVencimiento: string
  logoUrl?: string
  emisor: {
    nombre: string
    nif: string
    direccion: string
    codigoPostal?: string
    ciudad?: string
    provincia?: string
    pais?: string
    telefono?: string
    email?: string
    web?: string
  }
  receptor: {
    nombre: string
    nif?: string
    direccion?: string
    codigoPostal?: string
    ciudad?: string
    provincia?: string
  }
  // Persona de contacto (puede diferir del cliente)
  personaContacto?: string
  telefonoContacto?: string
  vehiculo?: {
    marca?: string
    modelo?: string
    matricula?: string
    km?: number
    bastidor?: string
  }
  lineas: Array<{
    descripcion: string
    cantidad: number
    precioUnitario: number
    total: number
  }>
  baseImponible: number
  ivaPercentaje: number
  cuotaIVA: number
  descuento?: number
  envio?: number
  total: number
  metodoPago?: string
  condicionesPago?: string
  notas?: string
  notasLegales?: string
  iban?: string
  // VERI*FACTU - Nuevos campos obligatorios
  verifactuNumero?: string
  verifactuURL?: string
  verifactuQRImage?: string // Imagen QR en base64
  verifactuHuella?: string // Huella SHA-256
  esVerifactu?: boolean // Si es factura VERI*FACTU
  // Colores personalizados
  colorPrimario?: string
  colorSecundario?: string
}

/**
 * Componente PDF de Factura
 * Renderiza una factura completa en PDF con colores personalizables
 */
export const PDFFactura = ({
  numeroFactura,
  serie,
  fechaEmision,
  fechaVencimiento,
  logoUrl,
  emisor,
  receptor,
  personaContacto,
  telefonoContacto,
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
  notasLegales,
  iban,
  verifactuNumero,
  verifactuURL,
  verifactuQRImage,
  verifactuHuella,
  esVerifactu = false,
  colorPrimario = '#0284c7',
  colorSecundario = '#0369a1',
}: PDFFacturaProps) => {
  const styles = createStyles(colorPrimario, colorSecundario)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header}>
          {/* LEFT: Logo y datos emisor */}
          <View style={styles.leftHeader}>
            {logoUrl && (
              <Image
                src={logoUrl}
                style={{ width: 50, height: 50, marginBottom: 5, objectFit: 'contain' }}
              />
            )}
            <Text style={styles.title}>{emisor.nombre}</Text>
            <Text style={styles.subtitle}>CIF: {emisor.nif}</Text>
            <Text style={styles.subtitle}>{emisor.direccion}</Text>
            {emisor.codigoPostal && (
              <Text style={styles.subtitle}>
                {emisor.codigoPostal} {emisor.ciudad}
                {emisor.provincia && `, ${emisor.provincia}`}
              </Text>
            )}
            {emisor.telefono && (
              <Text style={styles.subtitle}>Tel: {emisor.telefono}</Text>
            )}
            {emisor.email && (
              <Text style={styles.subtitle}>{emisor.email}</Text>
            )}
          </View>

          {/* RIGHT: Número de factura */}
          <View style={styles.rightHeader}>
            <Text style={styles.facturaNumber}>FACTURA</Text>
            <View style={styles.facturaBox}>
              <Text style={styles.dataLabel}>Número de Factura</Text>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: colorPrimario, marginBottom: 4 }}>
                {numeroFactura}
              </Text>
              <Text style={styles.dataLabel}>Fecha de Emisión</Text>
              <Text style={{ fontSize: 9, fontWeight: 'bold', marginBottom: 2 }}>
                {new Date(fechaEmision).toLocaleDateString('es-ES')}
              </Text>
              <Text style={styles.dataLabel}>Fecha de Vencimiento</Text>
              <Text style={{ fontSize: 9, fontWeight: 'bold' }}>
                {new Date(fechaVencimiento).toLocaleDateString('es-ES')}
              </Text>
            </View>
          </View>
        </View>

        {/* DATOS: Cliente y Vehículo */}
        <View style={styles.infoDatos}>
          {/* RECEPTOR */}
          <View style={styles.dataBlock}>
            <Text style={styles.dataLabel}>Facturado a:</Text>
            <Text style={styles.dataValue}>{receptor.nombre}</Text>
            {receptor.nif && <Text style={styles.dataValueSmall}>NIF: {receptor.nif}</Text>}
            {receptor.direccion && (
              <Text style={styles.dataValueSmall}>{receptor.direccion}</Text>
            )}
            {receptor.codigoPostal && (
              <Text style={styles.dataValueSmall}>
                {receptor.codigoPostal} {receptor.ciudad}
                {receptor.provincia && `, ${receptor.provincia}`}
              </Text>
            )}
            {/* Persona de contacto si difiere del cliente */}
            {personaContacto && (
              <>
                <Text style={{ ...styles.dataLabel, marginTop: 4 }}>Persona de contacto:</Text>
                <Text style={styles.dataValueSmall}>{personaContacto}</Text>
                {telefonoContacto && (
                  <Text style={styles.dataValueSmall}>Tel: {telefonoContacto}</Text>
                )}
              </>
            )}
          </View>

          {/* VEHÍCULO */}
          {vehiculo && (vehiculo.matricula || vehiculo.modelo) && (
            <View style={styles.dataBlockVehicle}>
              <Text style={styles.dataLabel}>Vehículo:</Text>
              {vehiculo.marca && vehiculo.modelo && (
                <Text style={styles.dataValue}>
                  {vehiculo.marca} {vehiculo.modelo}
                </Text>
              )}
              {vehiculo.matricula && (
                <Text style={styles.dataValueSmall}>
                  Matrícula: {vehiculo.matricula}
                </Text>
              )}
              {vehiculo.km && (
                <Text style={styles.dataValueSmall}>
                  Km: {vehiculo.km.toLocaleString('es-ES')}
                </Text>
              )}
              {vehiculo.bastidor && (
                <Text style={styles.dataValueSmall}>
                  VIN: {vehiculo.bastidor}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* TABLA DE LÍNEAS */}
        <View style={styles.table}>
          {/* Header */}
          <View style={styles.tableHeader}>
            <Text style={{ ...styles.tableCell, fontWeight: 'bold', flex: 3, color: colorSecundario }}>
              DESCRIPCIÓN
            </Text>
            <Text style={{ ...styles.tableCellRight, fontWeight: 'bold', color: colorSecundario }}>
              CANT.
            </Text>
            <Text style={{ ...styles.tableCellRight, fontWeight: 'bold', color: colorSecundario }}>
              P. UNIT.
            </Text>
            <Text style={{ ...styles.tableCellRight, fontWeight: 'bold', color: colorSecundario }}>
              TOTAL
            </Text>
          </View>

          {/* Rows */}
          {lineas.map((linea, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={{ ...styles.tableCell, flex: 3 }}>
                {linea.descripcion}
              </Text>
              <Text style={styles.tableCellRight}>
                {linea.cantidad}
              </Text>
              <Text style={styles.tableCellRight}>
                €{linea.precioUnitario.toFixed(2)}
              </Text>
              <Text style={{ ...styles.tableCellRight, fontWeight: 'bold' }}>
                €{linea.total.toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        {/* TOTALES */}
        <View style={styles.totalsBox}>
          <View style={styles.totalRow}>
            <Text>Subtotal:</Text>
            <Text>€{baseImponible.toFixed(2)}</Text>
          </View>

          {descuento > 0 && (
            <View style={styles.totalRow}>
              <Text>Descuento:</Text>
              <Text>-€{descuento.toFixed(2)}</Text>
            </View>
          )}

          {envio > 0 && (
            <View style={styles.totalRow}>
              <Text>Envío/Manipulación:</Text>
              <Text>€{envio.toFixed(2)}</Text>
            </View>
          )}

          <View style={styles.totalRowBold}>
            <Text>Base Imponible:</Text>
            <Text>€{baseImponible.toFixed(2)}</Text>
          </View>

          <View style={styles.totalRowBold}>
            <Text>IVA ({ivaPercentaje}%):</Text>
            <Text>€{cuotaIVA.toFixed(2)}</Text>
          </View>

          <View style={styles.totalFinal}>
            <Text style={{ color: '#ffffff' }}>TOTAL A PAGAR:</Text>
            <Text style={{ color: '#ffffff' }}>€{total.toFixed(2)}</Text>
          </View>
        </View>

        {/* INFORMACIÓN DE PAGO */}
        {iban && (
          <View style={styles.ibanBox}>
            <Text style={{ fontWeight: 'bold', marginBottom: 4, fontSize: 8, color: colorSecundario }}>
              Datos para el pago
            </Text>
            <View style={{ flexDirection: 'row', marginBottom: 2 }}>
              <Text style={{ fontSize: 7, width: 70 }}>Método de pago:</Text>
              <Text style={{ fontSize: 7, fontWeight: 'bold' }}>{metodoPago}</Text>
            </View>
            <View style={{ flexDirection: 'row', marginBottom: 2 }}>
              <Text style={{ fontSize: 7, width: 70 }}>IBAN:</Text>
              <Text style={{ fontSize: 7, fontWeight: 'bold', fontFamily: 'Courier' }}>{iban}</Text>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <Text style={{ fontSize: 7, width: 70 }}>Condiciones:</Text>
              <Text style={{ fontSize: 7, fontWeight: 'bold' }}>{condicionesPago}</Text>
            </View>
          </View>
        )}

        {/* VERI*FACTU - Bloque obligatorio según normativa AEAT
            NOTA: Desactivado temporalmente hasta que sea obligatorio (2027)
            El código está preparado, solo activar cuando se configure el NIF del fabricante
        */}
        {esVerifactu && verifactuNumero && verifactuQRImage && (
          <View style={{
            backgroundColor: '#ecfdf5',
            borderWidth: 1,
            borderColor: '#059669',
            borderRadius: 3,
            padding: 8,
            marginBottom: 8,
            flexDirection: 'row',
          }}>
            {/* Código QR - Tamaño 30-40mm según normativa */}
            {verifactuQRImage && (
              <View style={{ marginRight: 8 }}>
                <Image
                  src={verifactuQRImage}
                  style={{
                    width: 70, // Reducido de 85
                    height: 70,
                  }}
                />
              </View>
            )}

            {/* Información VERI*FACTU */}
            <View style={{ flex: 1 }}>
              {/* Frase obligatoria */}
              <Text style={{
                fontSize: 8,
                fontWeight: 'bold',
                color: '#059669',
                marginBottom: 4,
              }}>
                VERI*FACTU
              </Text>
              <Text style={{
                fontSize: 7,
                color: '#065f46',
                marginBottom: 4,
              }}>
                Factura verificable en la sede electrónica de la AEAT
              </Text>

              {/* Datos de verificación */}
              <View style={{ flexDirection: 'row', marginBottom: 2 }}>
                <Text style={{ fontSize: 6, color: '#374151', width: 65 }}>
                  Nº Verificación:
                </Text>
                <Text style={{ fontSize: 6, fontWeight: 'bold', fontFamily: 'Courier' }}>
                  {verifactuNumero}
                </Text>
              </View>

              {verifactuHuella && (
                <View style={{ flexDirection: 'row', marginBottom: 2 }}>
                  <Text style={{ fontSize: 6, color: '#374151', width: 65 }}>
                    Huella SHA-256:
                  </Text>
                  <Text style={{ fontSize: 5, fontFamily: 'Courier' }}>
                    {verifactuHuella.substring(0, 32)}...
                  </Text>
                </View>
              )}

              {verifactuURL && (
                <View style={{ flexDirection: 'row' }}>
                  <Text style={{ fontSize: 6, color: '#374151', width: 65 }}>
                    Verificar en:
                  </Text>
                  <Text style={{ fontSize: 5, color: '#2563eb' }}>
                    sede.agenciatributaria.gob.es
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* NOTAS */}
        {notas && (
          <View style={styles.notasBox}>
            <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Observaciones:</Text>
            <Text>{notas}</Text>
          </View>
        )}

        {/* NOTAS LEGALES DEL TALLER - Ahora aparecen sobre el footer */}
        {notasLegales && (
          <View style={{ ...styles.notasBox, backgroundColor: '#f9fafb', marginBottom: 60 }}>
            <Text style={{ fontSize: 7, color: '#666666', fontWeight: 'bold', marginBottom: 2 }}>
              Notas Legales / Información Adicional:
            </Text>
            <Text style={{ fontSize: 7, color: '#666666' }}>{notasLegales}</Text>
          </View>
        )}

        {/* FOOTER - Fijado al fondo de la página */}
        <View style={styles.footer} fixed>
          <View style={styles.footerGrid}>
            <View style={styles.footerColumn}>
              <Text style={{ fontWeight: 'bold', marginBottom: 2, color: colorSecundario }}>
                Información Legal
              </Text>
              <Text>RD 1619/2012 | HAP/492/2017</Text>
              <Text>Directiva UE 2006/112/CE</Text>
            </View>
            <View style={styles.footerColumn}>
              <Text style={{ fontWeight: 'bold', marginBottom: 2, color: colorSecundario }}>
                Conservación
              </Text>
              <Text>Período: 4 años</Text>
              <Text>Formato: Electrónico</Text>
            </View>
            <View style={styles.footerColumn}>
              <Text style={{ fontWeight: 'bold', marginBottom: 2, color: colorSecundario }}>
                Derechos
              </Text>
              <Text>Verificable en AEAT</Text>
              <Text>Conservar para registros</Text>
            </View>
          </View>
          <Text style={{ marginTop: 4, textAlign: 'center' }}>
            {emisor.nombre} | {emisor.email} | {emisor.telefono}
          </Text>
        </View>
      </Page>
    </Document>
  )
}

/**
 * Función helper para generar PDF
 * Retorna el documento listo para descargar
 */
export function generarPDFFactura(datos: PDFFacturaProps) {
  return PDFFactura(datos)
}
