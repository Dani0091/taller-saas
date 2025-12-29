# NORMATIVA Y REFERENCIAS - SISTEMA DE FACTURAS VERIFACTU

## 📋 Legislación Aplicable

### Real Decreto 1619/2012
- **Fecha**: 30 de noviembre de 2012
- **Contenido**: Regulación de la facturación electrónica
- **Aplicable a**: Todas las empresas en transacciones B2B

### Orden HAP/492/2017
- **Fecha**: 25 de mayo de 2017
- **Contenido**: Desarrollo de requisitos técnicos de facturación electrónica
- **Requisitos clave**:
  - Firma digital o código seguro
  - Integridad del contenido
  - Autenticidad del origen
  - Conservación de facturas

### Real Decreto 596/2016
- **Contenido**: Régimen de IVA intracomunitario
- **Aplicable**: Transacciones dentro de UE

### Resolución de 29 de enero de 2016 de la AEAT
- **Contenido**: Procedimiento de entrega de facturas electrónicas
- **Especificaciones técnicas**: Formato XML

### Verifactu (2024-2025)
- **Entrada en vigor**: 
  - Obligatorio desde enero 2024 para empresas > 3.600.000€/año
  - Extensión gradual hasta 2025 (todas las empresas)
- **Requisito**: Registro telemático de facturas ante AEAT
- **Datos mínimos**: NIF, número, fecha, base, cuota IVA

## 🔐 Datos Obligatorios en Factura

### Del Emisor (Empresa/Taller)
- [x] Nombre o razón social
- [x] NIF/CIF
- [x] Domicilio
- [x] Número de régimen especial (si aplica)

### Del Receptor (Cliente)
- [x] Nombre o razón social
- [x] NIF/CIF
- [x] Domicilio (opcional en facturas simplificadas)

### De la Factura
- [x] Número secuencial único
- [x] Serie (ej: FA, PR)
- [x] Fecha de emisión
- [x] Descripción de servicios/productos
- [x] Cantidad y precio unitario
- [x] Base imponible
- [x] Porcentaje y cuota de IVA
- [x] Total a pagar

### Control y Auditoría
- [x] Número de factura secuencial
- [x] Fecha de expedición
- [x] Identificación del ordenador/dispositivo (si aplica)
- [x] Firma digital (si se requiere)

## 💰 IVA en España

### Tipos de IVA Vigentes (2024-2025)
- **General**: 21% (Aplicado en este sistema)
- **Reducido**: 10% (Alimentación básica, libros, etc.)
- **Super reducido**: 4% (Medicamentos, productos de primera necesidad)
- **Exento**: 0% (Exportaciones, servicios financieros)

### Gestión de IVA en Facturas
```
Base Imponible = Σ(cantidad × precio_unitario)
IVA = Base Imponible × 21%
Total = Base Imponible + IVA
```

## 🔗 Verifactu - Detalles Técnicos

### Componentes de Verifactu

#### 1. Número de Verificación (13 dígitos)
```
Formato: AAMMDDXXXNNNNN
- AA: Año (últimos 2 dígitos)
- MM: Mes (01-12)
- DD: Día (01-31)
- XXX: 3 dígitos aleatorios
- NNNNN: Últimos 5 dígitos del número de factura
```

#### 2. Hash SHA-256 (Encadenado)
```
Hash = SHA256(
  NIF_Emisor || 
  Número_Factura || 
  Fecha || 
  Base_Imponible || 
  Cuota_IVA || 
  NIF_Receptor || 
  Hash_Anterior
)
```
**Objetivo**: Garantizar trazabilidad e imposibilidad de modificación

#### 3. Código QR
```
Datos del QR: NIF|Número|Serie|Fecha|Base|IVA|NIF_Receptor|Verificación
Formato: Separado por pipes (|)
Codificación: UTF-8
Corrección de errores: Nivel H (30% de recuperación)
```

#### 4. Firma HMAC-SHA256
```
HMAC = HMAC-SHA256(
  clave_firma,
  NIF_Emisor || Número || Verificación || Base || IVA
)
```
**Nota**: Requiere certificado digital (pendiente de integración)

#### 5. XML de Registro
- Estructura según esquema XSD de AEAT
- Incluye metadatos completos
- Firmado digitalmente (cuando sea aplicable)

## 🌐 URLs y Portales

### Portal AEAT
- **URL**: https://www.aeat.es/
- **Verifactu**: https://www.aeat.es/verifactu
- **Verificación de facturas**: https://www.aeat.es/verifactu?verificacion=[CÓDIGO]

### Servicios Electrónicos AEAT
- **Presentación telemática**: https://www.sede.agenciatributaria.gob.es/
- **Certificados digitales**: https://www.sede.agenciatributaria.gob.es/

## 📝 Conservación de Facturas

### Período de Conservación
- **Mínimo**: 4 años desde la fecha de expedición
- **Obligatorio**: Conservar en formato digital o papel

### Formato de Conservación
- Original digital (PDF, XML, imagen)
- Metadatos intactos
- Firma digital (si aplica)
- Accesible y legible

## ⚠️ Infracciones y Sanciones

### Obligaciones Incumplidas
- **No emitir factura**: 600€ a 3.600€
- **Información incompleta**: 300€ a 3.000€
- **No registrar en Verifactu**: 600€ a 5.000€
- **Falsedad de datos**: Hasta 10.000€ + posibles penas penales

### Delitos Fiscales
- Facturación falsa: Penas de cárcel 1-5 años
- Defraudación: Multas del 150% al 300% de lo defraudado

## ✅ Checklist de Cumplimiento

- [x] Datos emisor completos y verificables
- [x] Datos receptor: NIF obligatorio
- [x] Número de factura secuencial sin huecos
- [x] Fecha de expedición real
- [x] Descripción clara de servicios
- [x] Base imponible y cuotas correctas
- [x] IVA desglosado por tipo
- [x] Total correcto (Base + IVA)
- [x] Verifactu generado (si aplica)
- [x] QR verificable en AEAT
- [x] Conservación segura > 4 años
- [x] Registros de auditoría

## 🔗 Recursos Adicionales

### Documentación Oficial
- [AEAT - Facturación Electrónica](https://www.aeat.es/)
- [RD 1619/2012 BOE](https://www.boe.es/)
- [Orden HAP/492/2017 BOE](https://www.boe.es/)

### Herramientas
- Validador XML: https://www.w3schools.com/xml/
- Verificador QR: https://www.aeat.es/verifactu
- Calculadora IVA: https://www.aeat.es/

### Contacto AEAT
- **Teléfono**: +34 91 595 92 00
- **Email**: consultas@aeat.es
- **Atención**: Lunes-Viernes 9:00-14:00

---

**Última actualización**: Octubre 2025
**Versión**: 1.0
**Cumplimiento**: España - Normativa fiscal vigente
