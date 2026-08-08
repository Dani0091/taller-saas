/**
 * HOOK: Descarga múltiple de facturas
 * 1 factura -> PDF directo. 2-5 -> PDFs individuales. 6+ -> ZIP.
 * Reutiliza generarPDFBlob de useDescargarPDF — no duplica la generación del PDF.
 */

import { useState } from 'react'
import JSZip from 'jszip'
import { toast } from 'sonner'
import { useDescargarPDF } from './useDescargarPDF'

interface FacturaDescargable {
  id: string
  numeroFactura: string
}

function sanitizarNombreArchivo(nombre: string): string {
  return nombre.replace(/[\\/:*?"<>|]/g, '-')
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function useDescargarFacturasMultiple() {
  const { generarPDFBlob } = useDescargarPDF()
  const [descargando, setDescargando] = useState(false)

  const descargarSeleccionadas = async (facturas: FacturaDescargable[]) => {
    if (facturas.length === 0) return

    setDescargando(true)
    try {
      if (facturas.length === 1) {
        const blob = await generarPDFBlob(facturas[0].id)
        triggerDownload(blob, `Factura_${sanitizarNombreArchivo(facturas[0].numeroFactura || facturas[0].id)}.pdf`)
        toast.success('Factura descargada')
        return
      }

      const resultados = await Promise.allSettled(
        facturas.map(async (f) => ({ f, blob: await generarPDFBlob(f.id) }))
      )
      const exitosas = resultados
        .filter((r): r is PromiseFulfilledResult<{ f: FacturaDescargable; blob: Blob }> => r.status === 'fulfilled')
        .map(r => r.value)
      const fallidas = resultados.length - exitosas.length

      if (exitosas.length === 0) {
        toast.error('No se pudo descargar ninguna factura')
        return
      }

      if (exitosas.length <= 5) {
        for (const { f, blob } of exitosas) {
          triggerDownload(blob, `Factura_${sanitizarNombreArchivo(f.numeroFactura || f.id)}.pdf`)
          // Pequeña pausa para que el navegador no bloquee descargas múltiples simultáneas
          await new Promise(resolve => setTimeout(resolve, 150))
        }
      } else {
        const zip = new JSZip()
        for (const { f, blob } of exitosas) {
          zip.file(`Factura_${sanitizarNombreArchivo(f.numeroFactura || f.id)}.pdf`, blob)
        }
        const zipBlob = await zip.generateAsync({ type: 'blob' })
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
        triggerDownload(zipBlob, `Facturas_${timestamp}.zip`)
      }

      if (fallidas > 0) {
        toast.warning(`${exitosas.length} descargadas, ${fallidas} fallaron`)
      } else {
        toast.success(
          exitosas.length <= 5
            ? `${exitosas.length} facturas descargadas`
            : `${exitosas.length} facturas descargadas (ZIP)`
        )
      }
    } catch (error) {
      console.error('Error en descarga múltiple:', error)
      toast.error('Error descargando facturas')
    } finally {
      setDescargando(false)
    }
  }

  return { descargarSeleccionadas, descargando }
}
