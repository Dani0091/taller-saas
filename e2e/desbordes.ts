import type { Page } from '@playwright/test'

// Busca descuadres sin mirar capturas. Si hay una hoja o diálogo modal
// abierto, solo revisa lo que hay dentro (lo de detrás no se ve).
// Los carruseles con scroll horizontal (chips, trimestres) son legítimos;
// una tabla con scroll horizontal no: esconde columnas como «Acciones».
export async function buscarDesbordes(page: Page) {
  return page.evaluate(() => {
    const problemas: string[] = []
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect()
      const s = getComputedStyle(el)
      return r.width > 1 && r.height > 1 && s.visibility !== 'hidden' && s.clip !== 'rect(0px, 0px, 0px, 0px)'
    }
    const nombre = (el: Element) => {
      const t = el.getAttribute('aria-label') || (el as HTMLInputElement).placeholder || el.textContent || ''
      return `${el.tagName.toLowerCase()} «${t.trim().replace(/\s+/g, ' ').slice(0, 40)}»`
    }
    const conScrollLateral = (p: Element) => {
      const o = getComputedStyle(p).overflowX
      return (o === 'auto' || o === 'scroll') && p.scrollWidth > p.clientWidth + 1
    }
    // Carrusel = una sola fila de elementos (flex sin salto de línea)
    const esCarrusel = (p: Element) => {
      const s = getComputedStyle(p)
      return s.display.includes('flex') && s.flexDirection === 'row' && s.flexWrap === 'nowrap' && !p.querySelector('table')
    }
    const enCarrusel = (el: Element, hasta: Element | null) => {
      for (let p = el.parentElement; p && p !== hasta; p = p.parentElement) {
        if (conScrollLateral(p) && esCarrusel(p)) return true
      }
      return false
    }

    const modal = Array.from(document.querySelectorAll('[role="dialog"][aria-modal="true"], [role="dialog"][data-state="open"]')).filter(visible).pop()
    const raiz: ParentNode = modal ?? document

    const html = document.documentElement
    if (html.scrollWidth > html.clientWidth + 1) problemas.push(`la página tiene scroll horizontal (${html.scrollWidth - html.clientWidth}px)`)
    for (const caja of Array.from(document.querySelectorAll('main, [role="dialog"]'))) {
      if (conScrollLateral(caja)) problemas.push(`${caja.tagName.toLowerCase()} tiene scroll horizontal (${caja.scrollWidth - caja.clientWidth}px)`)
    }

    for (const tabla of Array.from(raiz.querySelectorAll('table')).filter(visible)) {
      const caja = tabla.parentElement!
      if (caja.scrollWidth > caja.clientWidth + 1) problemas.push(`tabla con scroll horizontal: faltan ${caja.scrollWidth - caja.clientWidth}px`)
    }

    const controles = Array.from(raiz.querySelectorAll('button, a, input:not([type=radio]):not([type=checkbox]), select, textarea')).filter(visible)
    for (const el of controles) {
      const r = el.getBoundingClientRect()
      const contenedor = el.closest('[data-slot="card"], [role="dialog"]')
      if (enCarrusel(el, contenedor)) continue
      if (r.right > innerWidth + 1 || r.left < -1) problemas.push(`fuera de la pantalla: ${nombre(el)}`)
      else if (contenedor) {
        const c = contenedor.getBoundingClientRect()
        const sale = Math.max(r.right - c.right, c.left - r.left)
        if (sale > 1) problemas.push(`se sale ${Math.round(sale)}px de su tarjeta: ${nombre(el)}`)
      }
    }

    // Filas de formulario: los campos de una misma fila, a la misma altura
    for (const rejilla of Array.from(raiz.querySelectorAll('.grid')).filter(visible)) {
      const filas = new Map<number, Element[]>()
      for (const celda of Array.from(rejilla.children).filter(visible)) {
        const top = Math.round(celda.getBoundingClientRect().top)
        filas.set(top, [...(filas.get(top) ?? []), celda])
      }
      for (const fila of filas.values()) {
        const campos = fila.map((c) => Array.from(c.querySelectorAll('input:not([type=radio]):not([type=checkbox]), select')).find(visible))
        if (fila.length < 2 || campos.some((c) => !c)) continue
        const tops = campos.map((c) => Math.round(c!.getBoundingClientRect().top))
        const altos = campos.map((c) => Math.round(c!.getBoundingClientRect().height))
        if (Math.max(...tops) - Math.min(...tops) > 2) problemas.push(`campos desalineados: ${campos.map((c, i) => `${nombre(c!)} y=${tops[i]}`).join(', ')}`)
        if (Math.max(...altos) - Math.min(...altos) > 2) problemas.push(`campos de distinta altura: ${campos.map((c, i) => `${nombre(c!)} h=${altos[i]}`).join(', ')}`)
      }
    }

    // Botones que se pisan, contando solo la parte que se ve: el contenido
    // que pasa por debajo de un pie fijo al hacer scroll no es un descuadre
    const recorte = (el: Element) => {
      const r = el.getBoundingClientRect()
      let { left, right, top, bottom } = r
      for (let p = el.parentElement; p; p = p.parentElement) {
        const s = getComputedStyle(p)
        if (s.overflowX === 'visible' && s.overflowY === 'visible') continue
        const c = p.getBoundingClientRect()
        left = Math.max(left, c.left); right = Math.min(right, c.right)
        top = Math.max(top, c.top); bottom = Math.min(bottom, c.bottom)
      }
      return { left, right, top, bottom }
    }
    const botones = Array.from(raiz.querySelectorAll('button, a')).filter(visible)
    for (let i = 0; i < botones.length; i++) {
      for (let j = i + 1; j < botones.length; j++) {
        if (botones[i].contains(botones[j]) || botones[j].contains(botones[i])) continue
        const a = recorte(botones[i])
        const b = recorte(botones[j])
        const x = Math.min(a.right, b.right) - Math.max(a.left, b.left)
        const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
        if (x > 4 && y > 4) problemas.push(`se pisan: ${nombre(botones[i])} y ${nombre(botones[j])}`)
      }
    }
    return Array.from(new Set(problemas))
  })
}
