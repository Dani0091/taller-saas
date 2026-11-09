import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NumberInput } from './number-input'

describe('NumberInput', () => {
  it('pasa el aria-label al campo (antes se perdía y el campo no tenía nombre)', () => {
    render(<NumberInput value={2} onChange={() => {}} aria-label="Cantidad" />)
    expect(screen.getByRole('textbox', { name: 'Cantidad' })).toBeTruthy()
  })
})

describe('NumberInput: formato', () => {
  it('muestra coma decimal y sigue leyendo coma o punto', async () => {
    const { fireEvent } = await import('@testing-library/react')
    const valores: Array<number | null | undefined> = []
    render(<NumberInput value={45} step={0.01} onChange={(v) => valores.push(v)} aria-label="Precio" />)
    const campo = screen.getByRole('textbox', { name: 'Precio' }) as HTMLInputElement
    expect(campo.value).toBe('45,00')
    fireEvent.change(campo, { target: { value: '12,5' } })
    fireEvent.change(campo, { target: { value: '12.5' } })
    expect(valores).toEqual([12.5, 12.5])
  })
})
