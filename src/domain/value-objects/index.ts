/**
 * @fileoverview Barrel Export - Value Objects
 * @description Exporta todos los Value Objects para fácil importación
 *
 * Uso:
 * import { Precio, Email, Matricula } from '@/domain/value-objects'
 */

// Value Objects Generales
export { Precio } from './Precio.vo'
export { Email } from './Email.vo'
export { Matricula } from './Matricula.vo'
export { Telefono } from './Telefono.vo'
export { Kilometraje } from './Kilometraje.vo'

// Value Objects de Facturas
export { NIF } from './NIF.vo'
export { Serie, TipoSerie } from './Serie.vo'
export { NumeroFactura } from './NumeroFactura.vo'
export { Retencion } from './Retencion.vo'
