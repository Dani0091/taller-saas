/**
 * @fileoverview Hooks para Cálculos de Orden - Preparación para MAÑANA
 * @description Extracción de lógica de cálculos del monstro de 1600 líneas
 */

import { LineaOrden } from '@/types/workshop'

// ==================== HOOKS DE CÁLCULOS ====================

/**
 * Hook para cálculos de IVA, subtotales y totales
 * Uso: const calculos = useOrderCalculations(lineas)
 */
export function useOrderCalculations(lineas: LineaOrden[]) {
  const subtotales = lineas.reduce((acc, linea) => {
    const subtotal = (linea.cantidad || 0) * (linea.precio_unitario || 0)
    
    switch (linea.tipo) {
      case 'mano_obra':
        acc.mano_obra += subtotal
        break
      case 'pieza':
        acc.piezas += subtotal
        break
      case 'servicio':
        acc.servicios += subtotal
        break
      default:
        acc.otros += subtotal
    }
    
    return acc
  }, {
    mano_obra: 0,
    piezas: 0,
    servicios: 0,
    otros: 0
  })

  const subtotal_general = subtotales.mano_obra + subtotales.piezas + subtotales.servicios + subtotales.otros
  
  const iva = {
    porcentaje: 21, // Por defecto 21%, podría venir de configuración
    cantidad: subtotal_general * 0.21
  }
  
  const total = {
    sin_iva: subtotal_general,
    con_iva: subtotal_general + iva.cantidad,
    desglose: {
      ...subtotales,
      subtotal_general,
      iva: iva.cantidad,
      total: subtotal_general + iva.cantidad
    }
  }

  return {
    subtotales,
    subtotal_general,
    iva,
    total,
    lineaCount: lineas.length
  }
}

/**
 * Hook para validación de líneas de orden
 */
export function useOrderValidation(lineas: LineaOrden[]) {
  const errors: string[] = []
  
  lineas.forEach((linea, index) => {
    if (!linea.descripcion?.trim()) {
      errors.push(`Línea ${index + 1}: La descripción es obligatoria`)
    }
    
    if (!linea.cantidad || linea.cantidad <= 0) {
      errors.push(`Línea ${index + 1}: La cantidad debe ser mayor a 0`)
    }
    
    if (linea.precio_unitario === undefined || linea.precio_unitario < 0) {
      errors.push(`Línea ${index + 1}: El precio no puede ser negativo`)
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
    warnings: lineas.length === 0 ? ['No hay líneas agregadas'] : []
  }
}

/**
 * Hook para gestión de líneas de orden
 */
export function useLineManagement(initialLines: LineaOrden[] = []) {
  const [lineas, setLineas] = useState<LineaOrden[]>(initialLines)
  
  const agregarLinea = (nuevaLinea: Omit<LineaOrden, 'id'>) => {
    const lineaConId = {
      ...nuevaLinea,
      id: `linea_${Date.now()}_${Math.random()}`
    }
    setLineas(prev => [...prev, lineaConId])
  }
  
  const actualizarLinea = (id: string, updates: Partial<LineaOrden>) => {
    setLineas(prev => 
      prev.map(linea => 
        linea.id === id ? { ...linea, ...updates } : linea
      )
    )
  }
  
  const eliminarLinea = (id: string) => {
    setLineas(prev => prev.filter(linea => linea.id !== id))
  }
  
  const duplicarLinea = (id: string) => {
    const linea = lineas.find(l => l.id === id)
    if (linea) {
      agregarLinea({
        ...linea,
        descripcion: `${linea.descripcion} (Copia)`
      })
    }
  }
  
  return {
    lineas,
    agregarLinea,
    actualizarLinea,
    eliminarLinea,
    duplicarLinea,
    limpiarLineas: () => setLineas([])
  }
}