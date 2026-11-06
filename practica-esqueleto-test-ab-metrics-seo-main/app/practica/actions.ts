'use server'

import { cookies } from 'next/headers'
import { COOKIE, THIRTY_DAYS, isVariant, cookieOptions } from '@/lib/experiment'

export async function recordConversion(): Promise<{ status: 'success' | 'already_converted' | 'invalid' }> {
  const cookieStore = await cookies()
  
  // 1. Validamos que el visitante tenga una sesión y una variante real asignada
  const visitorId = cookieStore.get(COOKIE.visitor)?.value
  const variant = cookieStore.get(COOKIE.variant)?.value

  if (!visitorId || !isVariant(variant)) {
    return { status: 'invalid' }
  }

  // 2. Control de duplicados: verificamos si este visitante ya convirtió antes
  const hasConverted = cookieStore.get(COOKIE.converted)?.value

  if (hasConverted) {
    // Si ya hizo clic antes, retornamos un estado controlado sin sumar nada de nuevo
    return { status: 'already_converted' }
  }

  // 3. (Paso 8 - Preparación): Aquí se guardaría el evento de conversión de forma persistente en tu DB.
  // Ej: await db.insertConversion(visitorId, variant)
  console.log(`[LOG EXPERIMENTO] ¡Conversión anotada! Visitante ${visitorId} en variante ${variant}`)

  // 4. Marcamos la cookie para que un segundo clic no infle los números
  const isSecure = true // En entornos Next.js modernos o v0 se maneja seguro
  cookieStore.set(COOKIE.converted, 'true', cookieOptions(isSecure, THIRTY_DAYS))

  return { status: 'success' }
}
