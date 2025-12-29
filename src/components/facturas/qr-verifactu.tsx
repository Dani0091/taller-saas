/**
 * COMPONENTE QR VERIFACTU
 * 
 * Muestra el código QR de verificación en AEAT
 * Permite al usuario escanear o acceder al portal de verificación
 */

'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ExternalLink, Copy, Download } from 'lucide-react'
import { toast } from 'sonner'

interface QRVerifactuProps {
  // Datos de la factura para generar el QR
  nifEmisor: string
  numeroFactura: string
  numeroVerificacion: string
  urlVerificacion: string
  qrData: string // Datos codificados del QR
}

export function QRVerifactu({
  nifEmisor,
  numeroFactura,
  numeroVerificacion,
  urlVerificacion,
  qrData,
}: QRVerifactuProps) {
  const [qrImage, setQrImage] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Generar QR usando la librería qrcode
    // Los datos del QR contienen la información mínima para verificación
    const generarQR = async () => {
      try {
        const qrDataURL = await QRCode.toDataURL(qrData, {
          errorCorrectionLevel: 'H',
          type: 'image/png',
          quality: 0.95,
          margin: 1,
          width: 300,
        })
        setQrImage(qrDataURL)
      } catch (error) {
        console.error('Error al generar QR:', error)
        toast.error('Error al generar código QR')
      } finally {
        setLoading(false)
      }
    }

    if (qrData) {
      generarQR()
    }
  }, [qrData])

  const handleDescargarQR = () => {
    if (!qrImage) return

    const link = document.createElement('a')
    link.href = qrImage
    link.download = `QR_${numeroFactura}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('QR descargado')
  }

  const handleCopiarURL = () => {
    navigator.clipboard.writeText(urlVerificacion)
    toast.success('URL copiada al portapapeles')
  }

  const handleVerificar = () => {
    window.open(urlVerificacion, '_blank', 'noopener,noreferrer')
  }

  return (
    <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
      <div className="space-y-4">
        {/* TÍTULO */}
        <div>
          <h3 className="font-bold text-lg text-gray-900 mb-1">
            Código de Verificación Verifactu
          </h3>
          <p className="text-sm text-gray-600">
            Escanea este código QR para verificar la factura en AEAT
          </p>
        </div>

        {/* QR CODE */}
        <div className="flex justify-center py-4 bg-white rounded-lg border-2 border-blue-200">
          {loading ? (
            <div className="w-40 h-40 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
            </div>
          ) : qrImage ? (
            <img
              src={qrImage}
              alt={`QR de verificación: ${numeroFactura}`}
              className="w-40 h-40"
            />
          ) : (
            <div className="text-gray-500">Error al generar QR</div>
          )}
        </div>

        {/* INFORMACIÓN */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white p-3 rounded">
          <div>
            <p className="text-xs text-gray-600 uppercase font-semibold">
              Número de Verificación
            </p>
            <p className="font-mono font-bold text-gray-900">{numeroVerificacion}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 uppercase font-semibold">
              Factura
            </p>
            <p className="font-mono font-bold text-gray-900">{numeroFactura}</p>
          </div>
        </div>

        {/* BOTONES DE ACCIÓN */}
        <div className="flex flex-col gap-2">
          <Button
            onClick={handleVerificar}
            className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <ExternalLink className="w-4 h-4" />
            Verificar en AEAT
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handleDescargarQR}
              variant="outline"
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Descargar</span>
            </Button>
            <Button
              onClick={handleCopiarURL}
              variant="outline"
              className="gap-2"
            >
              <Copy className="w-4 h-4" />
              <span className="hidden sm:inline">Copiar URL</span>
            </Button>
          </div>
        </div>

        {/* NOTA LEGAL */}
        <div className="bg-white p-3 rounded text-xs text-gray-600 border-l-4 border-blue-400">
          <p className="font-semibold mb-1">Información Verifactu:</p>
          <p>
            Este código verifica la autenticidad de la factura ante Hacienda. 
            Cumple con la normativa española de registro telemático de facturas.
          </p>
        </div>
      </div>
    </Card>
  )
}
