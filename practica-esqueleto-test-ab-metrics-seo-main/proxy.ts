import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { 
  COOKIE, 
  THIRTY_DAYS, 
  SESSION_WINDOW,
  assignVariant, 
  cookieOptions, 
  isVariant 
} from './lib/experiment'

export const config = {
  matcher: ['/practica'],
}

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone()
  const previewParam = url.searchParams.get('preview')?.toLowerCase()
  const isSecure = url.protocol === 'https:'

  // 1. Manejo de Modo Vista Previa (?preview=a o ?preview=b)
  if (previewParam && isVariant(previewParam)) {
    const response = NextResponse.next()
    response.headers.set('x-experiment-preview', previewParam)
    return response
  }

  // 2. Leer cookies existentes del visitante
  let visitorId = request.cookies.get(COOKIE.visitor)?.value
  let variant = request.cookies.get(COOKIE.variant)?.value
  let isNewVisitor = false

  if (!visitorId || !isVariant(variant)) {
    // Si no existe, generamos un identificador único para el visitante
    visitorId = `visitor_${crypto.randomUUID()}`
    // Asignamos la variante de forma estable con el hash del Paso 2
    variant = assignVariant(visitorId)
    isNewVisitor = true
  }

  const response = NextResponse.next()

  // Pasamos los datos a la página mediante encabezados internos
  response.headers.set('x-experiment-visitor', visitorId)
  response.headers.set('x-experiment-variant', variant)

  // 3. Persistir visitante y variante por 30 días si es nuevo
  if (isNewVisitor) {
    response.cookies.set(COOKIE.visitor, visitorId, cookieOptions(isSecure, THIRTY_DAYS))
    response.cookies.set(COOKIE.variant, variant, cookieOptions(isSecure, THIRTY_DAYS))
  }

  // 4. Manejo de Impresiones (Una por sesión de 30 minutos)
  const hasSessionImpression = request.cookies.get(COOKIE.impressed)?.value

  if (!hasSessionImpression) {
    // Marcamos mediante un encabezado que la base de datos debe anotar una impresión
    response.headers.set('x-experiment-should-impress', 'true')
    
    // Dejamos la cookie de sesión activa por 30 minutos para evitar doble conteo al recargar
    response.cookies.set(COOKIE.impressed, 'true', cookieOptions(isSecure, SESSION_WINDOW))
  }

  return response
}
