import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const imageUrl = request.nextUrl.searchParams.get('url')

    if (!imageUrl) {
      return NextResponse.json({ error: 'url required' }, { status: 400 })
    }

    console.log('📥 [PROXY] Descargando:', imageUrl.substring(0, 60))

    // Descargar imagen
    const response = await fetch(imageUrl)
    const buffer = await response.arrayBuffer()

    console.log('✅ [PROXY] Descargado:', buffer.byteLength, 'bytes')

    // Devolver como blob
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': response.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=3600'
      }
    })
  } catch (error: any) {
    console.error('❌ [PROXY] Error:', error.message)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
