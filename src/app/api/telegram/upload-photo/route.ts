import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
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
    const ordenId = formData.get('ordenId') as string
    const tipo = formData.get('tipo') as string

    // Validar datos requeridos
    if (!file || !ordenId) {
      return NextResponse.json(
        { error: 'Archivo y ordenId requeridos' },
        { status: 400 }
      )
    }

    // Convertir archivo a buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Crear FormData para Telegram
    const telegramForm = new FormData()
    telegramForm.append('photo', new Blob([buffer], { type: file.type }), file.name)
    telegramForm.append(
      'caption',
      `📸 Orden: ${ordenId}\n🏷️ Tipo: ${tipo}\n⏰ ${new Date().toLocaleString('es-ES')}`
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

    // Obtener file_id de la foto
    const fileId = telegramData.result.photo[0].file_id

    // Obtener ruta del archivo en Telegram
    const fileRes = await fetch(
      `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`
    )
    const fileData = await fileRes.json()

    // Construir URL de la imagen (permanente)
    const imageUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`

    console.log('✅ Foto subida a Telegram:', {
      fileId,
      imageUrl,
      ordenId,
      tipo
    })

    return NextResponse.json({
      success: true,
      imageUrl,
      fileId,
      tipo,
      message: 'Foto subida correctamente a Telegram'
    })
  } catch (error: any) {
    console.error('❌ Error Telegram:', error.message)
    return NextResponse.json(
      { success: false, error: error.message || 'Error al subir foto' },
      { status: 500 }
    )
  }
}
