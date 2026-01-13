'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from './input'
import { cn } from '@/lib/utils'

interface DecimalInputProps {
  value: number | undefined | null
  onChange: (value: number) => void
  onBlur?: () => void
  min?: number
  max?: number
  step?: number
  placeholder?: string
  className?: string
  disabled?: boolean
  prefix?: string
  suffix?: string
  allowEmpty?: boolean
  id?: string
  name?: string
}

/**
 * Input para valores decimales que preserva la entrada del usuario mientras escribe.
 * Soluciona el problema de "0.5" -> "0." -> "0" cuando se usa parseFloat directamente.
 */
export function DecimalInput({
  value,
  onChange,
  onBlur,
  min = 0,
  max,
  step = 0.01,
  placeholder = '0.00',
  className,
  disabled = false,
  prefix,
  suffix,
  allowEmpty = false,
  id,
  name,
}: DecimalInputProps) {
  // Mantener el valor como string mientras el usuario escribe
  const [displayValue, setDisplayValue] = useState<string>('')
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sincronizar el valor externo con el display cuando no está enfocado
  useEffect(() => {
    if (!isFocused) {
      if (value === undefined || value === null || (value === 0 && allowEmpty)) {
        setDisplayValue('')
      } else {
        setDisplayValue(formatNumber(value))
      }
    }
  }, [value, isFocused, allowEmpty])

  // Formatear número para mostrar (sin trailing zeros innecesarios)
  const formatNumber = (num: number): string => {
    // Determinar decimales basado en step
    const decimals = getDecimalPlaces(step)
    const formatted = num.toFixed(decimals)
    // Remover trailing zeros después del punto decimal, pero mantener al menos 2 decimales para precios
    return formatted
  }

  // Obtener número de decimales del step
  const getDecimalPlaces = (stepValue: number): number => {
    const stepStr = stepValue.toString()
    if (stepStr.includes('.')) {
      return stepStr.split('.')[1].length
    }
    return 2 // Default para precios
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value

    // Permitir string vacío
    if (inputValue === '') {
      setDisplayValue('')
      if (allowEmpty) {
        onChange(0)
      }
      return
    }

    // Permitir valores parciales válidos mientras se escribe (ej: "0.", "12.", "-")
    // Solo números, punto decimal, y opcionalmente signo negativo
    const isValidPartial = /^-?\d*\.?\d*$/.test(inputValue)

    if (!isValidPartial) {
      return // Ignorar caracteres inválidos
    }

    setDisplayValue(inputValue)

    // Intentar parsear el valor
    const numValue = parseFloat(inputValue)

    // Solo actualizar si es un número válido
    if (!isNaN(numValue)) {
      // Aplicar límites
      let finalValue = numValue
      if (min !== undefined && numValue < min) {
        finalValue = min
      }
      if (max !== undefined && numValue > max) {
        finalValue = max
      }
      onChange(finalValue)
    }
  }

  const handleFocus = () => {
    setIsFocused(true)
    // Seleccionar todo el texto al enfocar
    setTimeout(() => {
      inputRef.current?.select()
    }, 0)
  }

  const handleBlur = () => {
    setIsFocused(false)

    // Al perder el foco, formatear el valor
    if (displayValue === '' || displayValue === '-' || displayValue === '.') {
      if (allowEmpty) {
        setDisplayValue('')
      } else {
        setDisplayValue(formatNumber(min ?? 0))
        onChange(min ?? 0)
      }
    } else {
      const numValue = parseFloat(displayValue)
      if (!isNaN(numValue)) {
        let finalValue = numValue
        if (min !== undefined && numValue < min) finalValue = min
        if (max !== undefined && numValue > max) finalValue = max
        setDisplayValue(formatNumber(finalValue))
        onChange(finalValue)
      }
    }

    onBlur?.()
  }

  // Manejar teclas especiales
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Permitir: Backspace, Delete, Tab, Escape, Enter, flechas
    if (
      e.key === 'Backspace' ||
      e.key === 'Delete' ||
      e.key === 'Tab' ||
      e.key === 'Escape' ||
      e.key === 'Enter' ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight' ||
      e.key === 'ArrowUp' ||
      e.key === 'ArrowDown'
    ) {
      return
    }

    // Incrementar/decrementar con flechas
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      const currentValue = parseFloat(displayValue) || 0
      const newValue = e.key === 'ArrowUp'
        ? currentValue + step
        : currentValue - step

      let finalValue = newValue
      if (min !== undefined && newValue < min) finalValue = min
      if (max !== undefined && newValue > max) finalValue = max

      setDisplayValue(formatNumber(finalValue))
      onChange(finalValue)
    }
  }

  return (
    <div className="relative flex items-center">
      {prefix && (
        <span className="absolute left-3 text-gray-500 pointer-events-none">
          {prefix}
        </span>
      )}
      <Input
        ref={inputRef}
        id={id}
        name={name}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          prefix && 'pl-8',
          suffix && 'pr-8',
          'tabular-nums',
          className
        )}
      />
      {suffix && (
        <span className="absolute right-3 text-gray-500 pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  )
}
