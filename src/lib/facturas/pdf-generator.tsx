/**
 * GENERADOR DE PDF PARA FACTURAS
 * 
 * Utiliza @react-pdf/renderer para crear PDFs profesionales
 * Cumplimiento normativa española y europea
 */

import { Document, Page, Text, View, StyleSheet, Image, PDFDownloadLink } from '@react-pdf/renderer'

// Estilos para el PDF
const styles = StyleSheet.create({
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
    borderTopColor: '#2563eb',
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
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#111827',
  },
  subtitle: {
    fontSize: 10,
    color: '#666666',
    marginBottom: 2,
  },
  facturaNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#cccccc',
    marginBottom: 15,
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
    gap: 40,
  },
  dataBlock: {
    flex: 1,
    borderLeftWidth: 3,
    borderLeftColor: '#2563eb',
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
    backgroundColor: '#eff6ff',
    borderBottomWidth: 2,
    borderBottomColor: '#2563eb',
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
    width: '40%',
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
    backgroundColor: '#2563eb',
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
    padding: 10,
    marginBottom: 15,
    fontSize: 9,
    borderRadius: 4,
  },
  footer: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    fontSize: 8,
    color: '#666666',
    textAlign: 'center',
  },
  footerGrid: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 20,
  },
  footerColumn: {
    flex: 1,
    fontSize: 8,
  },
})

/**
 * Componente PDF de Factura
 * Renderiza una factura completa en PDF
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
  condicionesPago = 'Pago a la vista',
  notas,
  verifactuNumero,
  verifactuURL,
}: any) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* HEADER */}
      <View style={styles.header}>
        {/* LEFT: Logo y datos emisor */}
        <View style={styles.leftHeader}>
          {logoUrl && (
            <Image
              src={logoUrl}
              style={{ width: 80, height: 80, marginBottom: 10, objectFit: 'contain' }}
            />
          )}
          <Text style={styles.title}>{emisor.nombre}</Text>
          <Text style={styles.subtitle}>
            {emisor.direccion}, {emisor.codigoPostal} {emisor.ciudad}
          </Text>
          <Text style={styles.subtitle}>
            {emisor.provincia}, {emisor.pais}
          </Text>
          <Text style={styles.subtitle}>CIF: {emisor.nif}</Text>
          {emisor.telefono && (
            <Text style={styles.subtitle}>Teléfono: {emisor.telefono}</Text>
          )}
          {emisor.email && (
            <Text style={styles.subtitle}>Email: {emisor.email}</Text>
          )}
        </View>

        {/* RIGHT: Número de factura */}
        <View style={styles.rightHeader}>
          <Text style={styles.facturaNumber}>FACTURA</Text>
          <View style={styles.facturaBox}>
            <Text style={styles.dataLabel}>Número de Factura</Text>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#2563eb', marginBottom: 10 }}>
              {serie}-{numeroFactura}
            </Text>
            <Text style={styles.dataLabel}>Fecha de Emisión</Text>
            <Text style={{ fontSize: 12, fontWeight: 'bold' }}>
              {new Date(fechaEmision).toLocaleDateString('es-ES')}
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
          <Text style={styles.dataValueSmall}>{receptor.nif}</Text>
          {receptor.direccion && (
            <Text style={styles.dataValueSmall}>{receptor.direccion}</Text>
          )}
          {receptor.codigoPostal && (
            <Text style={styles.dataValueSmall}>
              {receptor.codigoPostal} {receptor.ciudad}, {receptor.provincia}
            </Text>
          )}
        </View>

        {/* VEHÍCULO */}
        {vehiculo && (
          <View style={styles.dataBlockVehicle}>
            <Text style={styles.dataLabel}>Vehículo:</Text>
            {vehiculo.modelo && (
              <Text style={styles.dataValueSmall}>
                Modelo: {vehiculo.modelo}
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
          </View>
        )}
      </View>

      {/* TABLA DE LÍNEAS */}
      <View style={styles.table}>
        {/* Header */}
        <View style={styles.tableHeader}>
          <Text style={{ ...styles.tableCell, fontWeight: 'bold', flex: 2 }}>
            DESCRIPCIÓN
          </Text>
          <Text style={{ ...styles.tableCellRight, fontWeight: 'bold' }}>
            CANTIDAD
          </Text>
          <Text style={{ ...styles.tableCellRight, fontWeight: 'bold' }}>
            PRECIO UNIT.
          </Text>
          <Text style={{ ...styles.tableCellRight, fontWeight: 'bold' }}>
            TOTAL
          </Text>
        </View>

        {/* Rows */}
        {lineas.map((linea: any, idx: number) => (
          <View key={idx} style={styles.tableRow}>
            <Text style={{ ...styles.tableCell, flex: 2 }}>
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
          <Text>TOTAL A PAGAR:</Text>
          <Text>€{total.toFixed(2)}</Text>
        </View>
      </View>

      {/* VERIFACTU */}
      {verifactuNumero && (
        <View style={styles.verifactuBox}>
          <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>
            Verificación AEAT - Verifactu
          </Text>
          <Text>
            Número de verificación: {verifactuNumero}
          </Text>
          {verifactuURL && (
            <Text>Verificar en: {verifactuURL}</Text>
          )}
        </View>
      )}

      {/* NOTAS */}
      {notas && (
        <View style={styles.notasBox}>
          <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Notas:</Text>
          <Text>{notas}</Text>
        </View>
      )}

      {/* FOOTER */}
      <View style={styles.footer}>
        <View style={styles.footerGrid}>
          <View style={styles.footerColumn}>
            <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>
              Información Legal
            </Text>
            <Text>Factura emitida según RD 1619/2012</Text>
            <Text>Cumplimiento Orden HAP/492/2017</Text>
            <Text>Directiva UE 2006/112/CE</Text>
          </View>
          <View style={styles.footerColumn}>
            <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>
              Conservación
            </Text>
            <Text>Período: 4 años</Text>
            <Text>Formato: Electrónico/Digital</Text>
            <Text>Accesibilidad según normativa</Text>
          </View>
          <View style={styles.footerColumn}>
            <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>
              Derechos del Cliente
            </Text>
            <Text>Puede verificar en portal AEAT</Text>
            <Text>Derecho a info adicional</Text>
            <Text>Conservar para sus registros</Text>
          </View>
        </View>
        <Text style={{ marginTop: 10 }}>
          {emisor.email} | {emisor.telefono} | {emisor.web}
        </Text>
      </View>
    </Page>
  </Document>
)

/**
 * Función helper para generar PDF
 * Retorna el documento listo para descargar
 */
export function generarPDFFactura(datos: any) {
  return PDFFactura(datos)
}
