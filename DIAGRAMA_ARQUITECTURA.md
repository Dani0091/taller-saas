# 🎨 Diagrama de Arquitectura Clean - Módulo de Órdenes

## 📊 **Visión General de Capas**

```mermaid
graph TB
    subgraph "🎨 Presentation Layer - Next.js"
        UI[Componentes React]
        SA[Server Actions]
        API[API Routes]
    end

    subgraph "🎯 Application Layer"
        UC1[CrearOrdenUseCase]
        UC2[ActualizarOrdenUseCase]
        UC3[ListarOrdenesUseCase]
        DTO[DTOs + Validación Zod]
        PORT[IOrdenRepository Interface]
    end

    subgraph "❤️ Domain Layer - Sin dependencias"
        ENT[Entities: OrdenEntity]
        VO[Value Objects: Precio Email]
        LOGIC[Domain Logic: calcularIVA]
        ERR[Domain Errors]
    end

    subgraph "🔧 Infrastructure Layer"
        REPO[SupabaseOrdenRepository]
        MAPPER[OrdenMapper]
        ERRMAP[SupabaseErrorMapper]
    end

    subgraph "💾 Database"
        SUPABASE[(Supabase PostgreSQL)]
        RLS[Row Level Security]
    end

    UI --> SA
    UI --> API
    SA --> UC1
    SA --> UC2
    API --> UC3
    UC1 --> PORT
    UC2 --> PORT
    UC3 --> PORT
    UC1 --> DTO
    UC2 --> DTO
    UC3 --> DTO
    PORT -.implementa.- REPO
    UC1 --> ENT
    UC2 --> ENT
    UC3 --> ENT
    ENT --> VO
    ENT --> LOGIC
    ENT --> ERR
    REPO --> MAPPER
    REPO --> SUPABASE
    REPO --> ERRMAP
    SUPABASE --> RLS
```

---

## 🔄 **Flujo de Creación de Orden**

```mermaid
sequenceDiagram
    actor Usuario
    participant UI as Componente React
    participant SA as Server Action
    participant UC as CrearOrdenUseCase
    participant ENT as OrdenEntity
    participant VO as Value Objects
    participant REPO as SupabaseRepository
    participant DB as Supabase

    Usuario->>UI: Completa formulario
    UI->>SA: crearOrden(data)
    SA->>SA: Validar autenticación
    SA->>SA: Obtener tallerId
    SA->>UC: execute(dto, tallerId, userId)

    UC->>UC: Validar DTO (Zod)
    UC->>REPO: obtenerUltimoNumeroOrden(tallerId)
    REPO->>DB: SELECT numero_orden WHERE taller_id
    DB-->>REPO: "ORD-2026-000122"
    REPO-->>UC: "ORD-2026-000122"

    UC->>UC: generarSiguienteNumero()
    UC->>VO: Precio.create(100)
    VO-->>UC: Precio{valor: 100}
    UC->>VO: Kilometraje.create(50000)
    VO-->>UC: Kilometraje{valor: 50000}

    UC->>ENT: OrdenEntity.create({...})
    ENT->>ENT: Validar reglas de negocio
    ENT-->>UC: OrdenEntity

    UC->>REPO: crear(orden, tallerId)
    REPO->>REPO: OrdenMapper.toPersistence(orden)
    REPO->>DB: INSERT INTO ordenes_reparacion
    DB->>DB: Verificar RLS (taller_id)
    DB-->>REPO: Orden insertada
    REPO->>DB: INSERT INTO lineas_orden
    DB-->>REPO: Líneas insertadas
    REPO->>DB: SELECT orden con líneas
    DB-->>REPO: Orden completa
    REPO->>REPO: OrdenMapper.toDomain(data)
    REPO-->>UC: OrdenEntity

    UC->>ENT: orden.toDTO()
    ENT-->>UC: OrdenResponseDTO
    UC-->>SA: OrdenResponseDTO
    SA-->>UI: { success: true, data: ... }
    UI->>Usuario: Mostrar orden creada
```

---

## 🧩 **Dependencias entre Capas**

```mermaid
graph LR
    subgraph "Regla: Las dependencias apuntan HACIA EL DOMINIO"
        PRES[Presentation] --> APP[Application]
        APP --> DOM[Domain]
        INFRA[Infrastructure] --> APP
        INFRA --> DOM
    end

    style DOM fill:#ff6b6b,stroke:#c92a2a
    style APP fill:#4dabf7,stroke:#1971c2
    style INFRA fill:#51cf66,stroke:#2f9e44
    style PRES fill:#ffd43b,stroke:#f59f00
```

**Explicación:**
- **Domain** no depende de nadie (capa más interna)
- **Application** depende solo de Domain
- **Infrastructure** implementa las interfaces de Application
- **Presentation** usa Application (no conoce Infrastructure directamente)

---

## 🔒 **Seguridad Multi-Tenant**

```mermaid
graph TB
    subgraph "Cliente 1 - Taller A"
        U1[Usuario A]
        JWT1[JWT: taller_id=A]
    end

    subgraph "Cliente 2 - Taller B"
        U2[Usuario B]
        JWT2[JWT: taller_id=B]
    end

    U1 --> JWT1
    U2 --> JWT2
    JWT1 --> RLS[Row Level Security]
    JWT2 --> RLS

    RLS --> FILT1[Filtro: taller_id = A]
    RLS --> FILT2[Filtro: taller_id = B]

    FILT1 --> ORDEN_A[(Órdenes Taller A)]
    FILT2 --> ORDEN_B[(Órdenes Taller B)]

    style ORDEN_A fill:#d4edda
    style ORDEN_B fill:#d4edda
    style RLS fill:#ff6b6b,stroke:#c92a2a,color:#fff
```

**Garantías:**
1. ✅ Usuario A NUNCA puede ver órdenes de Taller B
2. ✅ Filtro aplicado en BD (no solo en código)
3. ✅ Incluso si hackean el cliente, RLS protege

---

## 💡 **Value Objects - Validación en la Fuente**

```mermaid
graph TB
    INPUT[Input del usuario: -10 €]
    INPUT --> VO[Precio.create -10]
    VO --> VALID{¿Es válido?}
    VALID -->|No| ERR[❌ ValidationError]
    VALID -->|Sí| OK[✅ Precio{valor: 10}]

    INPUT2[Input del usuario: 100 €]
    INPUT2 --> VO2[Precio.create 100]
    VO2 --> VALID2{¿Es válido?}
    VALID2 -->|Sí| OK2[✅ Precio{valor: 100}]
    OK2 --> OPS[Operaciones: format, multiply, calcularIVA]

    style ERR fill:#ff6b6b
    style OK fill:#51cf66
    style OK2 fill:#51cf66
    style VO fill:#4dabf7
```

**Ventaja:** Si un precio llega a la entity, SIEMPRE es válido.

---

## 📦 **Repository Pattern - Inversión de Dependencias**

```mermaid
classDiagram
    class IOrdenRepository {
        <<interface>>
        +crear(orden, tallerId) OrdenEntity
        +obtenerPorId(id, tallerId) OrdenEntity
        +listar(filtros, paginacion, tallerId) ResultadoPaginado
    }

    class SupabaseOrdenRepository {
        +crear(orden, tallerId) OrdenEntity
        +obtenerPorId(id, tallerId) OrdenEntity
        +listar(filtros, paginacion, tallerId) ResultadoPaginado
    }

    class PostgreSQLOrdenRepository {
        +crear(orden, tallerId) OrdenEntity
        +obtenerPorId(id, tallerId) OrdenEntity
        +listar(filtros, paginacion, tallerId) ResultadoPaginado
    }

    class CrearOrdenUseCase {
        -repository: IOrdenRepository
        +execute(dto, tallerId) OrdenResponseDTO
    }

    IOrdenRepository <|.. SupabaseOrdenRepository : implementa
    IOrdenRepository <|.. PostgreSQLOrdenRepository : implementa
    CrearOrdenUseCase --> IOrdenRepository : depende de

    note for CrearOrdenUseCase "El Use Case NO conoce\nla implementación concreta.\nSolo conoce la interface."
```

**Ventaja:** Cambiar de Supabase a PostgreSQL directo = cambiar 1 clase, no 100.

---

## 🧪 **Testing - Fácil con Inyección de Dependencias**

```mermaid
graph TB
    subgraph "Testing"
        TEST[Test Suite]
        MOCK[Mock Repository]
    end

    subgraph "Producción"
        PROD[Aplicación Real]
        REAL[Supabase Repository]
    end

    TEST --> UC1[CrearOrdenUseCase]
    PROD --> UC2[CrearOrdenUseCase]

    UC1 --> MOCK
    UC2 --> REAL

    MOCK --> ASSERT[Assertions: jest.fn]
    REAL --> DB[(Base de Datos)]

    style TEST fill:#4dabf7
    style MOCK fill:#51cf66
    style PROD fill:#ffd43b
    style REAL fill:#ff8787
```

**Ventaja:** No necesitas BD real para testear lógica de negocio.

---

## 🎯 **Ejemplo de Flujo Completo**

```mermaid
graph TD
    A[Usuario: "Quiero crear orden"] --> B[UI: Formulario]
    B --> C[Server Action: crearOrden]
    C --> D{¿Usuario autenticado?}
    D -->|No| E[❌ Error 401]
    D -->|Sí| F[Obtener tallerId del JWT]
    F --> G[Use Case: CrearOrdenUseCase]
    G --> H{¿DTO válido Zod?}
    H -->|No| I[❌ ValidationError 400]
    H -->|Sí| J[Crear Value Objects]
    J --> K[Crear OrdenEntity]
    K --> L{¿Reglas de negocio OK?}
    L -->|No| M[❌ BusinessRuleError 422]
    L -->|Sí| N[Repository: crear]
    N --> O{¿RLS permite?}
    O -->|No| P[❌ ForbiddenError 403]
    O -->|Sí| Q[INSERT en BD]
    Q --> R[Mapear a DTO]
    R --> S[✅ Retornar OrdenResponseDTO]
    S --> T[UI: Mostrar orden creada]

    style E fill:#ff6b6b
    style I fill:#ff6b6b
    style M fill:#ff6b6b
    style P fill:#ff6b6b
    style S fill:#51cf66
    style T fill:#51cf66
```

---

## 📚 **Comparación: Antes vs Después**

### **Antes (Monolito):**

```mermaid
graph TB
    UI[UI Component] --> MIX[Gran archivo con TODO]
    MIX --> MIX
    MIX --> DB[(Base de Datos)]

    style MIX fill:#ff6b6b,color:#fff
```

**Problemas:**
- 🔴 Lógica de negocio mezclada con BD
- 🔴 Difícil de testear
- 🔴 Cambiar BD = reescribir todo
- 🔴 Sin validación consistente

---

### **Después (Clean Architecture):**

```mermaid
graph TB
    UI[UI Component] --> UC[Use Case]
    UC --> ENT[Entity con lógica]
    UC --> REPO[Repository Interface]
    REPO -.implementa.- IMPL[Implementación]
    IMPL --> DB[(Base de Datos)]

    style ENT fill:#51cf66
    style UC fill:#4dabf7
    style REPO fill:#ffd43b
```

**Ventajas:**
- ✅ Lógica de negocio separada
- ✅ Fácil de testear (mocks)
- ✅ Cambiar BD = cambiar 1 archivo
- ✅ Validación en Value Objects

---

## 🎓 **Conclusión**

Esta arquitectura garantiza:

1. **Mantenibilidad**: Cada capa tiene una responsabilidad única
2. **Testabilidad**: Inyección de dependencias en todos los niveles
3. **Escalabilidad**: Agregar nuevos casos de uso no rompe lo existente
4. **Seguridad**: Multi-tenancy en todas las capas (código + RLS)
5. **Claridad**: El código se explica solo (Domain Language)

**Recuerda:** Las dependencias siempre apuntan HACIA el dominio, nunca al revés.
