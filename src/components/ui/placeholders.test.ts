import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

// Textos de ejemplo (placeholder) de toda la app: que no confundan.
// Antes: «0.00» en Año y Kilómetros, matrículas imposibles (1234ABC lleva
// vocal), NIF con letra de control errónea, «Valencia» + «Madrid»…

const archivos = execSync("git ls-files 'src/*.tsx'", { encoding: 'utf-8' }).split('\n').filter(Boolean)
const placeholders = archivos.flatMap((f) =>
  [...readFileSync(f, 'utf-8').matchAll(/placeholder=(?:"([^"]*)"|\{'([^']*)'\}|\{"([^"]*)"\})/g)].map((m) => ({
    f,
    texto: m[1] ?? m[2] ?? m[3] ?? '',
  }))
)

const LETRAS_DNI = 'TRWAGMYFPDXBNJZSQVHLCKE'

describe('placeholders', () => {
  it('se encuentran (el test no pasa en vacío)', () => {
    expect(placeholders.length).toBeGreaterThan(100)
  })

  it('ningún número de ejemplo con formato inglés «0.00» ni decimales en años o km', () => {
    expect(placeholders.filter((p) => /\d\.\d{2}\b/.test(p.texto))).toEqual([])
  })

  it('matrículas de ejemplo válidas (4 cifras + 3 consonantes, sin vocales)', () => {
    const malas = placeholders.filter((p) => /\b\d{4}\s?[A-Z]{3}\b/.test(p.texto) && !/\b\d{4}\s?[BCDFGHJKLMNPRSTVWXYZ]{3}\b/.test(p.texto))
    expect(malas).toEqual([])
  })

  it('DNI de ejemplo con la letra de control correcta', () => {
    const malos = placeholders.filter((p) => {
      const m = p.texto.match(/\b(\d{8})([A-Z])\b/)
      return m && LETRAS_DNI[Number(m[1]) % 23] !== m[2]
    })
    expect(malos).toEqual([])
  })

  it('«Ej.:» con punto, como en el resto de la app', () => {
    expect(placeholders.filter((p) => /\bEj:/.test(p.texto))).toEqual([])
  })

  it('los campos numéricos no tienen un ejemplo por defecto engañoso', () => {
    for (const f of ['src/components/ui/number-input.tsx', 'src/components/ui/decimal-input.tsx']) {
      expect(readFileSync(f, 'utf-8')).not.toMatch(/placeholder = '0\.00'/)
    }
  })
})
