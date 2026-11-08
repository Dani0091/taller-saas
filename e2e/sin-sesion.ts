/**
 * Estado de navegador vacío para peticiones "como un desconocido".
 *
 * Ojo: en el runner de Playwright, `request.newContext()` hereda el
 * `storageState` del proyecto (qa-a), así que sin esto la petición
 * "anónima" iría con la sesión del admin de A.
 */
export const SIN_SESION = { cookies: [], origins: [] }
