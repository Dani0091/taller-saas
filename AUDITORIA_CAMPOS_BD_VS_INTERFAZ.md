# 🔍 AUDITORÍA: Campos en Base de Datos vs Interfaz

## ✅ PROBLEMA CRÍTICO RESUELTO

### Error: "Error de esquema de base de datos"

**Causa raíz identificada:**
- El código buscaba la tabla `taller_config` pero en Supabase se llama `configuracion_taller`
- Múltiples campos tenían nombres incorrectos en las consultas

**Correcciones aplicadas (12 archivos):**
- ✅ `taller_config` → `configuracion_taller`
- ✅ `serie_factura` → `serie_factura_default` (en SELECTs)
- ✅ `iva_general` → `porcentaje_iva`
- ✅ `precio_hora_trabajo` → `tarifa_hora`

**Commit:** `6f41b9b` - "Fix CRÍTICO: Nombres de tabla y campos incompatibles con Supabase"

---

## 📊 CAMPOS DISPONIBLES EN SUPABASE PERO NO EN INTERFAZ

### 🔧 **CONFIGURACION_TALLER**

| Campo | Tipo | En Interfaz | Prioridad | Utilidad |
|-------|------|-------------|-----------|----------|
| `codigo_postal` | text | ❌ | 🔴 ALTA | Dirección completa del taller para facturas |
| `ciudad` | text | ❌ | 🔴 ALTA | Necesario para dirección fiscal |
| `provincia` | text | ❌ | 🔴 ALTA | Necesario para dirección fiscal |
| `pais` | text | ❌ | 🟡 MEDIA | Default 'España', puede ser útil |
| `web` | text | ❌ | 🟢 BAJA | URL del sitio web del taller |

**Recomendación:** Agregar sección "Dirección Completa" en Configuración con:
- Dirección (ya existe)
- Código Postal (⚠️ falta)
- Ciudad (⚠️ falta)
- Provincia (⚠️ falta)
- País (⚠️ falta)
- Web (⚠️ falta)

---

### 👥 **CLIENTES**

| Campo | Tipo | En Interfaz | Prioridad | Utilidad |
|-------|------|-------------|-----------|----------|
| `primer_apellido` | text | ❌ | 🟡 MEDIA | Separar apellidos (vs campo único `apellidos`) |
| `segundo_apellido` | text | ❌ | 🟡 MEDIA | Apellido paterno y materno |
| `fecha_nacimiento` | date | ❌ | 🟢 BAJA | Para recordatorios de cumpleaños |
| `segundo_telefono` | varchar | ❌ | 🟡 MEDIA | Teléfono alternativo de contacto |
| `email_secundario` | varchar | ❌ | 🟢 BAJA | Email alternativo |
| `preferencia_contacto` | varchar | ❌ | 🟡 MEDIA | Email/Teléfono/WhatsApp preferido |
| `acepta_marketing` | boolean | ❌ | 🟡 MEDIA | GDPR - consentimiento para marketing |
| `como_nos_conocio` | varchar | ❌ | 🟢 BAJA | Fuente de adquisición del cliente |
| `ciudad` | text | ❌ | 🟡 MEDIA | Parte de dirección completa |
| `provincia` | text | ❌ | 🟡 MEDIA | Parte de dirección completa |
| `codigo_postal` | text | ❌ | 🟡 MEDIA | Parte de dirección completa |
| `pais` | text | ❌ | 🟡 MEDIA | Para clientes internacionales |
| `iban` | text | ❌ | 🟡 MEDIA | Para domiciliaciones bancarias |
| `forma_pago` | text | ❌ | 🔴 ALTA | Método de pago preferido del cliente |
| `numero_registros_mercanitles` | text | ❌ | 🟢 BAJA | Para empresas (contiene typo "mercanitles") |
| `contacto_principal` | text | ❌ | 🟡 MEDIA | Persona de contacto en empresas |
| `contacto_email` | text | ❌ | 🟡 MEDIA | Email de la persona de contacto |
| `contacto_telefono` | text | ❌ | 🟡 MEDIA | Teléfono de la persona de contacto |
| `credito_disponible` | numeric | ❌ | 🟢 BAJA | Crédito disponible del cliente |
| `total_facturado` | numeric | ❌ | 🟡 MEDIA | Total histórico facturado (KPI) |
| `ultima_visita` | date | ❌ | 🟡 MEDIA | Fecha de última visita (para seguimiento) |

**Estado actual:** La interfaz solo muestra campos básicos (nombre, apellidos, nif, email, telefono, direccion, notas, tipo_cliente)

**Recomendación:**
1. **Prioridad ALTA**: Agregar `forma_pago` en el formulario de clientes
2. **Prioridad MEDIA**: Agregar sección expandible "Dirección Completa" y "Contacto Adicional"
3. **Prioridad BAJA**: Agregar sección "Estadísticas del Cliente" (total_facturado, ultima_visita)

**⚠️ IMPORTANTE:** Existe typo en base de datos: `numero_registros_mercanitles` debería ser `numero_registros_mercantiles`

---

### 🚗 **VEHICULOS**

| Campo | Tipo | En Interfaz | Prioridad | Utilidad |
|-------|------|-------------|-----------|----------|
| `bastidor_vin` | text | ❌ | 🟡 MEDIA | VIN alternativo / bastidor |
| `fecha_matriculacion` | date | ❌ | 🟡 MEDIA | Fecha primera matriculación |
| `numero_motor` | text | ❌ | 🟡 MEDIA | Número de motor del vehículo |
| `tipo_combustible` | text | ❌ | 🔴 ALTA | Gasolina/Diésel/Eléctrico/Híbrido |
| `carroceria` | text | ❌ | 🟡 MEDIA | Sedán/SUV/Furgoneta/etc. |
| `potencia_cv` | numeric | ❌ | 🟢 BAJA | Potencia en CV |
| `cilindrada` | integer | ❌ | 🟢 BAJA | Cilindrada del motor |
| `emisiones` | text | ❌ | 🟢 BAJA | Normativa emisiones (Euro 5/6) |
| `fotos` | jsonb | ❌ | 🟡 MEDIA | Fotos del vehículo |
| `documentos` | jsonb | ❌ | 🟡 MEDIA | Documentos escaneados |
| `historial_reparaciones` | jsonb | ❌ | 🟡 MEDIA | Historial completo |
| `version` | varchar | ❌ | 🟡 MEDIA | Versión específica del modelo |

**Estado actual:** La interfaz muestra campos básicos (matricula, marca, modelo, año, color, vin, kilometros, notas)

**Recomendación:**
1. **Prioridad ALTA**: Agregar `tipo_combustible` (importante para diagnósticos)
2. **Prioridad MEDIA**: Agregar sección "Ficha Técnica" con campos adicionales
3. **Prioridad MEDIA**: Implementar galería de fotos usando campo `fotos`

---

### 🔨 **ORDENES_REPARACION**

| Campo | Tipo | En Interfaz | Prioridad | Utilidad |
|-------|------|-------------|-----------|----------|
| `tiempo_estimado_horas` | decimal | ❌ | 🔴 ALTA | Horas estimadas de trabajo |
| `tiempo_real_horas` | decimal | ❌ | 🔴 ALTA | Horas reales trabajadas (KPI) |
| `fotos_diagnostico` | text | ❌ | 🟡 MEDIA | Fotos del diagnóstico inicial |
| `nivel_combustible` | varchar(10) | ❌ | 🟢 BAJA | Nivel de combustible al entrar |
| `renuncia_presupuesto` | boolean | ❌ | 🟡 MEDIA | Si el cliente renuncia a presupuesto |
| `accion_imprevisto` | varchar(20) | ❌ | 🟡 MEDIA | Avisar/Proceder en caso de imprevisto |
| `recoger_piezas` | boolean | ❌ | 🟢 BAJA | Si el cliente recoge piezas antiguas |
| `danos_carroceria` | text | ❌ | 🟡 MEDIA | Daños existentes al entrar |
| `coste_diario_estancia` | decimal | ❌ | 🟢 BAJA | Coste por día de almacenamiento |
| `kilometros_entrada` | integer | ❌ | 🟡 MEDIA | Kilómetros al entrar (para seguimiento) |
| `token_publico` | uuid | ❌ | 🟡 MEDIA | Token para presupuesto público |
| `fecha_envio_presupuesto` | timestamptz | ❌ | 🟡 MEDIA | Cuándo se envió el presupuesto |
| `fecha_aceptacion_cliente` | timestamptz | ❌ | 🟡 MEDIA | Cuándo lo aceptó el cliente |
| `ip_aceptacion` | varchar(45) | ❌ | 🟢 BAJA | IP desde donde se aceptó (legal) |
| `firma_cliente` | text | ❌ | 🟡 MEDIA | Firma digital del cliente |

**Recomendación:**
1. **Prioridad ALTA**: Agregar `tiempo_estimado_horas` y `tiempo_real_horas` (KPI crítico)
2. **Prioridad MEDIA**: Implementar "Formulario de Recepción" con campos de entrada
3. **Prioridad MEDIA**: Implementar sistema de presupuestos públicos con firma digital

---

### 📄 **FACTURAS**

| Campo | Tipo | En Interfaz | Prioridad | Utilidad |
|-------|------|-------------|-----------|----------|
| `fecha_vencimiento` | date | ❌ | 🔴 ALTA | Fecha límite de pago |
| `notas_internas` | text | ❌ | 🟡 MEDIA | Notas privadas del taller |
| `persona_contacto` | text | ❌ | 🟡 MEDIA | Persona de contacto para esta factura |
| `telefono_contacto` | text | ❌ | 🟡 MEDIA | Teléfono de contacto específico |
| `numero_autorizacion` | varchar(100) | ❌ | 🟡 MEDIA | Número de autorización (renting) |
| `referencia_externa` | varchar(255) | ❌ | 🟡 MEDIA | Referencia externa del cliente |

**Recomendación:**
1. **Prioridad ALTA**: Agregar `fecha_vencimiento` en formulario de facturas
2. **Prioridad MEDIA**: Agregar campos de renting/flotas cuando `tipo_cliente` es 'renting' o 'flota'

---

### 📋 **LINEAS_ORDEN**

| Campo | Tipo | En Interfaz | Prioridad | Utilidad |
|-------|------|-------------|-----------|----------|
| `precio_coste` | decimal | ❌ | 🔴 ALTA | Precio de coste (para calcular margen) |

**Recomendación:**
- **ALTA PRIORIDAD**: Agregar campo `precio_coste` en líneas para cálculo de rentabilidad
- Mostrar en dashboard: Margen Bruto = (precio_unitario - precio_coste) × cantidad

---

### 📅 **CITAS**

| Campo | Tipo | En Interfaz | Prioridad | Utilidad |
|-------|------|-------------|-----------|----------|
| `recordatorio_email` | boolean | ❌ | 🟡 MEDIA | Enviar recordatorio por email |
| `recordatorio_sms` | boolean | ❌ | 🟡 MEDIA | Enviar recordatorio por SMS |
| `minutos_antes_recordatorio` | integer | ❌ | 🟡 MEDIA | Minutos antes de la cita para recordar |
| `notas` | text | ❌ | 🟡 MEDIA | Notas adicionales de la cita |
| `google_event_id` | varchar | ❌ | 🟢 BAJA | Integración con Google Calendar |
| `google_calendar_id` | varchar | ❌ | 🟢 BAJA | ID del calendario de Google |

**Recomendación:**
- Agregar sección "Recordatorios" en formulario de citas
- Implementar integración con Google Calendar (campos ya existen)

---

### 🎯 **TARIFAS_CLIENTE**

| Campo | Tipo | En Interfaz | Prioridad | Utilidad |
|-------|------|-------------|-----------|----------|
| `tarifa_hora_urgente` | decimal | ❌ | 🟡 MEDIA | Tarifa especial para trabajos urgentes |
| `descuento_mano_obra_porcentaje` | decimal | ❌ | 🟡 MEDIA | Descuento en mano de obra |
| `dias_pago` | integer | ❌ | 🟡 MEDIA | Días de pago acordados |
| `limite_credito` | decimal | ❌ | 🟡 MEDIA | Límite de crédito del cliente |

**Recomendación:**
- Agregar estos campos en la configuración de tarifas por tipo de cliente

---

## 🚀 PLAN DE ACCIÓN RECOMENDADO

### Fase 1: Crítico (Hacer Ahora) 🔴

1. **Configuración del Taller**
   - Agregar campos de dirección completa (codigo_postal, ciudad, provincia)

2. **Clientes**
   - Agregar campo `forma_pago`

3. **Vehículos**
   - Agregar campo `tipo_combustible`

4. **Órdenes**
   - Agregar `tiempo_estimado_horas` y `tiempo_real_horas`

5. **Facturas**
   - Agregar `fecha_vencimiento`

6. **Líneas de Orden**
   - Agregar `precio_coste` para cálculo de márgenes

### Fase 2: Importante (Próxima Iteración) 🟡

1. **Clientes - Dirección completa**
2. **Clientes - Campos de contacto adicional**
3. **Órdenes - Formulario de recepción** (nivel_combustible, kilometros_entrada, danos_carroceria)
4. **Citas - Sistema de recordatorios**
5. **Facturas - Campos de renting/flotas**

### Fase 3: Mejoras (Backlog) 🟢

1. **Clientes - Estadísticas** (total_facturado, ultima_visita)
2. **Vehículos - Galería de fotos**
3. **Vehículos - Ficha técnica completa**
4. **Citas - Integración con Google Calendar**

---

## 📝 NOTAS TÉCNICAS

### Campos con Valores por Defecto

Algunos campos tienen valores por defecto en la base de datos:
- `configuracion_taller.pais` → 'España'
- `citas.estado` → 'pendiente'
- `citas.color` → '#3b82f6'

### Campos JSONB

Los campos tipo JSONB requieren parsing especial:
- `vehiculos.fotos`
- `vehiculos.documentos`
- `vehiculos.historial_reparaciones`

### Typo Detectado ⚠️

- `clientes.numero_registros_mercanitles` debería ser `numero_registros_mercantiles`

---

**Fecha de auditoría:** 2026-01-29
**Commit del fix crítico:** `6f41b9b`
**Archivos analizados:** 5 tablas principales (configuracion_taller, clientes, vehiculos, ordenes_reparacion, facturas)
**Total campos faltantes:** 60+ campos disponibles en DB pero no en interfaz
