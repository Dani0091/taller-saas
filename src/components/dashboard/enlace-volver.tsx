/**
 * @fileoverview «← Volver a …» de las pantallas de detalle y de alta
 */
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export function EnlaceVolver({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <ArrowLeft className="size-4" aria-hidden />
      {children}
    </Link>
  )
}
