/**
 * @fileoverview Barrel Export - Server Actions de Órdenes
 * @description Exporta todas las acciones de órdenes con patrón blindado
 *
 * PATRÓN CONSISTENTE:
 * 1. Autenticación (Auth)
 * 2. Validación con Zod + Value Objects
 * 3. Ejecución de Use Case
 * 4. Revalidación de caché (cuando corresponde)
 * 5. Error Mapping (traducción a mensajes de usuario)
 */

export { crearOrdenAction } from './crear-orden.action'
export { actualizarOrdenAction } from './actualizar-orden.action'
export { obtenerOrdenAction } from './obtener-orden.action'
export { listarOrdenesAction } from './listar-ordenes.action'
export { eliminarOrdenAction } from './eliminar-orden.action'
export { cambiarEstadoOrdenAction } from './cambiar-estado-orden.action'
export { calcularTotalesOrdenAction } from './calcular-totales-orden.action'
