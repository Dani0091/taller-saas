# 📄 SISTEMA DE GESTIÓN DE FACTURAS - GUÍA DE USO

## 🎯 Descripción General

Sistema completo de facturación electrónica cumpliendo normativa española (Verifactu, IVA, AEAT).

**Características**:
- ✅ Creación de facturas con líneas de detalle
- ✅ Generación automática de números secuenciales
- ✅ Cálculo automático de IVA (21%)
- ✅ Generación de Verifactu (QR, Hash, XML)
- ✅ Gestión de estados (borrador → emitida → pagada)
- ✅ Información legal completa
- ✅ Conservación y auditoría

---

## 📋 Flujo de Trabajo

### 1️⃣ Crear Nueva Factura
```
URL: /dashboard/facturas/nueva

Pasos:
1. Seleccionar cliente
2. Establecer fechas (emisión y vencimiento)
3. Seleccionar método de pago
4. Agregar líneas de concepto
5. Revisar totales (base + IVA)
6. Guardar como BORRADOR
```

**Estado inicial**: `borrador`

### 2️⃣ Ver y Editar Factura
```
URL: /dashboard/facturas/ver?id=[FACTURA_ID]

Acciones disponibles:
- Imprimir
- Descargar PDF (cuando esté disponible)
- Generar Verifactu
- Cambiar estado
- Ver información legal
```

### 3️⃣ Generar Verifactu
```
Acción: "Generar Verifactu"

Se genera automáticamente:
- Número de verificación (13 dígitos)
- Hash SHA-256 encadenado
- Código QR escaneable
- XML de registro
- Firma HMAC (pendiente certificado real)
- URL de verificación en AEAT
```

### 4️⃣ Cambiar Estado de Factura
```
Flujo de estados:

BORRADOR → EMITIDA → PAGADA
    ↓         ↓          ↓
    └─────────┴──────────→ ANULADA

Borrador: Sin enviar a AEAT
Emitida: Registrada en AEAT (Verifactu generado)
Pagada: Recibido pago completo
Anulada: Factura cancelada (irreversible)
```

### 5️⃣ Listar y Filtrar Facturas
```
URL: /dashboard/facturas

Filtros disponibles:
- Por estado (borrador, emitida, pagada, anulada)
- Por búsqueda de número de factura
- Ordenado por fecha (más reciente primero)
```

---

## 🔧 API Endpoints

### Obtener Lista de Facturas
```bash
GET /api/facturas/obtener?taller_id=[ID]&estado=[ESTADO]&fecha_desde=[FECHA]

Parámetros:
- taller_id (requerido): ID del taller
- estado (opcional): borrador|emitida|pagada|anulada
- cliente_id (opcional): Filtrar por cliente
- fecha_desde (opcional): Formato YYYY-MM-DD
- fecha_hasta (opcional): Formato YYYY-MM-DD

Respuesta:
[
  {
    id: "uuid",
    numero_factura: "FA001",
    fecha_emision: "2024-10-30",
    total: 242.00,
    estado: "emitida",
    cliente: { nombre, nif },
    lineas: [...]
  }
]
```

### Obtener Detalle de Factura
```bash
GET /api/facturas/detalles?id=[FACTURA_ID]

Respuesta:
{
  id: "uuid",
  numero_factura: "FA001",
  fecha_emision: "2024-10-30",
  base_imponible: 200.00,
  iva: 42.00,
  total: 242.00,
  estado: "emitida",
  numero_verifactu: "2410301234FA001",
  verifactu_qr: "2410301234FA001|...",
  verifactu_qr_base64: "iVBORw0KGgo...",
  verifactu_qr_url: "https://www.aeat.es/verifactu?...",
  cliente: { nombre, nif, direccion, ciudad, provincia },
  lineas: [
    {
      descripcion: "Cambio de aceite",
      cantidad: 1,
      precio_unitario: 200.00
    }
  ]
}
```

### Crear Factura
```bash
POST /api/facturas/crear

Body:
{
  taller_id: "uuid",
  cliente_id: "uuid",
  fecha_emision: "2024-10-30",
  fecha_vencimiento: "2024-11-29",
  base_imponible: 200.00,
  iva: 42.00,
  total: 242.00,
  metodo_pago: "T",
  estado: "borrador",
  lineas: [
    {
      descripcion: "Cambio de aceite",
      cantidad: 1,
      precioUnitario: 200.00
    }
  ]
}

Respuesta:
{
  success: true,
  id: "uuid",
  numero_factura: "FA001"
}
```

### Generar Verifactu
```bash
POST /api/facturas/generar-verifactu

Body:
{
  facturaId: "uuid",
  tallerId: "uuid",
  numeroFactura: "FA001",
  serieFactura: "FA",
  fechaEmision: "2024-10-30",
  nifEmisor: "12345678A",
  nombreEmisor: "Mi Taller",
  nifReceptor: "87654321B",
  nombreReceptor: "Cliente",
  baseImponible: 200.00,
  cuotaRepercutida: 42.00,
  descripcion: "Cambio de aceite",
  formaPago: "T"
}

Respuesta:
{
  success: true,
  verifactu: {
    numeroVerificacion: "2410301234FA001",
    hash: "A1B2C3D4E5F6...",
    qr: "2410301234FA001|...",
    qrBase64: "iVBORw0KGgo...",
    urlVerificacion: "https://www.aeat.es/verifactu?...",
    estado: "generado"
  }
}
```

### Actualizar Factura
```bash
PUT /api/facturas/actualizar?id=[FACTURA_ID]

Body (cualquier campo):
{
  estado: "emitida",
  metodo_pago: "T",
  notas: "Nota interna",
  condiciones_pago: "Pago a 30 días"
}

Respuesta:
{
  success: true,
  factura: { ... datos actualizados ... }
}
```

### Eliminar Factura
```bash
DELETE /api/facturas/eliminar?id=[FACTURA_ID]

Respuesta:
{
  success: true
}

Nota: Solo se pueden eliminar facturas en estado "borrador"
```

---

## 📊 Estructura de Datos

### Tabla: facturas
```sql
id (UUID)
taller_id (UUID) - FK talleres
numero_factura (VARCHAR) - "FA001"
numero_serie (VARCHAR) - "FA"
fecha_emision (DATE)
fecha_vencimiento (DATE)
base_imponible (DECIMAL)
iva (DECIMAL)
total (DECIMAL)
iva_porcentaje (DECIMAL) - 21
estado (VARCHAR) - borrador|emitida|pagada|anulada
metodo_pago (VARCHAR) - T|E|A|O
cliente_id (UUID) - FK clientes
notas (TEXT)
condiciones_pago (TEXT)
pdf_url (TEXT)

// Verifactu
numero_verifactu (VARCHAR)
verifactu_hash (TEXT)
verifactu_hash_encadenado (TEXT)
verifactu_qr (TEXT)
verifactu_qr_base64 (TEXT)
verifactu_xml (TEXT)
verifactu_firma_hmac (TEXT)
verifactu_qr_url (TEXT)
verifactu_estado (VARCHAR)
verifactu_respuesta_aeat (JSONB)

created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### Tabla: lineas_factura
```sql
id (UUID)
factura_id (UUID) - FK facturas
descripcion (TEXT)
cantidad (DECIMAL)
precio_unitario (DECIMAL)
created_at (TIMESTAMP)
```

---

## 🎨 Componentes Disponibles

### QRVerifactu
```tsx
import { QRVerifactu } from '@/components/facturas/qr-verifactu'

<QRVerifactu
  nifEmisor="12345678A"
  numeroFactura="FA001"
  numeroVerificacion="2410301234FA001"
  urlVerificacion="https://www.aeat.es/verifactu?..."
  qrData="2410301234FA001|..."
/>
```

### InformacionLegal
```tsx
import { InformacionLegal } from '@/components/facturas/informacion-legal'

<InformacionLegal
  nifEmisor="12345678A"
  nombreEmisor="Mi Taller"
  // ... más props
/>
```

### CambiarEstado
```tsx
import { CambiarEstado } from '@/components/facturas/cambiar-estado'

<CambiarEstado
  facturaId="uuid"
  estadoActual="borrador"
  onEstadoActualizado={(estado) => console.log(estado)}
/>
```

---

## ⚙️ Configuración

### Variables de Entorno
```env
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### Instalación de Dependencias
```bash
npm install qrcode
npm install sonner
npm install lucide-react
```

---

## 🔒 Seguridad

### Autenticación
- ✅ Solo usuarios autenticados pueden acceder
- ✅ RLS en Supabase por taller_id

### Autorización
- ✅ Solo ver facturas del taller propio
- ✅ Solo administradores pueden cambiar estados
- ✅ Auditoría de cambios automática

### Datos Sensibles
- ✅ NIFs almacenados de forma segura
- ✅ Sin mostrar información innecesaria
- ✅ PDFs servidos con headers de seguridad

---

## 📱 Responsive Design

- ✅ Totalmente responsive
- ✅ Diseño mobile-first
- ✅ Accesible desde tabletas y móviles
- ✅ Botones grandes y clickeables

---

## 🚀 Próximas Mejoras

### En Desarrollo
- [ ] Generación de PDF automático
- [ ] Envío por email
- [ ] Integración con certificado digital real
- [ ] Envío directo a AEAT (Verifactu automático)
- [ ] Exportación a contabilidad
- [ ] Recordatorios de pago

### Futuro
- [ ] Pagos en línea
- [ ] Portal del cliente
- [ ] Descuentos y promociones
- [ ] Facturas recurrentes
- [ ] Informes avanzados

---

## 📞 Soporte

Para dudas sobre:
- **Normativa**: Consultar `/src/lib/verifactu/NORMATIVA_REFERENCIAS.md`
- **Código**: Revisar comentarios en los archivos
- **Errores**: Revisar logs en consola del navegador

