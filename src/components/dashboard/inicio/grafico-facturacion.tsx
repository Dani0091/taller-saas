/**
 * @fileoverview Facturación de los últimos seis meses (columnas)
 * @description Una serie: el mes en curso en el azul de la marca y los
 * anteriores en un azul atenuado. Barras de 24 px como máximo con 4 px de
 * redondeo arriba, rejilla fina y continua, tooltip por barra y una tabla
 * para lectores de pantalla.
 */
'use client'

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface Mes {
  mes: string
  etiqueta: string
  base: number
  iva: number
  total: number
}

const ACTUAL = 'var(--primary)'
const ANTERIOR = '#9cc3dd' // primary aclarado: secundario, no compite con el mes en curso

const compacto = (v: number) =>
  v >= 1000 ? `${(v / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} mil` : v.toLocaleString('es-ES')

function Ayuda({ active, payload }: { active?: boolean; payload?: Array<{ payload: Mes }> }) {
  if (!active || !payload?.length) return null
  const m = payload[0].payload
  const [a, mm] = m.mes.split('-').map(Number)
  const nombre = new Date(a, mm - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-lg">
      <p className="font-medium text-foreground first-letter:uppercase">{nombre}</p>
      <dl className="mt-1 grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 tabular-nums">
        <dt className="text-muted-foreground">Base</dt><dd className="text-right">{formatCurrency(m.base)}</dd>
        <dt className="text-muted-foreground">IVA</dt><dd className="text-right">{formatCurrency(m.iva)}</dd>
        <dt className="text-foreground font-medium">Total</dt><dd className="text-right font-medium">{formatCurrency(m.total)}</dd>
      </dl>
    </div>
  )
}

export function GraficoFacturacion({ meses }: { meses: Mes[] }) {
  return (
    <figure className="m-0">
      <div className="h-48 md:h-56" role="img" aria-label={`Facturación de los últimos seis meses: ${meses.map((m) => `${m.etiqueta} ${formatCurrency(m.total)}`).join(', ')}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={meses} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke="var(--border)" strokeWidth={1} />
            <XAxis dataKey="etiqueta" tickLine={false} axisLine={{ stroke: 'var(--border)' }} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
            <YAxis tickLine={false} axisLine={false} width={60} tickFormatter={compacto} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} allowDecimals={false} />
            <Tooltip content={<Ayuda />} cursor={{ fill: 'var(--muted)' }} />
            <Bar dataKey="total" maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {meses.map((m, i) => (
                <Cell key={m.mes} fill={i === meses.length - 1 ? ACTUAL : ANTERIOR} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Facturación por mes (facturas emitidas)</caption>
        <thead><tr><th>Mes</th><th>Base</th><th>IVA</th><th>Total</th></tr></thead>
        <tbody>
          {meses.map((m) => (
            <tr key={m.mes}><td>{m.mes}</td><td>{formatCurrency(m.base)}</td><td>{formatCurrency(m.iva)}</td><td>{formatCurrency(m.total)}</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
