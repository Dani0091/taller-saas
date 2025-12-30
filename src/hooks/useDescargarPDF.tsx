/**
 * HOOK: Descargar PDF de Factura
 *
 * Maneja la descarga de PDFs con React-PDF
 */

import React from 'react'
import { pdf } from '@react-pdf/renderer'
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

      // Crear el documento PDF
      const pdfDoc = <PDFFactura {...data.datos} />

      // Generar el blob del PDF
      const blob = await pdf(pdfDoc).toBlob()

      // Crear URL y descargar
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Factura_${numeroFactura}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success('PDF descargado correctamente')
    } catch (error) {
      console.error(error)
      toast.error('Error al descargar PDF')
    }
  }

  return { descargarFactura }
}
