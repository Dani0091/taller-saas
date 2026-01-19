# 🚨 GUÍA DE ERRORES - SISTEMA DE FACTURACIÓN

## 📋 TABLA DE CONTENIDOS
1. [Errores Comunes](#errores-comunes)
2. [Cómo Leer los Logs](#cómo-leer-los-logs)
3. [Debugging Paso a Paso](#debugging-paso-a-paso)
4. [Soluciones Rápidas](#soluciones-rápidas)

---

## ✅ ERRORES COMUNES Y SOLUCIONES

### 1️⃣ ERROR: "Ya existe una factura con el número JSXXX"
**Código:** 23505 (Duplicate key)

**¿Por qué pasa?**
- Creaste dos facturas muy seguidas
- La numeración de la serie no se actualizó correctamente
- Hay un problema de sincronización

**SOLUCIÓN:**
```
✅ OPCIÓN 1 (Más común):
1. Espera 5 segundos
2. Intenta crear la factura de nuevo
3. El sistema se habrá auto-corregido

✅ OPCIÓN 2:
1. Ve a Configuración → Facturas
2. Busca la serie (ej: "JS")
3. Verifica que el "Último número" esté correcto
4. Si es 007, la siguiente factura será JS008

✅ OPCIÓN 3 (Soporte):
Contacta indicando:
- Número de factura: JSXXX
- Serie: JS
- Orden ID: xxx-xxx-xxx
```

---

### 2️⃣ ERROR: "Ya existe una factura para esta orden"
**No es un error técnico, es una protección**

**¿Por qué pasa?**
Ya generaste una factura para esta orden previamente.

**SOLUCIÓN:**
```
✅ Si quieres editar la factura:
1. Ve a la sección "Facturas"
2. Busca la factura por número
3. Edítala desde ahí

✅ Si quieres eliminar y recrear:
1. Elimina la factura existente primero
2. Luego crea una nueva desde la orden
```

---

### 3️⃣ ERROR: "Orden sin cliente"

**¿Por qué pasa?**
La orden no tiene un cliente asignado.

**SOLUCIÓN:**
```
1. Ve a la orden
2. Click en "Editar"
3. Asigna un cliente en el campo "Cliente"
4. Guarda la orden
5. Intenta facturar de nuevo
```

---

### 4️⃣ ERROR: "No se pudo obtener la configuración del taller"

**¿Por qué pasa?**
Falta configuración básica del taller.

**SOLUCIÓN:**
```
1. Ve a Configuración → Datos del Taller
2. Completa al menos:
   - Serie de factura (ej: "FA", "JS", "SR")
   - Porcentaje de IVA (normalmente 21)
3. Guarda la configuración
4. Intenta facturar de nuevo
```

---

### 5️⃣ ERROR: "Error de relación: Datos vinculados no encontrados"
**Código:** 23503 (Foreign key violation)

**¿Por qué pasa?**
- El cliente de la orden fue eliminado
- Hay problemas de integridad en la base de datos

**SOLUCIÓN:**
```
1. Verifica que el cliente exista:
   - Ve a Clientes
   - Busca el cliente por nombre
   - Si no existe, recréalo

2. Si el cliente existe:
   - Edita la orden
   - Vuelve a seleccionar el cliente
   - Guarda
   - Intenta facturar de nuevo
```

---

### 6️⃣ ERROR: "Formato de datos inválido"
**Código:** 22P02

**¿Por qué pasa?**
Hay datos con formato incorrecto (texto donde va número, etc.)

**SOLUCIÓN:**
```
1. Verifica en la orden:
   - Precios unitarios (deben ser números)
   - Cantidades (deben ser números)
   - IVA (debe ser número)

2. Edita la orden y corrige valores inválidos

3. Intenta facturar de nuevo
```

---

### 7️⃣ ERROR: "La orden debe estar aprobada o completada"

**¿Por qué pasa?**
La orden está en estado "borrador" o "presupuesto".

**SOLUCIÓN:**
```
1. Ve a la orden
2. Cambia el estado a:
   - "Aprobado" o
   - "En reparación" o
   - "Completado" o
   - "Entregado"
3. Intenta facturar de nuevo
```

---

## 🔍 CÓMO LEER LOS LOGS EN RAILWAY

Los logs siguen este formato:

```
🚀 Iniciando creación de factura
   - Orden ID: xxx
   - Taller ID: yyy

📋 Obteniendo configuración del taller...
✅ Configuración obtenida: Serie=JS, IVA=21%

📦 Obteniendo orden xxx...
✅ Orden encontrada: ORD-001
   - Cliente: Juan Pérez
   - Estado: completado

🔍 Verificando si ya existe factura...
✅ No existe factura previa, procediendo...

💾 Creando factura JS008...
   - Base imponible: 100.00€
   - IVA (21%): 21.00€
   - Total: 121.00€

✅ ¡FACTURA CREADA EXITOSAMENTE!
   - Número: JS008
   - Cliente: Juan Pérez
   - Total: 121.00€
   - Líneas: 3
```

**Si hay error:**
```
❌ Error al crear factura: [detalles del error]
⚠️  SUGERENCIA: [pasos a seguir]
```

---

## 🛠️ DEBUGGING PASO A PASO

### Si una factura falla, sigue estos pasos:

1. **Ve a Railway → Logs**
2. **Busca el emoji 🚀** (inicio del proceso)
3. **Lee todos los logs hasta encontrar ❌**
4. **El mensaje después del ❌ te dirá exactamente qué falló**
5. **Sigue la SUGERENCIA que aparece**

### Ejemplo de debugging:

```
🚀 Iniciando creación de factura
   - Orden ID: abc-123

📋 Obteniendo configuración del taller...
✅ Configuración obtenida: Serie=JS, IVA=21%

📦 Obteniendo orden abc-123...
❌ Orden no encontrada: null

SUGERENCIA: Verifica que la orden exista...
```

**Diagnóstico:** La orden no existe o fue eliminada.
**Solución:** Verifica el ID de la orden.

---

## ⚡ SOLUCIONES RÁPIDAS

### Problema: "Las facturas se duplican"
```
CAUSA: Creación muy rápida de facturas
SOLUCIÓN: Espera 2-3 segundos entre cada factura
```

### Problema: "Los números se saltan (JS007 → JS009)"
```
CAUSA: Una factura falló pero ya había reservado el número
SOLUCIÓN: Es NORMAL y LEGAL. Los números pueden tener huecos.
```

### Problema: "No puedo facturar ninguna orden"
```
VERIFICA EN ORDEN:
1. ¿Tiene cliente asignado?
2. ¿El estado es válido? (no puede ser "borrador")
3. ¿Tiene líneas de trabajo?

VERIFICA EN CONFIGURACIÓN:
1. ¿Hay serie de factura configurada?
2. ¿El IVA está configurado?
```

### Problema: "Error 500 sin mensaje claro"
```
1. Mira los logs en Railway
2. Busca el mensaje después del ❌
3. Si no hay claridad, contacta con soporte con:
   - Hora exacta del error
   - Orden ID
   - Captura del error en consola (F12)
```

---

## 📞 CONTACTO CON SOPORTE

Si ninguna solución funciona, contacta proporcionando:

```
1. Hora exacta del error (con zona horaria)
2. Orden ID que intentabas facturar
3. Serie de facturación que usas
4. Logs de Railway (copia desde 🚀 hasta ❌)
5. Captura de pantalla del error en navegador
```

---

## ✅ CHECKLIST ANTES DE FACTURAR

Antes de crear una factura, verifica:

- [ ] La orden tiene cliente asignado
- [ ] La orden tiene líneas de trabajo
- [ ] El estado de la orden es válido (no "borrador")
- [ ] No existe ya una factura para esta orden
- [ ] La configuración del taller está completa
- [ ] La serie de facturación existe

Si todo está ✅, la factura se creará sin problemas.

---

## 🎯 RESUMEN DE CÓDIGOS DE ERROR

| Código | Nombre | Significado | Solución |
|--------|--------|-------------|----------|
| 23505 | Duplicate key | Número ya existe | Espera 5s y reintenta |
| 23503 | Foreign key | Dato vinculado no existe | Verifica cliente existe |
| 22P02 | Invalid format | Formato de dato malo | Corrige valores en orden |
| 404 | Not found | Orden no encontrada | Verifica ID de orden |
| 400 | Bad request | Validación fallida | Lee el mensaje de error |
| 500 | Internal error | Error inesperado | Contacta soporte con logs |

---

**Última actualización:** 2025-01-19
**Versión del sistema:** Con validaciones robustas
