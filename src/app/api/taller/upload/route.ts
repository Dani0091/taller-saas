import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, isAuthError, authErrorResponse } from '@/lib/auth/middleware'

/**
 * API para subir archivos (logo, firma) a Telegram Storage
 * Telegram actúa como servidor de almacenamiento de archivos multimedia
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser()
    if (isAuthError(auth)) return authErrorResponse(auth)

    // Validar variables de entorno
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID

    if (!botToken || !chatId) {
      return NextResponse.json(
        { error: 'Variables de entorno TELEGRAM no configuradas' },
        { status: 500 }
      )
    }

    // Obtener datos del request
    const formData = await request.formData()
    const file = formData.get('file') as File
    const tallerId = auth.tallerId
    const tipo = formData.get('tipo') as string // 'logo' o 'firma'

    // Validar datos requeridos
    if (!file) {
      return NextResponse.json(
        { error: 'Archivo requerido' },
        { status: 400 }
      )
    }

    // Validar tamaño (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'El archivo es demasiado grande (máx 2MB)' },
        { status: 400 }
      )
    }

    // Convertir archivo a buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Crear FormData para Telegram
    const telegramForm = new FormData()
    telegramForm.append('photo', new Blob([buffer], { type: file.type }), file.name)

    // Caption personalizado según el tipo
    const emoji = tipo === 'logo' ? '🏢' : '✍️'
    const tipoLabel = tipo === 'logo' ? 'Logo' : 'Firma'
    telegramForm.append(
      'caption',
      `${emoji} ${tipoLabel} del Taller\n🆔 Taller ID: ${tallerId}\n⏰ ${new Date().toLocaleString('es-ES')}`
    )
    telegramForm.append('chat_id', chatId)

    // Enviar foto a Telegram
    const telegramRes = await fetch(
      `https://api.telegram.org/bot${botToken}/sendPhoto`,
      {
        method: 'POST',
        body: telegramForm
      }
    )

    const telegramData = await telegramRes.json()

    // Validar respuesta de Telegram
    if (!telegramData.ok) {
      throw new Error(`Telegram error: ${telegramData.description}`)
    }

    // Obtener file_id de la foto (última resolución disponible)
    const photos = telegramData.result.photo
    const fileId = photos[photos.length - 1].file_id // La de mayor resolución

    // Obtener ruta del archivo en Telegram
    const fileRes = await fetch(
      `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`
    )
    const fileData = await fileRes.json()

    if (!fileData.ok) {
      throw new Error('Error al obtener URL del archivo de Telegram')
    }

    // Construir URL de la imagen (permanente mientras el bot exista)
    const url = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`

    console.log('✅ Archivo subido a Telegram Storage:', {
      tipo,
      tallerId,
      fileId,
      url
    })

    return NextResponse.json({
      success: true,
      url,
      fileId,
      tipo,
      message: `${tipoLabel} subido correctamente a Telegram Storage`
    })
  } catch (error: any) {
    console.error('❌ Error Telegram Storage:', error.message)
    return NextResponse.json(
      { success: false, error: error.message || 'Error al subir archivo' },
      { status: 500 }
    )
  }
}
