import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Proxy de autenticación para Next.js 16
 *
 * IMPORTANTE: En Next.js 16+ este archivo DEBE llamarse proxy.ts
 * y la función DEBE llamarse proxy (cambió de middleware en v16.1+)
 */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Si no hay variables de entorno, permitir acceso (desarrollo local)
  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Obtener sesión
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Rutas públicas que no requieren autenticación
  const publicRoutes = [
    '/login',
    '/auth/login',
    '/auth/registro',
    '/auth/callback',
    '/auth/recuperar',
    '/auth/nueva-password',
    '/api/auth/callback',
    '/api/presupuesto', // API de presupuestos públicos
    '/presupuesto',     // Página pública de presupuestos (compartir con cliente)
  ]

  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  const isStaticAsset = pathname.startsWith('/_next') ||
                        pathname.startsWith('/favicon') ||
                        pathname.startsWith('/sw.js') ||
                        pathname.includes('.')

  // Si es un asset estático, permitir
  if (isStaticAsset) {
    return supabaseResponse
  }

  // Si es ruta pública, permitir
  if (isPublicRoute) {
    return supabaseResponse
  }

  // Si no hay usuario y no es ruta pública, redirigir a login
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    // Guardar la URL original para redirigir después del login
    if (pathname !== '/' && pathname !== '/dashboard') {
      url.searchParams.set('redirectTo', pathname)
    }
    return NextResponse.redirect(url)
  }

  // Si hay usuario y está en la raíz, redirigir a dashboard
  if (pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - _next/webpack-hmr (hot reload)
     * - favicon.ico, robots.txt, sitemap.xml
     * - public folder assets (.svg, .png, .jpg, etc)
     */
    '/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|css|woff|woff2|ttf|eot)$).*)',
  ],
}
