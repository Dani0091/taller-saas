/**
 * @fileoverview Componente de input numérico robusto y consistente
 * @description Maneja conversiones string → number de forma segura y estandarizada
 * @usage Reemplaza a todos los DecimalInput que necesiten conversión
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from './input'
import { cn } from '@/lib/utils'

interface NumberInputProps {
  value: number | null | undefined
  onChange: (value: number | null | undefined) => void
  onBlur?: () => void
  onFocus?: () => void
  min?: number
  max?: number
  step?: number
  placeholder?: string
  className?: string
  disabled?: boolean
  allowEmpty?: boolean
  id?: string
  name?: string
  prefix?: string
  suffix?: string
  required?: boolean
}

/**
 * Input numérico seguro que maneja conversiones string ↔ number
 * Sigue el principio: Nunca confíes en los tipos del usuario
 */
export function NumberInput({
  value,
  onChange,
  onBlur,
  onFocus,
  min,
  max,
  step = 1,
  placeholder = '0',
  className,
  disabled = false,
  allowEmpty = true,
  id,
  name,
  prefix,
  suffix,
  required = false,
}: NumberInputProps) {
  // Estado interno para manejar el input del usuario
  const [displayValue, setDisplayValue] = useState<string>('')
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Efecto para sincronizar valor externo con display
  useEffect(() => {
    if (!isFocused) {
      if (value === null || value === undefined || (value === 0 && allowEmpty)) {
        setDisplayValue('')
      } else {
        setDisplayValue(formatNumber(value))
      }
    }
  }, [value, isFocused, allowEmpty])

  // Formatear número para mostrar
  const formatNumber = (num: number): string => {
    if (step && step < 1) {
      return num.toFixed(getDecimalPlaces(step))
    }
    return num.toString()
  }

  // Obtener número de decimales del step
  const getDecimalPlaces = (stepValue: number): number => {
    const stepStr = stepValue.toString()
    if (stepStr.includes('.')) {
      return stepStr.split('.')[1].length
    }
    return 0
  }

  // Convertir string a número de forma segura
  // ✅ Acepta tanto punto como coma como separador decimal
  const parseNumber = (str: string): number | null => {
    if (!str || str.trim() === '') {
      return allowEmpty ? null : 0
    }

    // Reemplazar coma por punto para normalizar el separador decimal
    let cleanStr = str.replace(',', '.')

    // Remover caracteres no numéricos excepto punto y guión (para negativos)
    cleanStr = cleanStr.replace(/[^\d.-]/g, '')

    // Validar que no tenga múltiples puntos decimales
    const parts = cleanStr.split('.')
    if (parts.length > 2) return null

    // Convertir a número
    const num = parseFloat(cleanStr)

    if (isNaN(num)) return null

    // Aplicar validaciones de rango
    if (min !== undefined && num < min) return null
    if (max !== undefined && num > max) return null

    return num
  }

  // Manejar cambio de valor
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setDisplayValue(newValue)
    
    const parsedValue = parseNumber(newValue)
    onChange(parsedValue)
  }

  // Manejar evento de InputScanner
  const handleScannerResult = (scannedValue: string) => {
    const parsedValue = parseNumber(scannedValue)
    setDisplayValue(scannedValue)
    onChange(parsedValue)
  }

  return (
    <div className={cn("relative", className)}>
      {prefix && (
        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
          {prefix}
        </span>
      )}

      <Input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onBlur={() => {
          setIsFocused(false)
          onBlur?.()
        }}
        onFocus={() => {
          setIsFocused(true)
          onFocus?.()
        }}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        className={cn(
          'w-full',
          prefix && 'pl-8',
          (suffix || (allowEmpty && !suffix)) && 'pr-8',
          isFocused && 'ring-2 ring-blue-500',
        )}
        disabled={disabled}
        id={id}
        name={name}
        required={required}
      />

      {suffix && (
        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
          {suffix}
        </span>
      )}

      {(!suffix && allowEmpty && !value && !isFocused) && (
        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs pointer-events-none">
          Opcional
        </span>
      )}
    </div>
  )
}

/**
 * Utilidad para crear un manejador de cambios numéricos seguro
 */
export const createNumberChangeHandler = (
  setValue: React.Dispatch<React.SetStateAction<any>>,
  fieldName: string,
  options?: {
    min?: number;
    max?: number;
    allowEmpty?: boolean;
    transform?: (value: number) => number;
  }
) => {
  return (value: number | null | undefined) => {
    let processedValue = value

    // Aplicar transformación si se especifica
    if (options?.transform && typeof value === 'number') {
      processedValue = options.transform(value)
    }
    
    // Validar rango
    if (options?.min !== undefined && typeof processedValue === 'number' && processedValue < options.min) {
      processedValue = options.min
    }
    if (options?.max !== undefined && typeof processedValue === 'number' && processedValue > options.max) {
      processedValue = options.max
    }
    
    // Manejar valores vacíos
    if (value === null || value === undefined) {
      if (options?.allowEmpty) {
        processedValue = null
      } else {
        processedValue = 0
      }
    }

    setValue((prev: any) => ({
      ...prev,
      [fieldName]: processedValue
    }))
  }
}

/**
 * Utilidad para InputScanner numérico
 */
export const handleScannerNumber = (
  scannedValue: string,
  setValue: React.Dispatch<React.SetStateAction<any>>,
  fieldName: string
): void => {
  // Remover todos los caracteres no numéricos
  const cleanValue = scannedValue.replace(/[^\d]/g, '')
  const numValue = parseInt(cleanValue) || 0

  setValue((prev: any) => ({
    ...prev,
    [fieldName]: numValue
  }))
}

// Exportar tipos para uso en componentes
export type { NumberInputProps }