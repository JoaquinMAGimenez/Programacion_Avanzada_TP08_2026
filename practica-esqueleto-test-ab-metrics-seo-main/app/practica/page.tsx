import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { Landing } from '@/components/landing'
import {
  CANONICAL_PATH,
  DESCRIPTION_RANGE,
  TITLE_RANGE,
  VARIANTS,
  characterCount,
  inRange,
  isVariant,
  type Variant,
} from '@/lib/experiment'

type PracticaPageProps = {
  searchParams: Promise<{ preview?: string | string[] }>
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

// 1. Resuelto PASO 5: Publicación de metadatos dinámicos en el HTML inicial del servidor
export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers()
  
  // Detectamos si el proxy nos mandó una variante por vista previa o asignación real
  const previewVariant = headersList.get('x-experiment-preview')
  const assignedVariant = headersList.get('x-experiment-variant')
  
  const variant: Variant = (previewVariant as Variant) || (assignedVariant as Variant) || 'a'
  const copy = VARIANTS[variant]

  const isPreview = !!previewVariant

  return {
    title: { absolute: copy.seoTitle },
    description: copy.seoDescription,
    alternates: { 
      // El canonical apunta SIEMPRE a la ruta limpia, sin query strings
      canonical: CANONICAL_PATH 
    },
    robots: { 
      // Si es ?preview lleva noindex de forma obligatoria, si es la landing normal indexa
      index: !isPreview, 
      follow: !isPreview 
    },
  }
}

export default async function PracticaPage({ searchParams }: PracticaPageProps) {
  const params = await searchParams
  const requested = firstParam(params.preview)
  
  const headersList = await headers()
  const previewVariant = headersList.get('x-experiment-preview')
  const assignedVariant = headersList.get('x-experiment-variant')
  const visitorId = headersList.get('x-experiment-visitor')
  const shouldImpress = headersList.get('x-experiment-should-impress') === 'true'

  // Prioridad: Si hay un parámetro de preview explícito, lo mostramos. Si no, usamos la variante asignada.
  const preview = isVariant(previewVariant) ? previewVariant : null
  const variant: Variant = preview ?? (isVariant(assignedVariant) ? assignedVariant : 'a')
  
  const copy = VARIANTS[variant]
  const titleLength = characterCount(copy.seoTitle)
  const descriptionLength = characterCount(copy.seoDescription)

  // 2. Resuelto PASO 6 (Simulación): Anotar la impresión si el flag del proxy está activo
  if (shouldImpress && visitorId) {
    // TODO (Paso 8): Aquí llamarás a la función que guarda el log persistente en tu DB.
    // Ej: await registrarImpresionEnBaseDeDatos(visitorId, variant)
    console.log(`[LOG EXPERIMENTO] Anotando impresión para el visitante ${visitorId} en la variante ${variant}`)
  }

  return (
    <main id="contenido" className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-10 md:py-14">
      <p className="font-mono text-[0.7rem] tracking-[0.16em] text-muted-foreground uppercase">
        Laboratorio 01 · Experimento Activo
      </p>
      <p className="border-b border-border pb-4 text-sm text-muted-foreground">
        {preview
          ? `Estás viendo el copy ${preview.toUpperCase()} por query de previsualización. No escribe cookies y lleva NOINDEX.`
          : `Visitante asignado de forma estable. ID: ${visitorId || 'Incierto'} · Variante: ${variant.toUpperCase()}`}
      </p>
      
      {/* Renderizamos el componente visual pasándole la variante calculada */}
      <Landing variant={variant} />
      
      <div className="flex flex-wrap gap-2">
        <Link href="/practica?preview=a" className="rounded-md border border-border px-3 py-1.5 text-sm">
          Ver copy A (Preview)
        </Link>
        <Link href="/practica?preview=b" className="rounded-md border border-border px-3 py-1.5 text-sm">
          Ver copy B (Preview)
        </Link>
        <Link href="/practica" className="rounded-md border border-border px-3 py-1.5 text-sm font-semibold bg-secondary">
          Ir a mi Variante Asignada
        </Link>
        <Link href="/bitacora" className="rounded-md border border-border px-3 py-1.5 text-sm">
          Bitácora
        </Link>
      </div>
      
      <section className="flex flex-col gap-4">
        <h2 className="font-serif text-2xl">Metadatos publicados en el Servidor</h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1 border-b border-border pb-3">
            <dt className="font-mono text-[0.7rem] tracking-[0.14em] text-muted-foreground uppercase">
              Title de {variant.toUpperCase()}
            </dt>
            <dd className="font-medium">{copy.seoTitle}</dd>
            <dd className="font-mono text-sm text-muted-foreground">
              {titleLength} caracteres · {inRange(titleLength, TITLE_RANGE) ? 'dentro de 50–60' : 'fuera de rango'}
            </dd>
          </div>
          <div className="flex flex-col gap-1 border-b border-border pb-3">
            <dt className="font-mono text-[0.7rem] tracking-[0.14em] text-muted-foreground uppercase">
              Description de {variant.toUpperCase()}
            </dt>
            <dd className="font-medium">{copy.seoDescription}</dd>
            <dd className="font-mono text-sm text-muted-foreground">
              {descriptionLength} caracteres ·{' '}
              {inRange(descriptionLength, DESCRIPTION_RANGE) ? 'dentro de 140–160' : 'fuera de rango'}
            </dd>
          </div>
        </dl>
      </section>
    </main>
  )
}
