/**
 * @fileoverview Trimestres fiscales (Hacienda) y sus plazos de presentación
 * @description Trimestres naturales: 1T ene–mar, 2T abr–jun, 3T jul–sep,
 * 4T oct–dic. Autoliquidaciones trimestrales (303 de IVA, 130 de IRPF):
 * 1T del 1 al 20 de abril, 2T del 1 al 20 de julio, 3T del 1 al 20 de
 * octubre y 4T del 1 al 30 de enero del año siguiente. Si el último día cae
 * en sábado o domingo, el plazo pasa al lunes. Los festivos no se tienen en
 * cuenta: la fecha es orientativa (calendario del contribuyente de la AEAT).
 */

export type NumeroTrimestre = 1 | 2 | 3 | 4

export interface Trimestre {
  año: number
  t: NumeroTrimestre
}

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

const dosCifras = (n: number) => String(n).padStart(2, '0')
const dia = (año: number, mes: number, d: number) => `${año}-${dosCifras(mes)}-${dosCifras(d)}`

/** Trimestre de una fecha (Date en hora local o 'AAAA-MM-DD'). */
export function trimestreDe(fecha: Date | string): Trimestre {
  if (typeof fecha === 'string') {
    const [a, m] = fecha.split('-').map(Number)
    return { año: a, t: (Math.floor((m - 1) / 3) + 1) as NumeroTrimestre }
  }
  return { año: fecha.getFullYear(), t: (Math.floor(fecha.getMonth() / 3) + 1) as NumeroTrimestre }
}

/** Primer y último día del trimestre, 'AAAA-MM-DD' (inclusivo). */
export function rangoTrimestre({ año, t }: Trimestre): { desde: string; hasta: string } {
  const mesInicio = (t - 1) * 3 + 1
  const mesFin = mesInicio + 2
  const ultimoDia = new Date(año, mesFin, 0).getDate()
  return { desde: dia(año, mesInicio, 1), hasta: dia(año, mesFin, ultimoDia) }
}

/** Plazo de presentación del 303/130 de ese trimestre ('AAAA-MM-DD'). */
export function plazoPresentacion({ año, t }: Trimestre): { desde: string; hasta: string } {
  const [añoP, mes, ultimo] = t === 4 ? [año + 1, 1, 30] : [año, t * 3 + 1, 20]
  const fin = new Date(añoP, mes - 1, ultimo)
  // Sábado → lunes (+2), domingo → lunes (+1)
  if (fin.getDay() === 6) fin.setDate(fin.getDate() + 2)
  else if (fin.getDay() === 0) fin.setDate(fin.getDate() + 1)
  return { desde: dia(añoP, mes, 1), hasta: dia(fin.getFullYear(), fin.getMonth() + 1, fin.getDate()) }
}

export const claveTrimestre = ({ año, t }: Trimestre) => `${año}-T${t}`

export function trimestreDeClave(clave: string): Trimestre | null {
  const m = /^(\d{4})-T([1-4])$/.exec(clave)
  return m ? { año: Number(m[1]), t: Number(m[2]) as NumeroTrimestre } : null
}

/** «3T 2026 (jul–sep)» */
export function etiquetaTrimestre({ año, t }: Trimestre, conMeses = true): string {
  const meses = `${MESES_CORTOS[(t - 1) * 3]}–${MESES_CORTOS[(t - 1) * 3 + 2]}`
  return conMeses ? `${t}T ${año} (${meses})` : `${t}T ${año}`
}

export function trimestreAnterior({ año, t }: Trimestre): Trimestre {
  return t === 1 ? { año: año - 1, t: 4 } : { año, t: (t - 1) as NumeroTrimestre }
}

/** El trimestre actual y los anteriores, del más reciente al más antiguo. */
export function trimestresRecientes(hoy: Date = new Date(), cuantos = 5): Trimestre[] {
  const lista: Trimestre[] = [trimestreDe(hoy)]
  while (lista.length < cuantos) lista.push(trimestreAnterior(lista[lista.length - 1]))
  return lista
}

/**
 * El trimestre que toca presentar ahora: el anterior mientras su plazo está
 * abierto (p. ej. del 1 al 20 de octubre, el 3T); si no, el actual, que se
 * presentará en su plazo.
 */
export function trimestreAPresentar(hoyISO: string): { trimestre: Trimestre; plazo: { desde: string; hasta: string }; abierto: boolean } {
  const anterior = trimestreAnterior(trimestreDe(hoyISO))
  const plazoAnterior = plazoPresentacion(anterior)
  if (hoyISO >= plazoAnterior.desde && hoyISO <= plazoAnterior.hasta) {
    return { trimestre: anterior, plazo: plazoAnterior, abierto: true }
  }
  const actual = trimestreDe(hoyISO)
  return { trimestre: actual, plazo: plazoPresentacion(actual), abierto: false }
}

/** Días naturales entre dos fechas 'AAAA-MM-DD' (b − a). */
export function diasEntre(a: string, b: string): number {
  const [ya, ma, da] = a.split('-').map(Number)
  const [yb, mb, db] = b.split('-').map(Number)
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86_400_000)
}
