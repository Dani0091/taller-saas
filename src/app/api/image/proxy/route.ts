import { NextRequest, NextResponse } from 'next/server'

// Dominios permitidos para el proxy de imágenes (whitelist de seguridad)
const ALLOWED_DOMAINS = [
  'api.telegram.org',
  'supabase.co',
  'supabase.in',
]

function isAllowedUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString)
    return ALLOWED_DOMAINS.some(domain => url.hostname.endsWith(domain))
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  try {
    const imageUrl = request.nextUrl.searchParams.get('url')

    if (!imageUrl) {
      return NextResponse.json({ error: 'url required' }, { status: 400 })
    }

    // Validar que la URL pertenece a un dominio permitido (previene SSRF)
    if (!isAllowedUrl(imageUrl)) {
      return NextResponse.json(
        { error: 'URL no permitida' },
        { status: 403 }
      )
    }

    // Descargar imagen
    const response = await fetch(imageUrl)

    if (!response.ok) {
      return NextResponse.json(
        { error: 'No se pudo obtener la imagen' },
        { status: response.status }
      )
    }

    const buffer = await response.arrayBuffer()

    // Devolver como blob
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': response.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=3600'
      }
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Error al procesar imagen' },
      { status: 500 }
    )
  }
}
