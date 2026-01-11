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
    padding: 40,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    borderTopWidth: 4,
    borderTopColor: colorPrimario,
    paddingTop: 20,
  },
  leftHeader: {
    flex: 1,
  },
  rightHeader: {
    flex: 1,
    textAlign: 'right',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#111827',
  },
  subtitle: {
    fontSize: 9,
    color: '#666666',
    marginBottom: 2,
  },
  facturaNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#cccccc',
    marginBottom: 12,
  },
  facturaBox: {
    border: '1px solid #e5e7eb',
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 4,
  },
  infoDatos: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 30,
  },
  dataBlock: {
    flex: 1,
    borderLeftWidth: 3,
    borderLeftColor: colorPrimario,
    paddingLeft: 12,
  },
  dataBlockVehicle: {
    flex: 1,
    borderLeftWidth: 3,
    borderLeftColor: '#f97316',
    paddingLeft: 12,
  },
  dataLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#666666',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  dataValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 2,
  },
  dataValueSmall: {
    fontSize: 9,
    color: '#666666',
  },
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colorPrimario + '15', // Color con opacidad
    borderBottomWidth: 2,
    borderBottomColor: colorPrimario,
    paddingVertical: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 6,
  },
  tableCell: {
    flex: 1,
    paddingHorizontal: 8,
    fontSize: 9,
  },
  tableCellRight: {
    flex: 1,
    paddingHorizontal: 8,
    fontSize: 9,
    textAlign: 'right',
  },
  totalsBox: {
    marginLeft: 'auto',
    width: '45%',
    marginBottom: 20,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    fontSize: 9,
  },
  totalRowBold: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
    fontSize: 9,
    fontWeight: 'bold',
  },
  totalFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colorSecundario,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
    borderRadius: 4,
  },
  verifactuBox: {
    backgroundColor: '#fef3c7',
    borderLeftWidth: 3,
    borderLeftColor: '#eab308',
    padding: 10,
    marginBottom: 15,
    fontSize: 8,
  },
  notasBox: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    marginBottom: 15,
    fontSize: 9,
    borderRadius: 4,
  },
  ibanBox: {
    backgroundColor: colorPrimario + '10',
    borderWidth: 1,
    borderColor: colorPrimario,
    padding: 12,
    marginBottom: 15,
    borderRadius: 4,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    fontSize: 7,
    color: '#666666',
  },
  footerGrid: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 15,
  },
  footerColumn: {
    flex: 1,
    fontSize: 7,
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
                style={{ width: 70, height: 70, marginBottom: 8, objectFit: 'contain' }}
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
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: colorPrimario, marginBottom: 8 }}>
                {serie}{numeroFactura}
              </Text>
              <Text style={styles.dataLabel}>Fecha de Emisión</Text>
              <Text style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 4 }}>
                {new Date(fechaEmision).toLocaleDateString('es-ES')}
              </Text>
              <Text style={styles.dataLabel}>Fecha de Vencimiento</Text>
              <Text style={{ fontSize: 11, fontWeight: 'bold' }}>
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
            <Text style={{ fontWeight: 'bold', marginBottom: 6, fontSize: 10, color: colorSecundario }}>
              Datos para el pago
            </Text>
            <View style={{ flexDirection: 'row', marginBottom: 4 }}>
              <Text style={{ fontSize: 9, width: 100 }}>Método de pago:</Text>
              <Text style={{ fontSize: 9, fontWeight: 'bold' }}>{metodoPago}</Text>
            </View>
            <View style={{ flexDirection: 'row', marginBottom: 4 }}>
              <Text style={{ fontSize: 9, width: 100 }}>IBAN:</Text>
              <Text style={{ fontSize: 9, fontWeight: 'bold', fontFamily: 'Courier' }}>{iban}</Text>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <Text style={{ fontSize: 9, width: 100 }}>Condiciones:</Text>
              <Text style={{ fontSize: 9, fontWeight: 'bold' }}>{condicionesPago}</Text>
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
            borderWidth: 2,
            borderColor: '#059669',
            borderRadius: 4,
            padding: 12,
            marginBottom: 15,
            flexDirection: 'row',
          }}>
            {/* Código QR - Tamaño 30-40mm según normativa */}
            {verifactuQRImage && (
              <View style={{ marginRight: 12 }}>
                <Image
                  src={verifactuQRImage}
                  style={{
                    width: 85, // ~30mm a 72dpi
                    height: 85,
                  }}
                />
              </View>
            )}

            {/* Información VERI*FACTU */}
            <View style={{ flex: 1 }}>
              {/* Frase obligatoria */}
              <Text style={{
                fontSize: 10,
                fontWeight: 'bold',
                color: '#059669',
                marginBottom: 6,
              }}>
                VERI*FACTU
              </Text>
              <Text style={{
                fontSize: 8,
                color: '#065f46',
                marginBottom: 8,
              }}>
                Factura verificable en la sede electrónica de la AEAT
              </Text>

              {/* Datos de verificación */}
              <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                <Text style={{ fontSize: 7, color: '#374151', width: 80 }}>
                  Nº Verificación:
                </Text>
                <Text style={{ fontSize: 7, fontWeight: 'bold', fontFamily: 'Courier' }}>
                  {verifactuNumero}
                </Text>
              </View>

              {verifactuHuella && (
                <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                  <Text style={{ fontSize: 7, color: '#374151', width: 80 }}>
                    Huella SHA-256:
                  </Text>
                  <Text style={{ fontSize: 6, fontFamily: 'Courier' }}>
                    {verifactuHuella.substring(0, 32)}...
                  </Text>
                </View>
              )}

              {verifactuURL && (
                <View style={{ flexDirection: 'row' }}>
                  <Text style={{ fontSize: 7, color: '#374151', width: 80 }}>
                    Verificar en:
                  </Text>
                  <Text style={{ fontSize: 6, color: '#2563eb' }}>
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

        {/* NOTAS LEGALES DEL TALLER */}
        {notasLegales && (
          <View style={{ ...styles.notasBox, backgroundColor: '#f9fafb' }}>
            <Text style={{ fontSize: 8, color: '#666666' }}>{notasLegales}</Text>
          </View>
        )}

        {/* FOOTER */}
        <View style={styles.footer}>
          <View style={styles.footerGrid}>
            <View style={styles.footerColumn}>
              <Text style={{ fontWeight: 'bold', marginBottom: 3, color: colorSecundario }}>
                Información Legal
              </Text>
              <Text>Factura emitida según RD 1619/2012</Text>
              <Text>Cumplimiento Orden HAP/492/2017</Text>
              <Text>Directiva UE 2006/112/CE</Text>
            </View>
            <View style={styles.footerColumn}>
              <Text style={{ fontWeight: 'bold', marginBottom: 3, color: colorSecundario }}>
                Conservación
              </Text>
              <Text>Período: 4 años</Text>
              <Text>Formato: Electrónico/Digital</Text>
              <Text>Accesibilidad según normativa</Text>
            </View>
            <View style={styles.footerColumn}>
              <Text style={{ fontWeight: 'bold', marginBottom: 3, color: colorSecundario }}>
                Derechos del Cliente
              </Text>
              <Text>Puede verificar en portal AEAT</Text>
              <Text>Derecho a información adicional</Text>
              <Text>Conservar para sus registros</Text>
            </View>
          </View>
          <Text style={{ marginTop: 8, textAlign: 'center' }}>
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
