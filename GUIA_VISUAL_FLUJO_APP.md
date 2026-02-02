# 📱 GUÍA VISUAL: Flujo Completo de la Aplicación TallerAgil

**Fecha**: $(date +"%Y-%m-%d %H:%M")  
**Versión**: Post-Refactoring (Clean Architecture)  
**Branch**: `claude/refactor-saas-architecture-5fW7k`

---

## 🎯 OBJETIVO DE ESTA GUÍA

Esta guía te ayudará a:
1. **Entender** la estructura completa de la app
2. **Navegar** por todas las pantallas sistemáticamente
3. **Auditar** la UI tras el refactoring
4. **Verificar** que todo funciona correctamente

---

## 🗺️ MAPA DE NAVEGACIÓN DE LA APP

```
┌─────────────────────────────────────────────────────────────┐
│                     LANDING PAGE (/)                        │
│                                                             │
│  [Iniciar Sesión] ────┐                                    │
│  [Registrarse]        │                                     │
└───────────────────────┼─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   AUTH (/auth/*)                            │
│                                                             │
│  ├── /auth/login           (Iniciar sesión)               │
│  ├── /auth/registro        (Crear cuenta)                 │
│  ├── /auth/recuperar       (Recuperar contraseña)         │
│  └── /auth/nueva-password  (Establecer nueva password)    │
└───────────────────────┬─────────────────────────────────────┘
                        │ [Autenticación exitosa]
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                  DASHBOARD (/dashboard)                     │
│                                                             │
│  ┌────────────┐                                            │
│  │  SIDEBAR   │  7 módulos principales:                    │
│  │            │                                             │
│  │ ┌─ Dashboard    → /dashboard                           │
│  │ ├─ Órdenes      → /dashboard/ordenes                   │
│  │ ├─ Citas        → /dashboard/citas                     │
│  │ ├─ Clientes     → /dashboard/clientes                  │
│  │ ├─ Vehículos    → /dashboard/vehiculos                 │
│  │ ├─ Facturas     → /dashboard/facturas                  │
│  │ └─ Configuración→ /dashboard/configuracion             │
│  └────────────┘                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 ESTRUCTURA COMPLETA DE RUTAS

### 🏠 Público
```
/                           Landing page
/presupuesto/[token]        Ver presupuesto compartido
```

### 🔐 Autenticación
```
/auth/login                 Iniciar sesión
/auth/registro              Crear cuenta nueva
/auth/recuperar             Recuperar contraseña
/auth/nueva-password        Establecer nueva password
```

### 📊 Dashboard (Autenticado)
```
/dashboard                  Dashboard principal (métricas)
/dashboard/ordenes          Listado de órdenes
/dashboard/citas            Listado de citas
/dashboard/clientes         Listado de clientes
/dashboard/clientes/nuevo   Crear nuevo cliente
/dashboard/vehiculos        Listado de vehículos
/dashboard/vehiculos/nuevo  Crear nuevo vehículo
/dashboard/facturas         Listado de facturas
/dashboard/facturas/nueva   Crear nueva factura
/dashboard/facturas/ver     Ver factura específica
/dashboard/configuracion    Configuración del taller
```

---

## 🎨 LAYOUT DE LA APLICACIÓN

### Estructura Visual
```
┌──────────────────────────────────────────────────────┐
│  [HEADER]                                            │
│  TallerAgil | [Usuario] | [Notificaciones] | [Menu] │
├──────────────┬───────────────────────────────────────┤
│              │                                       │
│  [SIDEBAR]   │        [CONTENIDO PRINCIPAL]         │
│              │                                       │
│  Dashboard   │  ┌─────────────────────────────────┐ │
│  Órdenes     │  │                                 │ │
│  Citas       │  │    Contenido de la página       │ │
│  Clientes    │  │                                 │ │
│  Vehículos   │  │                                 │ │
│  Facturas    │  │                                 │ │
│  Config      │  └─────────────────────────────────┘ │
│              │                                       │
│  [PLAN INFO] │                                       │
└──────────────┴───────────────────────────────────────┘
```

### Colores y Estilos
- **Sidebar**: Fondo oscuro (gray-900)
- **Sidebar activo**: Gradiente sky-500 → cyan-500
- **Header**: Fondo blanco con borde inferior
- **Contenido**: Fondo gris claro (gray-50)
- **Iconos**: lucide-react
- **Logo**: Gauge icon con gradiente

---

## 🔄 FLUJO DE NAVEGACIÓN COMPLETO

### 1️⃣ INICIO DE SESIÓN

```
┌─────────────────────────────┐
│  PANTALLA: /auth/login      │
├─────────────────────────────┤
│                             │
│  TallerAgil                 │
│  ───────────────            │
│                             │
│  📧 Email                   │
│  [________________]         │
│                             │
│  🔒 Contraseña              │
│  [________________]         │
│                             │
│  [Iniciar Sesión]           │
│                             │
│  ¿Olvidaste tu contraseña?  │
│  ¿No tienes cuenta? Regístrate│
└─────────────────────────────┘
```

**PASOS PARA PROBAR**:
1. ✅ Abrir http://localhost:3000/auth/login
2. ✅ Verificar que el logo y el título se ven correctamente
3. ✅ Ingresar email y password
4. ✅ Click en "Iniciar Sesión"
5. ✅ Verificar redirect a /dashboard

**CASOS EDGE**:
- ❌ Email inválido → Debe mostrar error
- ❌ Password incorrecta → Debe mostrar error
- ❌ Campos vacíos → Debe mostrar error

---

### 2️⃣ DASHBOARD PRINCIPAL

```
┌─────────────────────────────────────────────────────┐
│  PANTALLA: /dashboard                               │
├─────────────────────────────────────────────────────┤
│                                                     │
│  📊 Métricas del Taller                            │
│                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Órdenes  │ │ Facturas │ │ Clientes │          │
│  │   24     │ │   18     │ │   56     │          │
│  │  Activas │ │  Pendientes│ │  Total  │          │
│  └──────────┘ └──────────┘ └──────────┘          │
│                                                     │
│  📈 Gráficos de rendimiento                        │
│  ┌─────────────────────────────────────┐          │
│  │  [Gráfico de ingresos mensuales]   │          │
│  └─────────────────────────────────────┘          │
│                                                     │
│  📋 Órdenes Recientes                              │
│  ┌─────────────────────────────────────┐          │
│  │ #001 | Cliente A | En proceso       │          │
│  │ #002 | Cliente B | Pendiente        │          │
│  └─────────────────────────────────────┘          │
└─────────────────────────────────────────────────────┘
```

**PASOS PARA PROBAR**:
1. ✅ Verificar que las métricas se cargan
2. ✅ Verificar que los gráficos se renderizan
3. ✅ Verificar que la tabla de órdenes recientes se muestra
4. ✅ Click en una orden → Debe abrir el detalle

**ELEMENTOS VISUALES**:
- 📊 Cards con métricas (3 columnas)
- 📈 Gráfico de líneas/barras
- 📋 Tabla de órdenes recientes
- 🎨 Colores: Sky-500, Cyan-500, Green-500

---

### 3️⃣ MÓDULO DE ÓRDENES (⚠️ CRÍTICO - REFACTORIZADO)

```
┌─────────────────────────────────────────────────────┐
│  PANTALLA: /dashboard/ordenes                       │
├─────────────────────────────────────────────────────┤
│                                                     │
│  🔧 Órdenes de Reparación                          │
│                                                     │
│  [+ Nueva Orden]  [Filtros ▼]  [Buscar...]        │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │ #  │ Cliente  │ Vehículo │ Estado  │ Total │  │
│  ├────┼──────────┼──────────┼─────────┼───────┤  │
│  │001 │ Juan P.  │ Seat Ibiza│ ✅ Listo│ 450€ │  │
│  │002 │ María G. │ Ford Focus│ 🔧 Proc.│ 320€ │  │
│  │003 │ Pedro L. │ Opel Astra│ ⏳ Pend.│ 180€ │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
│  [Paginación: 1 2 3 ... 10]                       │
└─────────────────────────────────────────────────────┘
```

**PASOS PARA PROBAR**:
1. ✅ Click en "Órdenes" en sidebar
2. ✅ Verificar que la tabla se carga con datos
3. ✅ Click en "+ Nueva Orden"
4. ✅ Verificar que el modal se abre

**MODAL: NUEVA ORDEN** (⚠️ COMPONENTE REFACTORIZADO)

```
┌──────────────────────────────────────────────────────┐
│  Nueva Orden                                    [X]  │
├──────────────────────────────────────────────────────┤
│                                                      │
│  [Info] [Fotos] [Trabajo] [Items]                  │
│   ▔▔▔                                               │
│                                                      │
│  👤 Cliente *                                        │
│  [Seleccionar cliente ▼] [+ Nuevo]                 │
│                                                      │
│  🚗 Vehículo                                         │
│  [Seleccionar vehículo ▼] [+ Nuevo]                │
│                                                      │
│  📝 Descripción del problema                         │
│  [_____________________________________]            │
│  [_____________________________________]            │
│  [_____________________________________]            │
│                                                      │
│  ⛽ Recepción del vehículo                          │
│  Nivel combustible: [E] [1/4] [1/2] [3/4] [F]     │
│  KM entrada: [_______]                              │
│                                                      │
│  ✍️ Autorizaciones                                   │
│  ☐ Cliente autoriza reparación                      │
│  ☐ Renuncia a presupuesto previo                    │
│  ☐ Desea recoger piezas sustituidas                 │
│                                                      │
│  [Cancelar] [Crear Orden]                           │
└──────────────────────────────────────────────────────┘
```

**FLUJO COMPLETO DE ORDEN (TABS)**:

#### TAB 1: INFO
- ✅ Selección de cliente (dropdown)
- ✅ Botón "Nuevo cliente" → Modal inline
- ✅ Selección de vehículo (dropdown)
- ✅ Botón "Nuevo vehículo" → Modal inline
- ✅ Descripción del problema (textarea)
- ✅ Nivel de combustible (5 botones)
- ✅ KM de entrada (input numérico)
- ✅ Autorizaciones (4 checkboxes)
- ✅ Daños preexistentes (textarea)
- ✅ Notas internas (textarea)
- ✅ Documentación adicional (2 fotos)

#### TAB 2: FOTOS
```
┌──────────────────────────────────────────────────────┐
│  [Info] [Fotos] [Trabajo] [Items]                   │
│         ▔▔▔▔▔                                        │
│                                                      │
│  📸 Fotos de Entrada                                 │
│  ┌──────────┐ ┌──────────┐                         │
│  │ Entrada  │ │ Frontal  │                         │
│  │ [Subir]  │ │ [Subir]  │                         │
│  └──────────┘ └──────────┘                         │
│  ┌──────────┐ ┌──────────┐                         │
│  │Izquierda │ │ Derecha  │                         │
│  │ [Subir]  │ │ [Subir]  │                         │
│  └──────────┘ └──────────┘                         │
│                                                      │
│  ✅ Fotos de Salida                                  │
│  ┌──────────┐ ┌──────────┐                         │
│  │ Salida   │ │ Trasera  │                         │
│  │ [Subir]  │ │ [Subir]  │                         │
│  └──────────┘ └──────────┘                         │
└──────────────────────────────────────────────────────┘
```

**FUNCIONALIDAD OCR** (IMPORTANTE):
- 🔍 Al subir foto de entrada → OCR detecta matrícula y KM
- ✅ Valida matrícula contra vehículo seleccionado
- ✅ Muestra toast con matrícula detectada
- ✅ Actualiza KM del vehículo automáticamente

#### TAB 3: TRABAJO
```
┌──────────────────────────────────────────────────────┐
│  [Info] [Fotos] [Trabajo] [Items]                   │
│                  ▔▔▔▔▔▔▔                            │
│                                                      │
│  🔧 Diagnóstico Técnico                              │
│  [_____________________________________]            │
│  [_____________________________________]            │
│                                                      │
│  📸 Fotos de Diagnóstico                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ Diag 1   │ │ Diag 2   │ │ Diag 3   │           │
│  └──────────┘ └──────────┘ └──────────┘           │
│                                                      │
│  🛠️ Trabajos Realizados                              │
│  [_____________________________________]            │
│  [_____________________________________]            │
│                                                      │
│  ⏱️ Tiempos                                          │
│  Estimado: [2.5 horas ▼]                           │
│  Real: [3.0 horas ▼]                               │
└──────────────────────────────────────────────────────┘
```

#### TAB 4: ITEMS (⚠️ MÁS CRÍTICO - REFACTORIZADO)
```
┌──────────────────────────────────────────────────────┐
│  [Info] [Fotos] [Trabajo] [Items]                   │
│                            ▔▔▔▔▔                    │
│                                                      │
│  ➕ Añadir línea de trabajo                          │
│  ┌────────────────────────────────────────────────┐ │
│  │ Tipo: [🔧 Mano de obra ▼]                     │ │
│  │ Descripción: [_________________________]      │ │
│  │ Horas: [1.0 ▼]  Precio/hora: [45.00€]        │ │
│  │ Subtotal: 45.00€                               │ │
│  │ [Añadir línea]                                 │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  📋 Elementos de la orden (3)                        │
│  ┌────────────────────────────────────────────────┐ │
│  │ Concepto     │Tipo│Cant│Precio│Estado│Total  │ │
│  ├──────────────┼────┼────┼──────┼──────┼───────┤ │
│  │Cambio aceite │M.O.│1.0 │45€   │-     │45.00€││ │
│  │Filtro aceite │Pza.│1   │12€   │✅Conf│12.00€││ │
│  │Filtro aire   │Pza.│1   │8€    │📋Pre │8.00€ ││ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  💶 RESUMEN DE TOTALES                               │
│  ┌────────────────────────────────────────────────┐ │
│  │  Mano de obra:        45.00€                  │ │
│  │  Piezas:              20.00€                  │ │
│  │  ─────────────────────────                    │ │
│  │  Subtotal:            65.00€                  │ │
│  │  IVA (21%):           13.65€                  │ │
│  │  ═════════════════════════                    │ │
│  │  TOTAL:               78.65€                  │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ➕ Añadir elemento rápido                           │
│  [Tipo▼][Descripción...][Cant][Precio][+]          │
└──────────────────────────────────────────────────────┘
```

**⚠️ PUNTOS CRÍTICOS A VERIFICAR EN TAB ITEMS**:
1. ✅ Añadir línea de mano de obra
   - Dropdown de horas (0.25, 0.5, 0.75, 1.0, etc.)
   - Precio auto-completado desde tarifa_hora
   - Subtotal calculado en tiempo real
2. ✅ Añadir línea de pieza
   - Dropdown de cantidad (1-20)
   - Input de precio
   - Dropdown de estado (presupuestado/confirmado/recibido)
3. ✅ Editar línea inline
   - Click en cantidad → Input numérico
   - Click en precio → Input numérico
   - Guardar automáticamente
4. ✅ Eliminar línea
   - Icono de papelera
   - Confirmación implícita (sin modal)
5. ✅ **TOTALES SE RECALCULAN AUTOMÁTICAMENTE**
   - Cada vez que añades/editas/eliminas línea
   - Los totales vienen del backend (Server Action)
   - IVA es dinámico (desde taller_config)

#### FOOTER (⚠️ REFACTORIZADO)
```
┌──────────────────────────────────────────────────────┐
│  [Compartir Presupuesto]                            │
│  [Ver / Imprimir Orden Completa]                    │
│  [📅 Añadir a Google Calendar]                      │
│  [Generar Factura ▼]                                │
│    ├─ 📝 Crear Borrador Editable                    │
│    └─ ⚡ Emitir Factura Directa                     │
│                                                      │
│  [Cancelar] [Guardar Cambios]                       │
└──────────────────────────────────────────────────────┘
```

**PASOS PARA PROBAR FOOTER**:
1. ✅ Click en "Compartir Presupuesto"
   - Debe generar enlace
   - Debe mostrar botones: [Copiar] [WhatsApp] [Abrir]
2. ✅ Click en "Ver / Imprimir"
   - Debe abrir PDF en modal
3. ✅ Click en "Añadir a Google Calendar"
   - Debe abrir modal de Google Calendar
4. ✅ Click en "Generar Factura"
   - Debe mostrar dropdown con 2 opciones
   - Borrador → Ir a /dashboard/facturas/nueva?orden=123
   - Directa → Crear factura y redirigir
5. ✅ Click en "Guardar Cambios"
   - Debe guardar en BD
   - Debe cerrar modal
   - Debe actualizar lista de órdenes

---

### 4️⃣ MÓDULO DE CITAS

```
┌─────────────────────────────────────────────────────┐
│  PANTALLA: /dashboard/citas                         │
├─────────────────────────────────────────────────────┤
│                                                     │
│  📅 Calendario de Citas                            │
│                                                     │
│  [+ Nueva Cita]  [Hoy]  [◀ Semana ▶]              │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │  L   M   X   J   V   S   D                 │  │
│  │ ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐               │  │
│  │ │1│ │2│ │3│ │4│ │5│ │6│ │7│               │  │
│  │ └─┘ └─┘ └─┘ └─┘ └─┘ └─┘ └─┘               │  │
│  │                                             │  │
│  │ 09:00 - Cliente A (Revisión)               │  │
│  │ 11:00 - Cliente B (Cambio aceite)          │  │
│  │ 14:00 - Cliente C (Reparación)             │  │
│  └─────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**PASOS PARA PROBAR**:
1. ✅ Verificar que el calendario se renderiza
2. ✅ Click en "+ Nueva Cita"
3. ✅ Crear cita con cliente, fecha, hora
4. ✅ Verificar que aparece en el calendario

---

### 5️⃣ MÓDULO DE CLIENTES

```
┌─────────────────────────────────────────────────────┐
│  PANTALLA: /dashboard/clientes                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  👥 Clientes                                        │
│                                                     │
│  [+ Nuevo Cliente]  [Buscar...]                    │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │ Nombre      │ Teléfono    │ Email  │ Acciones│  │
│  ├─────────────┼─────────────┼────────┼─────────┤  │
│  │ Juan Pérez  │ 666123456   │ juan@..│ [Ver]   │  │
│  │ María García│ 677234567   │ maria@.│ [Ver]   │  │
│  │ Pedro López │ 688345678   │ pedro@.│ [Ver]   │  │
│  └─────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**PASOS PARA PROBAR**:
1. ✅ Verificar listado de clientes
2. ✅ Click en "+ Nuevo Cliente"
3. ✅ Rellenar formulario (nombre, apellidos, NIF, teléfono, email)
4. ✅ Guardar cliente
5. ✅ Verificar que aparece en la lista

---

### 6️⃣ MÓDULO DE VEHÍCULOS

```
┌─────────────────────────────────────────────────────┐
│  PANTALLA: /dashboard/vehiculos                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  🚗 Vehículos                                       │
│                                                     │
│  [+ Nuevo Vehículo]  [Buscar...]                   │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │ Matrícula│ Marca  │ Modelo │ Cliente│Acciones│  │
│  ├──────────┼────────┼────────┼────────┼────────┤  │
│  │ 1234ABC  │ Seat   │ Ibiza  │ Juan P.│ [Ver]  │  │
│  │ 5678DEF  │ Ford   │ Focus  │ María G│ [Ver]  │  │
│  │ 9012GHI  │ Opel   │ Astra  │ Pedro L│ [Ver]  │  │
│  └─────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**PASOS PARA PROBAR**:
1. ✅ Verificar listado de vehículos
2. ✅ Click en "+ Nuevo Vehículo"
3. ✅ Rellenar formulario (matrícula, marca, modelo, bastidor)
4. ✅ Guardar vehículo
5. ✅ Verificar que aparece en la lista

---

### 7️⃣ MÓDULO DE FACTURAS

```
┌─────────────────────────────────────────────────────┐
│  PANTALLA: /dashboard/facturas                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  🧾 Facturas                                        │
│                                                     │
│  [+ Nueva Factura]  [Filtros ▼]                    │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │ #    │ Cliente  │ Fecha  │ Estado │ Total  │  │
│  ├──────┼──────────┼────────┼────────┼────────┤  │
│  │ F001 │ Juan P.  │15/01/24│✅ Emitida│ 450€│  │
│  │ F002 │ María G. │16/01/24│📝 Borrad │ 320€│  │
│  │ F003 │ Pedro L. │17/01/24│❌ Anulad │ 180€│  │
│  └─────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**PASOS PARA PROBAR**:
1. ✅ Verificar listado de facturas
2. ✅ Click en factura → Ver PDF
3. ✅ Crear factura desde orden (desde footer de orden)
4. ✅ Verificar estados: Borrador, Emitida, Anulada

---

### 8️⃣ MÓDULO DE CONFIGURACIÓN

```
┌─────────────────────────────────────────────────────┐
│  PANTALLA: /dashboard/configuracion                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ⚙️ Configuración del Taller                        │
│                                                     │
│  📋 Información General                             │
│  ┌────────────────────────────────────────────┐   │
│  │ Nombre del taller: [_______________]       │   │
│  │ CIF/NIF: [_______________]                 │   │
│  │ Dirección: [_______________]               │   │
│  │ Teléfono: [_______________]                │   │
│  │ Email: [_______________]                   │   │
│  └────────────────────────────────────────────┘   │
│                                                     │
│  💶 Precios                                         │
│  ┌────────────────────────────────────────────┐   │
│  │ Tarifa por hora: [45.00€]                  │   │
│  │ IVA general: [21%]                         │   │
│  └────────────────────────────────────────────┘   │
│                                                     │
│  🔔 Notificaciones                                  │
│  ┌────────────────────────────────────────────┐   │
│  │ ☑ Email al crear orden                     │   │
│  │ ☑ Email al completar orden                 │   │
│  │ ☐ WhatsApp al cambiar estado               │   │
│  └────────────────────────────────────────────┘   │
│                                                     │
│  🔌 Integraciones                                   │
│  ┌────────────────────────────────────────────┐   │
│  │ Google Calendar: [🔗 Conectar]             │   │
│  │ Telegram Bot: [✅ Conectado]               │   │
│  └────────────────────────────────────────────┘   │
│                                                     │
│  [Guardar Configuración]                           │
└─────────────────────────────────────────────────────┘
```

**PASOS PARA PROBAR**:
1. ✅ Cambiar tarifa por hora
2. ✅ Cambiar IVA general
3. ✅ Guardar configuración
4. ✅ Verificar que se aplica en nuevas órdenes

---

## 📱 RESPONSIVE (MÓVIL)

### Vista Móvil
```
┌────────────────────┐
│  [☰] TallerAgil   │ ← Header con hamburger menu
├────────────────────┤
│                    │
│  [Contenido]       │
│                    │
│                    │
│                    │
│                    │
└────────────────────┘

Al pulsar [☰]:
┌────────────────────┐
│ ◀ Cerrar           │
│                    │
│ Dashboard          │
│ Órdenes            │
│ Citas              │
│ Clientes           │
│ Vehículos          │
│ Facturas           │
│ Configuración      │
│                    │
│ [Plan: PRO]        │
└────────────────────┘
```

**PASOS PARA PROBAR**:
1. ✅ Reducir ventana a <768px
2. ✅ Verificar que sidebar se oculta
3. ✅ Click en hamburger menu
4. ✅ Verificar que sidebar se despliega
5. ✅ Click en opción → Sidebar se cierra automáticamente

---

## ✅ CHECKLIST DE AUDITORÍA VISUAL

### Colores y Estilos Generales
- [ ] Sidebar: Fondo gray-900 ✅
- [ ] Sidebar activo: Gradiente sky-500 → cyan-500 ✅
- [ ] Botones primarios: Sky-600 ✅
- [ ] Botones secundarios: Gray-200 ✅
- [ ] Textos: Gray-900 (títulos), Gray-600 (secundario) ✅
- [ ] Iconos: Lucide-react, tamaño consistente ✅

### Componentes UI
- [ ] Botones tienen hover effects ✅
- [ ] Inputs tienen focus ring (sky-500) ✅
- [ ] Dropdowns se abren correctamente ✅
- [ ] Modales se centran en pantalla ✅
- [ ] Tablas tienen hover en filas ✅
- [ ] Cards tienen sombra sutil ✅

### Tipografía
- [ ] Títulos: Font-bold, text-xl o text-2xl ✅
- [ ] Texto normal: text-sm o text-base ✅
- [ ] Textos secundarios: text-xs, gray-500 ✅
- [ ] Monospace en: matrículas, NIF, precios ✅

### Iconografía
- [ ] Iconos de estado (✅ ⏳ 🔧) se ven correctamente ✅
- [ ] Iconos de Lucide tienen tamaño w-4 h-4 o w-5 h-5 ✅
- [ ] Iconos alineados verticalmente con texto ✅

### Animaciones
- [ ] Loaders tienen animate-spin ✅
- [ ] Botones tienen transition-all ✅
- [ ] Modales tienen fade-in ✅
- [ ] Sidebar tiene slide-in en móvil ✅

### Responsive
- [ ] Móvil (<768px): Sidebar oculto por defecto ✅
- [ ] Tablet (768-1024px): Sidebar visible pero estrecho ✅
- [ ] Desktop (>1024px): Sidebar completo visible ✅
- [ ] Tablas tienen scroll horizontal en móvil ✅

---

## 🎯 CHECKLIST FINAL DE VERIFICACIÓN

### Autenticación
- [ ] Login funciona
- [ ] Logout funciona
- [ ] Redirecciones correctas

### Dashboard
- [ ] Métricas se cargan
- [ ] Gráficos se renderizan
- [ ] Órdenes recientes se muestran

### Órdenes (⚠️ CRÍTICO)
- [ ] Crear orden funciona
- [ ] Tab Info: Todos los campos funcionan
- [ ] Tab Fotos: OCR funciona
- [ ] Tab Trabajo: Fotos y textos funcionan
- [ ] Tab Items: Añadir/editar/eliminar líneas funciona
- [ ] Totales se calculan correctamente
- [ ] Footer: Todas las acciones funcionan
- [ ] Guardar orden funciona
- [ ] Modal se cierra correctamente

### Citas
- [ ] Calendario se renderiza
- [ ] Crear cita funciona
- [ ] Citas aparecen en calendario

### Clientes
- [ ] Listado se carga
- [ ] Crear cliente funciona
- [ ] Buscar cliente funciona

### Vehículos
- [ ] Listado se carga
- [ ] Crear vehículo funciona
- [ ] Buscar vehículo funciona

### Facturas
- [ ] Listado se carga
- [ ] Ver PDF funciona
- [ ] Crear desde orden funciona

### Configuración
- [ ] Cambios se guardan
- [ ] Tarifa hora se aplica
- [ ] IVA dinámico funciona

---

## 📝 NOTAS FINALES

### Lo Más Importante a Verificar
1. **Órdenes → Tab Items** (refactorizado)
2. **Totales se calculan desde backend**
3. **IVA es dinámico (no hardcodeado)**
4. **Fotos con OCR funcionan**
5. **Guardado automático funciona**

### Si Algo Falla
1. Abrir DevTools (F12)
2. Ver consola (errores en rojo)
3. Ver Network tab (peticiones fallidas)
4. Copiar error y reportar

---

**Creado por**: Claude Code (Sonnet 4.5)  
**Fecha**: $(date +"%Y-%m-%d %H:%M")  
**Para**: Auditoría post-refactoring
