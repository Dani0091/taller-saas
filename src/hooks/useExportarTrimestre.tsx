/**
 * HOOK: Exportar un trimestre para Hacienda / la gestoría
 * ZIP con el libro de facturas emitidas (CSV) y el PDF de cada factura.
 * Los PDF se generan en el navegador de 4 en 4, con el progreso a la vista.
 */

import { useState } from 'react'
import { toast } from 'sonner'
import { useDescargarPDF } from './useDescargarPDF'
import { sanitizarNombreArchivo, triggerDownload } from './useDescargarFacturasMultiple'
import { libroFacturasCsv, type FacturaLibro } from '@/lib/facturas/libro-csv'

const EN_PARALELO = 4

type FacturaExportada = FacturaLibro & { id: string }

export function useExportarTrimestre() {
  const { generarPDFBlob } = useDescargarPDF()
  const [progreso, setProgreso] = useState<{ hechas: number; total: number } | null>(null)

  const exportarTrimestre = async (clave: string) => {
    setProgreso({ hechas: 0, total: 0 })
    try {
      const res = await fetch(`/api/facturas/exportar?trimestre=${encodeURIComponent(clave)}`)
      const datos = await res.json()
      if (!res.ok) throw new Error(datos.error || 'No se pudo preparar la exportación')

      const facturas = datos.facturas as FacturaExportada[]
      const nombre = String(datos.trimestre).split(' (')[0].replace(' ', '_') // «4T_2026»
      if (facturas.length === 0) {
        toast.info(`No hay facturas expedidas en el ${datos.trimestre}`)
        return
      }

      const { default: JSZip } = await import('jszip')
      const zip = new JSZip()
      zip.file(`Libro_facturas_emitidas_${nombre}.csv`, libroFacturasCsv(facturas, `Libro de facturas emitidas · ${datos.trimestre}`))

      const carpeta = zip.folder('PDF')!
      const fallidas: string[] = []
      setProgreso({ hechas: 0, total: facturas.length })
      for (let i = 0; i < facturas.length; i += EN_PARALELO) {
        const lote = facturas.slice(i, i + EN_PARALELO)
        const resultados = await Promise.allSettled(lote.map((f) => generarPDFBlob(f.id)))
        resultados.forEach((r, j) => {
          const numero = lote[j].numero_factura || lote[j].id
          if (r.status === 'fulfilled') carpeta.file(`Factura_${sanitizarNombreArchivo(numero)}.pdf`, r.value)
          else fallidas.push(numero)
        })
        setProgreso({ hechas: Math.min(i + EN_PARALELO, facturas.length), total: facturas.length })
      }
      if (fallidas.length > 0) {
        zip.file('PDF_no_generados.txt', `No se pudo generar el PDF de estas facturas; descárgalas desde su ficha:\r\n${fallidas.join('\r\n')}\r\n`)
      }

      triggerDownload(await zip.generateAsync({ type: 'blob' }), `Facturas_${nombre}.zip`)
      if (fallidas.length > 0) toast.warning(`${datos.trimestre}: ${facturas.length - fallidas.length} PDF y el libro; ${fallidas.length} PDF no se generaron`)
      else toast.success(`${datos.trimestre}: ${facturas.length} facturas y el libro CSV`)
    } catch (error) {
      console.error('Error exportando el trimestre:', error)
      toast.error(error instanceof Error ? error.message : 'Error exportando el trimestre')
    } finally {
      setProgreso(null)
    }
  }

  return { exportarTrimestre, progreso, exportando: progreso !== null }
}
