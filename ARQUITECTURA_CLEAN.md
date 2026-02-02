# 🏗️ Arquitectura Clean - Módulo de Órdenes

## 📋 **Tabla de Contenidos**

1. [Introducción](#introducción)
2. [Estructura de Carpetas](#estructura-de-carpetas)
3. [Capas de la Arquitectura](#capas-de-la-arquitectura)
4. [Cómo Usar](#cómo-usar)
5. [Ejemplos de Uso](#ejemplos-de-uso)
6. [Seguridad Multi-Tenant](#seguridad-multi-tenant)
7. [Testing](#testing)
8. [Migración de Código Legacy](#migración-de-código-legacy)

---

## 🎯 **Introducción**

Este módulo implementa **Clean Architecture** con los siguientes principios:

- ✅ **Zero Hardcoding**: Reglas de negocio en el dominio, no en el código
- ✅ **Tipado Estricto**: Sin `any`, todo tipado con interfaces o Value Objects
- ✅ **Inversión de Dependencias**: Los casos de uso dependen de interfaces, no de implementaciones
- ✅ **Multi-Tenancy**: Seguridad RLS en todas las consultas
- ✅ **Fácil de Testear**: Inyección de dependencias en todos los niveles

---

## 📁 **Estructura de Carpetas**

```
src/
├── domain/                    # ❤️ Corazón del negocio (sin dependencias)
│   ├── entities/              # Objetos de negocio con lógica
│   │   ├── Orden.entity.ts
│   │   └── LineaOrden.entity.ts
│   ├── value-objects/         # Objetos inmutables con validación
│   │   ├── Precio.vo.ts
│   │   ├── Email.vo.ts
│   │   ├── Matricula.vo.ts
│   │   ├── Telefono.vo.ts
│   │   └── Kilometraje.vo.ts
│   ├── logic/                 # Funciones puras (sin efectos secundarios)
│   │   ├── calcular-iva.ts
│   │   └── generar-numero-orden.ts
│   ├── types/                 # Enums y tipos de dominio
│   │   └── index.ts
│   └── errors/                # Errores de dominio
│       ├── AppError.ts
│       └── DomainErrors.ts
│
├── application/               # 🎯 Casos de uso (orchestration)
│   ├── use-cases/
│   │   └── ordenes/
│   │       ├── crear-orden.use-case.ts
│   │       ├── actualizar-orden.use-case.ts
│   │       ├── listar-ordenes.use-case.ts
│   │       ├── obtener-orden.use-case.ts
│   │       ├── cambiar-estado-orden.use-case.ts
│   │       └── eliminar-orden.use-case.ts
│   ├── dtos/                  # Data Transfer Objects (validación Zod)
│   │   └── orden.dto.ts
│   └── ports/                 # Interfaces (contratos)
│       └── orden.repository.interface.ts
│
└── infrastructure/            # 🔧 Implementaciones concretas
    ├── repositories/
    │   └── supabase/
    │       ├── orden.repository.ts
    │       └── orden.mapper.ts
    └── errors/
        ├── InfrastructureErrors.ts
        └── SupabaseErrorMapper.ts
```

---

## 🎨 **Capas de la Arquitectura**

### **1. Domain Layer** (Sin dependencias externas)

**Entidades:**
```typescript
import { OrdenEntity } from '@/domain/entities'

// Crear una orden (valida automáticamente)
const orden = OrdenEntity.create({
  id: '123',
  tallerId: 'taller-1',
  clienteId: 'cliente-1',
  vehiculoId: 'vehiculo-1',
  estado: EstadoOrden.RECIBIDO,
  lineas: [],
  // ...
})

// Lógica de negocio embebida
const total = orden.calcularTotal() // Precio
const puedeFacturarse = orden.puedeFacturarse() // boolean
```

**Value Objects:**
```typescript
import { Precio, Email, Matricula } from '@/domain/value-objects'

// Precio con validación
const precio = Precio.create(100.50) // ✅ OK
const precioInvalido = Precio.create(-10) // ❌ Lanza ValidationError

// Email con validación
const email = Email.create('user@example.com') // ✅ OK
const emailInvalido = Email.create('invalid') // ❌ Lanza ValidationError

// Matrícula con validación y normalización
const matricula = Matricula.create('1234ABC') // → "1234-ABC"
```

**Domain Logic:**
```typescript
import { calcularIVA, generarNumeroOrden } from '@/domain/logic'

// Cálculo de IVA (función pura)
const base = Precio.create(100)
const iva = calcularIVA(base, IVA_ESTANDAR) // 21€

// Generar número de orden
const numero = generarNumeroOrden(2026, 123) // "ORD-2026-000123"
```

---

### **2. Application Layer** (Orquestación)

**Use Cases:**
```typescript
import { CrearOrdenUseCase } from '@/application/use-cases'
import { SupabaseOrdenRepository } from '@/infrastructure/repositories'

// Crear el repositorio
const repository = new SupabaseOrdenRepository()

// Crear el caso de uso (inyección de dependencias)
const crearOrden = new CrearOrdenUseCase(repository)

// Ejecutar
const ordenDTO = await crearOrden.execute(
  {
    clienteId: 'cliente-1',
    vehiculoId: 'vehiculo-1',
    lineas: [
      {
        tipo: TipoLinea.MANO_OBRA,
        descripcion: 'Cambio de aceite',
        cantidad: 1,
        precioUnitario: 50
      }
    ]
  },
  'taller-1',
  'user-1'
)
```

---

### **3. Infrastructure Layer** (Implementaciones)

**Repository:**
```typescript
import { SupabaseOrdenRepository } from '@/infrastructure/repositories'

const repository = new SupabaseOrdenRepository()

// Todas las consultas incluyen filtro de seguridad (tallerId)
const orden = await repository.obtenerPorId('orden-1', 'taller-1')
const ordenes = await repository.listar(
  { estado: EstadoOrden.EN_PROGRESO },
  { page: 1, pageSize: 20 },
  'taller-1'
)
```

---

## 🚀 **Cómo Usar**

### **1. Instalación de Dependencias**

Las únicas dependencias nuevas son:
- `zod` (ya está instalado) - Para validación de DTOs

### **2. Ejecutar SQL RLS en Supabase**

```bash
# Copiar el contenido del archivo y ejecutar en el SQL Editor de Supabase
cat supabase/migrations/rls_ordenes_seguridad_multi_tenant.sql
```

### **3. Usar en un Server Action (Next.js)**

```typescript
// app/actions/ordenes.ts
'use server'

import { CrearOrdenUseCase } from '@/application/use-cases'
import { SupabaseOrdenRepository } from '@/infrastructure/repositories'
import { createClient } from '@/lib/supabase/server'

export async function crearOrden(data: CrearOrdenDTO) {
  // 1. Obtener usuario autenticado
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('No autenticado')
  }

  // 2. Obtener taller_id del usuario
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('taller_id')
    .eq('id', user.id)
    .single()

  if (!usuario?.taller_id) {
    throw new Error('Usuario sin taller asignado')
  }

  // 3. Ejecutar caso de uso
  const repository = new SupabaseOrdenRepository()
  const useCase = new CrearOrdenUseCase(repository)

  return await useCase.execute(data, usuario.taller_id, user.id)
}
```

### **4. Usar en un API Route**

```typescript
// app/api/ordenes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { ListarOrdenesUseCase } from '@/application/use-cases'
import { SupabaseOrdenRepository } from '@/infrastructure/repositories'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // Autenticación
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Obtener taller_id
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('taller_id')
      .eq('id', user.id)
      .single()

    // Parsear filtros de query params
    const searchParams = request.nextUrl.searchParams
    const filtros = {
      estado: searchParams.get('estado'),
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '20')
    }

    // Ejecutar caso de uso
    const repository = new SupabaseOrdenRepository()
    const useCase = new ListarOrdenesUseCase(repository)
    const resultado = await useCase.execute(filtros, usuario.taller_id)

    return NextResponse.json(resultado)
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
```

---

## 🔒 **Seguridad Multi-Tenant**

**Todas las consultas incluyen filtro automático por `taller_id`:**

```typescript
// ✅ CORRECTO: Siempre pasar tallerId
const orden = await repository.obtenerPorId(ordenId, tallerId)

// ❌ INCORRECTO: Nunca omitir tallerId
// const orden = await repository.obtenerPorId(ordenId) // NO COMPILA
```

**RLS en Supabase garantiza seguridad adicional:**
- Aunque olvides pasar el `tallerId` en código, RLS lo filtra automáticamente
- Un taller NUNCA puede ver datos de otro taller, incluso si hackean el cliente

---

## 🧪 **Testing**

### **Test de Value Objects**

```typescript
import { Precio } from '@/domain/value-objects'
import { ValidationError } from '@/domain/errors'

describe('Precio', () => {
  it('debe crear un precio válido', () => {
    const precio = Precio.create(100)
    expect(precio.valor).toBe(100)
  })

  it('debe lanzar error con precio negativo', () => {
    expect(() => Precio.create(-10)).toThrow(ValidationError)
  })

  it('debe formatear correctamente', () => {
    const precio = Precio.create(100.50)
    expect(precio.format()).toBe('100,50 €')
  })
})
```

### **Test de Entities**

```typescript
import { OrdenEntity } from '@/domain/entities'
import { EstadoOrden } from '@/domain/types'

describe('OrdenEntity', () => {
  it('debe calcular el total correctamente', () => {
    const orden = OrdenEntity.create({
      // ... datos
      lineas: [
        // ... líneas
      ]
    })

    const total = orden.calcularTotal()
    expect(total.valor).toBe(121) // 100 + 21% IVA
  })

  it('no debe permitir facturar orden sin líneas', () => {
    const orden = OrdenEntity.create({
      // ... sin líneas
      lineas: []
    })

    expect(orden.puedeFacturarse()).toBe(false)
  })
})
```

### **Test de Use Cases**

```typescript
import { CrearOrdenUseCase } from '@/application/use-cases'
import { IOrdenRepository } from '@/application/ports'

// Mock del repositorio
const mockRepository: IOrdenRepository = {
  crear: jest.fn(),
  obtenerPorId: jest.fn(),
  // ... resto de métodos
}

describe('CrearOrdenUseCase', () => {
  it('debe crear una orden correctamente', async () => {
    const useCase = new CrearOrdenUseCase(mockRepository)

    const resultado = await useCase.execute(
      {
        clienteId: 'cliente-1',
        vehiculoId: 'vehiculo-1',
        lineas: []
      },
      'taller-1',
      'user-1'
    )

    expect(mockRepository.crear).toHaveBeenCalled()
    expect(resultado.id).toBeDefined()
  })
})
```

---

## 🔄 **Migración de Código Legacy**

### **Antes (Legacy):**

```typescript
// ❌ Código monolítico con lógica mezclada
async function crearOrden(data: any) {
  const supabase = createClient()

  // Cálculo hardcodeado
  const iva = data.subtotal * 0.21
  const total = data.subtotal + iva

  // Sin validación
  const { data: orden, error } = await supabase
    .from('ordenes_reparacion')
    .insert({
      ...data,
      iva_amount: iva,
      total_con_iva: total
    })

  if (error) throw new Error(error.message)

  return orden
}
```

### **Después (Clean Architecture):**

```typescript
// ✅ Código atómico, separado por responsabilidades
const repository = new SupabaseOrdenRepository()
const useCase = new CrearOrdenUseCase(repository)

const ordenDTO = await useCase.execute(data, tallerId, userId)

// La lógica de IVA está en domain/logic/calcular-iva.ts
// La validación está en application/dtos/orden.dto.ts
// El mapeo está en infrastructure/repositories/supabase/orden.mapper.ts
```

---

## 🎓 **Ventajas de Esta Arquitectura**

1. **Cambiar BD es fácil**: Solo cambias la implementación del repository
2. **Testing es trivial**: Mocks de interfaces, no de BD
3. **Lógica reutilizable**: Value Objects y Domain Logic se usan en toda la app
4. **Zero bugs de tipado**: Sin `any`, todo fuertemente tipado
5. **Reglas de negocio claras**: Están en las entities, no esparcidas
6. **Seguridad garantizada**: Multi-tenancy en todas las capas

---

## 📚 **Próximos Módulos a Refactorizar**

- [ ] Facturas (similar a Órdenes)
- [ ] Clientes (más simple)
- [ ] Vehículos (más simple)
- [ ] Inventario (con lógica de stock)

---

## 🆘 **Soporte**

Si tienes dudas o necesitas ayuda con la implementación, revisa los ejemplos en:
- `src/domain/entities/Orden.entity.ts` - Ejemplo de entity completa
- `src/application/use-cases/ordenes/crear-orden.use-case.ts` - Ejemplo de use case
- `src/infrastructure/repositories/supabase/orden.repository.ts` - Ejemplo de repository

**Recuerda:** Cada capa tiene una única responsabilidad. Si algo está en el lugar correcto, será fácil de entender y modificar.
