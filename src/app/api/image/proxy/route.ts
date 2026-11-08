import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_DOMAINS = [
  'api.telegram.org',
  'supabase.co',
  'supabase.in',
]

// 5 MB máximo — evita descargas descontroladas
const MAX_BYTES = 5 * 1024 * 1024

function isAllowedUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString)
    // HTTPS obligatorio — impide fugas a HTTP interno
    if (url.protocol !== 'https:') return false
    // Comparación exacta o subdominio real: .endsWith(domain) aceptaría
    // evil-supabase.co; .endsWith('.' + domain) solo acepta subdominios reales
    return ALLOWED_DOMAINS.some(d => url.hostname === d || url.hostname.endsWith('.' + d))
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

    if (!isAllowedUrl(imageUrl)) {
      return NextResponse.json({ error: 'URL no permitida' }, { status: 403 })
    }

    const response = await fetch(imageUrl, {
      // Sin seguir redirecciones: si el origen redirige a otro dominio no
      // validado se corta aquí en lugar de saltarse la whitelist
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'No se pudo obtener la imagen' },
        { status: response.status }
      )
    }

    // Rechazar recursos que no sean imágenes
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'El recurso no es una imagen' }, { status: 415 })
    }

    // Rechazar si el servidor declara un tamaño mayor al límite
    const contentLength = Number(response.headers.get('content-length') || 0)
    if (contentLength > MAX_BYTES) {
      return NextResponse.json({ error: 'Imagen demasiado grande' }, { status: 413 })
    }

    const buffer = await response.arrayBuffer()

    // Segunda comprobación de tamaño sobre el cuerpo real
    if (buffer.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: 'Imagen demasiado grande' }, { status: 413 })
    }

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Error al procesar imagen' },
      { status: 500 }
    )
  }
}
