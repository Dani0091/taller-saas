import { describe, it, expect } from 'vitest'
import { telefonoParaWhatsApp, enlaceWhatsApp } from './whatsapp'

describe('telefonoParaWhatsApp', () => {
  it.each([
    ['600123456', '34600123456'],
    ['600 123 456', '34600123456'],
    ['+34 600 123 456', '34600123456'],
    ['0034600123456', '34600123456'],
    ['34600123456', '34600123456'],
    ['912 345 678', '34912345678'],
    ['+44 7911 123456', '447911123456'],
    ['+1 (415) 555-0100', '14155550100'],
  ])('%s → %s', (entrada, salida) => {
    expect(telefonoParaWhatsApp(entrada)).toBe(salida)
  })

  it.each([null, undefined, '', '123', 'sin número', '12345678'])('%s → null', (entrada) => {
    expect(telefonoParaWhatsApp(entrada)).toBeNull()
  })
})

describe('enlaceWhatsApp', () => {
  it('codifica el mensaje y usa el número con prefijo', () => {
    expect(enlaceWhatsApp('600123456', 'Hola & adiós\n¿ok?')).toBe(
      'https://wa.me/34600123456?text=Hola%20%26%20adi%C3%B3s%0A%C2%BFok%3F'
    )
  })
  it('sin teléfono válido abre WhatsApp para elegir contacto', () => {
    expect(enlaceWhatsApp('', 'Hola')).toBe('https://wa.me/?text=Hola')
  })
})
