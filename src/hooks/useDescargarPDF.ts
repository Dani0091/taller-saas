/**
 * HOOK: Descargar PDF de Factura
 * 
 * Maneja la descarga de PDFs con React-PDF
 */

import { PDFDownloadLink } from '@react-pdf/renderer'
import { PDFFactura } from '@/lib/facturas/pdf-generator'
import { toast } from 'sonner'

export function useDescargarPDF() {
  const descargarFactura = async (facturaId: string, numeroFactura: string) => {
    try {
      // Obtener datos de la factura
      const response = await fetch(`/api/facturas/generar-pdf?id=${facturaId}`)
      const data = await response.json()

      if (data.error) {
        toast.error(data.error)
        return
      }

      // Crear el PDF
      const pdfDoc = (
        <PDFFactura {...data.datos} />
      )

      // Generar y descargar
      const link = document.createElement('a')
      link.href = URL.createObjectURL(
        new Blob([pdfDoc as any], { type: 'application/pdf' })
      )
      link.download = `Factura_${numeroFactura}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success('PDF descargado correctamente')
    } catch (error) {
      console.error(error)
      toast.error('Error al descargar PDF')
    }
  }

  return { descargarFactura }
}
