# CHECKLIST COMPLETO - TallerAgil
## Estado del Proyecto y Pendientes

**Fecha:** 16 Enero 2026
**Rama de desarrollo:** `claude/fix-critical-bugs-features-pIejP`
**Producción:** Railway (tsaas-prod.up.railway.app)

---

## ✅ FUNCIONALIDADES COMPLETADAS Y VERIFICADAS

### 1. Sistema de Órdenes de Trabajo
| Funcionalidad | Estado | Notas |
|--------------|--------|-------|
| Crear orden nueva | ✅ | Con cliente y vehículo |
| Añadir líneas (mano obra, piezas) | ✅ | Por tipo con precios |
| Estados de orden | ✅ | recibido → entregado |
| Fotos entrada/salida | ✅ | Con botones siempre visibles |
| Scanner OCR (matrícula, km, VIN) | ✅ | En todos los formularios |
| Presupuesto público | ✅ | Enlace compartible, firma digital |
| Cambio estado auto al aceptar | ✅ | Cambia a "aprobado" |

### 2. Sistema de Facturación
| Funcionalidad | Estado | Notas |
|--------------|--------|-------|
| Crear factura manual | ✅ | Con líneas y totales |
| Crear factura desde orden | ✅ | Importa datos automáticamente |
| Series de facturación | ✅ | CRUD completo, por defecto/adicionales |
| Campos renting (autorización) | ✅ | nº autorización, ref. externa |
| Vista PDF factura | ✅ | React-PDF |
| Numeración automática | ✅ | Correlativa por serie |

### 3. Gestión de Clientes
| Funcionalidad | Estado | Notas |
|--------------|--------|-------|
| CRUD clientes | ✅ | Crear, editar, listar |
| Búsqueda/filtros | ✅ | Por nombre, NIF |
| Crear desde orden/factura | ✅ | Fix aplicado |

### 4. Gestión de Vehículos
| Funcionalidad | Estado | Notas |
|--------------|--------|-------|
| CRUD vehículos | ✅ | Con todos los campos |
| Scanner OCR | ✅ | Matrícula, km, VIN |
| Historial reparaciones | ✅ | Visible en detalle |
| Asociar a cliente | ✅ | Seleccionable |

### 5. Calendario y Citas
| Funcionalidad | Estado | Notas |
|--------------|--------|-------|
| Vista mes/semana/día | ✅ | Selector móvil |
| Crear citas | ✅ | Con cliente/vehículo |
| Responsive móvil | ✅ | Abreviaciones cortas |

### 6. Configuración
| Funcionalidad | Estado | Notas |
|--------------|--------|-------|
| Datos del taller | ✅ | Nombre, CIF, dirección |
| Logo | ✅ | Upload y previsualización |
| Colores marca | ✅ | Primario/secundario |
| Tarifa hora por tipo cliente | ✅ | particular, empresa, flota |
| Series facturación | ✅ | Rediseñado sin duplicación |
| Google Calendar OAuth | ✅ | Conexión por usuario |

---

## ⚠️ VERIFICACIÓN PENDIENTE (Pruebas manuales)

### Mobile Responsive
- [x] Presupuesto público - **ARREGLADO**
- [ ] Dashboard principal
- [ ] Lista de órdenes
- [ ] Detalle de orden (sheet)
- [ ] Crear factura
- [ ] Lista de facturas
- [ ] Configuración (tabs)

### Funcional
- [ ] OCR en dispositivo real
- [ ] Google Calendar sincronización
- [ ] Impresión de facturas desde móvil
- [ ] RLS (Row Level Security) en Supabase

---

## 📋 MEJORAS PENDIENTES (Próximas Tareas)

### Prioridad ALTA

#### 1. Entrada rápida de líneas en órdenes
**Problema actual:** Hay que rellenar tipo, descripción, cantidad, precio uno a uno.
**Mejora propuesta:**
```
Lista de tareas frecuentes:
[ ] Cambio de aceite - 0.5h - €22.50
[ ] Filtro de aceite - 1ud - €15.00
[ ] Filtro de aire - 1ud - €12.00
...
```
Con checkbox para marcar y añadir rápido, más opción de añadir manual.

#### 2. Sistema de Roles de Usuario
**Roles a implementar:**
| Rol | Permisos |
|-----|----------|
| Admin | Todo |
| Recepción | Crear órdenes, clientes, citas |
| Mecánico | Ver/editar órdenes asignadas, fotos, diagnóstico |
| Contable | Facturas, informes |

**Tabla SQL necesaria:**
```sql
ALTER TABLE usuarios ADD COLUMN permisos JSONB DEFAULT '{
  "ordenes": {"ver": true, "crear": true, "editar": true, "eliminar": false},
  "facturas": {"ver": false, "crear": false, "editar": false},
  "clientes": {"ver": true, "crear": true, "editar": false},
  "configuracion": {"ver": false, "editar": false}
}';
```

#### 3. Facturas Emitidas Externamente
**Para facturas hechas fuera del sistema (otro software, papel):**
- Marcar como "emitida externamente"
- Subir PDF adjunto
- No cuenta en numeración de series
- Solo para registro y contabilidad

### Prioridad MEDIA

#### 4. Perfil de Cliente Renting
Cuando `tipo_cliente = 'renting'`:
- Mostrar campo "Empresa renting" (Santander, ALD, etc.)
- Requerir nº autorización al facturar
- Facturar a nombre del usuario (no de la empresa renting)

#### 5. Plantillas de Trabajos Frecuentes
Base de datos de trabajos comunes:
- Cambio de aceite
- Revisión anual
- Cambio de pastillas
- ITV
Con precios predefinidos que se pueden personalizar.

#### 6. Dashboard con KPIs
- Facturación mensual
- Órdenes pendientes
- Vehículos en taller
- Gráficos de tendencias

---

## 🔑 CONFIGURACIÓN DE API KEYS

### ¿Dónde poner las API keys?

#### Opción 1: Variables de Entorno (Recomendado para claves comunes)
```env
# .env.local (desarrollo)
# Railway/Vercel Variables (producción)

# Supabase (OBLIGATORIO)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Google OAuth (para Google Calendar)
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx

# OCR (Gemini)
GEMINI_API_KEY=xxx

# OpenRouter (alternativa OCR)
OPENROUTER_API_KEY=xxx
```

#### Opción 2: Por Taller (Para tiers gratuitos individuales)
**Tabla `taller_api_config`** - Ya existe en el schema:
```sql
SELECT * FROM taller_api_config WHERE taller_id = 'xxx';
-- google_client_id, gemini_api_key, etc.
```

### Estrategia Recomendada

| Servicio | Config | Razón |
|----------|--------|-------|
| Supabase | Global (.env) | Base de datos compartida |
| Google Calendar | **Por taller** | Cada taller usa su cuota gratis |
| Gemini OCR | **Por taller** | Tier gratis de 60 req/min |
| OpenRouter | **Por taller** | Límites por API key |

### Cómo añadir Google Calendar por taller:

1. **El taller crea proyecto en Google Cloud Console**
2. **Obtiene Client ID y Client Secret**
3. **Lo configura en Configuración > Integraciones > Google Calendar**
4. **El sistema usa esas credenciales para ese taller**

Código de ejemplo para usar config del taller:
```typescript
// En la API de Google Calendar
const config = await supabase
  .from('taller_api_config')
  .select('google_client_id, google_client_secret')
  .eq('taller_id', tallerId)
  .single()

const oauth2Client = new google.auth.OAuth2(
  config.google_client_id || process.env.GOOGLE_CLIENT_ID,
  config.google_client_secret || process.env.GOOGLE_CLIENT_SECRET,
  redirectUri
)
```

---

## 🔒 ROW LEVEL SECURITY (RLS)

### Estado Actual
- ✅ Políticas definidas en `MASTER_SCHEMA.sql`
- ✅ Función `get_my_taller_id()` creada
- ⚠️ Requiere que `usuarios.auth_id` esté correctamente enlazado

### Si RLS falla:

**1. Verificar enlace usuario:**
```sql
SELECT id, email, auth_id, taller_id FROM usuarios
WHERE email = 'tu@email.com';
-- auth_id debe coincidir con auth.uid()
```

**2. Actualizar auth_id si falta:**
```sql
UPDATE usuarios
SET auth_id = 'uuid-de-auth.users'
WHERE email = 'tu@email.com';
```

**3. Temporalmente desactivar RLS (SOLO DEBUG):**
```sql
ALTER TABLE clientes DISABLE ROW LEVEL SECURITY;
-- RECUERDA VOLVER A ACTIVAR:
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
```

**4. Verificar función auxiliar:**
```sql
SELECT get_my_taller_id();
-- Debe devolver el UUID del taller, no NULL
```

---

## 🗃️ ARCHIVOS IMPORTANTES

### Base de Datos
- `supabase/MASTER_SCHEMA.sql` - Schema completo para nueva instalación
- `supabase/migrations/*.sql` - Migraciones incrementales

### Componentes Clave
- `src/components/dashboard/ordenes/detalle-orden-sheet.tsx` - Detalle orden
- `src/components/facturas/plantilla-factura.tsx` - PDF factura
- `src/app/presupuesto/[token]/page.tsx` - Presupuesto público
- `src/app/dashboard/configuracion/page.tsx` - Configuración

### APIs
- `src/app/api/facturas/crear/route.ts` - Crear factura
- `src/app/api/presupuesto/[token]/route.ts` - Aceptar presupuesto
- `src/app/api/ordenes/compartir/route.ts` - Generar enlace

---

## 📱 LÓGICA DE NEGOCIO - Notas

### Flujo de Orden de Trabajo
```
1. RECIBIDO → Cliente deja vehículo
2. DIAGNÓSTICO → Mecánico revisa
3. PRESUPUESTADO → Se crea presupuesto
4. APROBADO → Cliente acepta (automático si firma digital)
5. EN REPARACIÓN → Se trabaja
6. COMPLETADO → Trabajo terminado
7. ENTREGADO → Cliente recoge
```

### Numeración de Facturas
- **Correlativa por serie**: FA001, FA002, FA003...
- **No se puede saltar números** (requisito fiscal)
- **Si se anula, crear rectificativa** (no borrar)

### Clientes de Renting
- Santander, ALD, Alphabet requieren **nº autorización**
- Se obtiene de GT Global u otro sistema
- La factura va a nombre del **usuario del vehículo**, no de la empresa de renting

---

## 🚀 PRÓXIMOS PASOS

### Hoy
1. ✅ Push cambios responsive
2. Revisar otras pantallas móvil
3. Merge a main cuando listo

### Esta Semana
1. Entrada rápida de líneas
2. Sistema de roles básico
3. Verificar RLS en producción

### Próximas Semanas
1. Facturas externas
2. Plantillas de trabajos
3. Dashboard KPIs

---

## 📞 CONTACTO Y SOPORTE

- **Repositorio:** Dani0091/taller-saas
- **Rama desarrollo:** claude/fix-critical-bugs-features-pIejP
- **Producción:** tsaas-prod.up.railway.app

---

*Última actualización: 16 Enero 2026*
