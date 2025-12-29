'use client'

import { useState, useRef, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ChevronUp, ChevronDown, X, Check } from 'lucide-react'

interface HoraSpinnerProps {
  value: number
  onChange: (horas: number) => void
  label?: string
  step?: number
  min?: number
  max?: number
  disabled?: boolean
}

export function HoraSpinner({
  value,
  onChange,
  label = 'Horas',
  step = 0.5,
  min = 0,
  max = 99.5,
  disabled = false,
}: HoraSpinnerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tempValue, setTempValue] = useState(value)
  const scrollRef = useRef<HTMLDivElement>(null)

  const generateOptions = () => {
    const options = []
    for (let i = min; i <= max; i += step) {
      options.push(Number(i.toFixed(1)))
    }
    return options
  }

  const options = generateOptions()

  useEffect(() => {
    setTempValue(value)
  }, [value, isOpen])

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      const selectedIndex = options.indexOf(tempValue)
      if (selectedIndex !== -1) {
        const scrollTop = selectedIndex * 40 - 40
        scrollRef.current.scrollTop = scrollTop
      }
    }
  }, [isOpen, tempValue, options])

  const handleIncrement = () => {
    const newValue = Math.min(max, tempValue + step)
    setTempValue(Number(newValue.toFixed(1)))
  }

  const handleDecrement = () => {
    const newValue = Math.max(min, tempValue - step)
    setTempValue(Number(newValue.toFixed(1)))
  }

  const handleConfirm = () => {
    onChange(tempValue)
    setIsOpen(false)
  }

  const handleCancel = () => {
    setTempValue(value)
    setIsOpen(false)
  }

  if (!isOpen) {
    return (
      <div className="w-full">
        <Label className="text-xs sm:text-sm font-semibold mb-2 block">{label}</Label>
        <button
          onClick={() => !disabled && setIsOpen(true)}
          disabled={disabled}
          className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg bg-white text-center text-base sm:text-lg font-bold text-gray-900 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {value.toFixed(1)}h
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center sm:justify-center">
      <div className="bg-white w-full sm:w-96 rounded-t-lg sm:rounded-lg p-4 sm:p-6 max-h-96">
        <h3 className="font-bold text-lg sm:text-xl mb-4">{label}</h3>

        <div className="flex items-center justify-center gap-4 mb-6">
          <Button
            onClick={handleDecrement}
            size="sm"
            variant="outline"
            className="h-10 w-10 p-0"
          >
            <ChevronDown className="w-5 h-5" />
          </Button>

          <div className="relative w-full h-40 border border-gray-300 rounded-lg overflow-hidden bg-gray-50">
            <div
              ref={scrollRef}
              className="overflow-y-scroll h-full scrollbar-hide"
              style={{
                scrollBehavior: 'smooth',
              }}
            >
              {options.map((opt) => (
                <div
                  key={opt}
                  className={`h-10 flex items-center justify-center text-lg font-semibold cursor-pointer ${
                    opt === tempValue
                      ? 'bg-blue-100 text-blue-600 border-y-2 border-blue-600'
                      : 'text-gray-600'
                  }`}
                  onClick={() => setTempValue(opt)}
                >
                  {opt.toFixed(1)}h
                </div>
              ))}
            </div>
          </div>

          <Button
            onClick={handleIncrement}
            size="sm"
            variant="outline"
            className="h-10 w-10 p-0"
          >
            <ChevronUp className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleCancel}
            variant="outline"
            className="flex-1"
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            <Check className="w-4 h-4 mr-2" />
            Confirmar
          </Button>
        </div>
      </div>
    </div>
  )
}
