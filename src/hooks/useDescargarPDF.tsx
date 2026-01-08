/**
 * HOOK: Descargar e Imprimir PDF de Factura
 *
 * Maneja la descarga e impresión de PDFs con React-PDF
 */

import React, { useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import { PDFFactura } from '@/lib/facturas/pdf-generator'
import { toast } from 'sonner'

export function useDescargarPDF() {
  const [cargando, setCargando] = useState(false)

  // Obtener datos y generar blob del PDF
  const generarPDFBlob = async (facturaId: string) => {
    const response = await fetch(`/api/facturas/generar-pdf?id=${facturaId}`)
    const data = await response.json()

    if (data.error) {
      throw new Error(data.error)
    }

    // Crear el documento PDF
    const pdfDoc = <PDFFactura {...data.datos} />

    // Generar el blob del PDF
    const blob = await pdf(pdfDoc).toBlob()
    return blob
  }

  // Descargar factura como archivo PDF
  const descargarFactura = async (facturaId: string, numeroFactura: string) => {
    setCargando(true)
    try {
      const blob = await generarPDFBlob(facturaId)

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
    } finally {
      setCargando(false)
    }
  }

  // Imprimir factura abriendo el PDF en nueva ventana
  const imprimirFactura = async (facturaId: string, numeroFactura: string) => {
    setCargando(true)
    try {
      const blob = await generarPDFBlob(facturaId)

      // Crear URL del blob
      const url = URL.createObjectURL(blob)

      // Abrir en nueva ventana e imprimir
      const printWindow = window.open(url, '_blank')

      if (printWindow) {
        printWindow.onload = () => {
          // Esperar a que cargue y luego imprimir
          setTimeout(() => {
            printWindow.print()
          }, 500)
        }
        toast.success('Abriendo PDF para imprimir...')
      } else {
        // Si está bloqueado el popup, descargar como alternativa
        toast.info('Descargando PDF (activa popups para imprimir directamente)')
        const link = document.createElement('a')
        link.href = url
        link.download = `Factura_${numeroFactura}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }

      // Limpiar URL después de un tiempo
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (error) {
      console.error(error)
      toast.error('Error al preparar impresión')
    } finally {
      setCargando(false)
    }
  }

  return {
    descargarFactura,
    imprimirFactura,
    cargando
  }
}
