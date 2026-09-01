# Clean Architecture TypeScript Practice

Practica breve de Clean Architecture en TypeScript. La aplicacion separa dominio, casos de uso, infraestructura HTTP, configuracion y composicion.

El arranque sigue este flujo:

```txt
config -> buildAppContext -> createContainer -> buildServer
```

## Flujo De Capas

Diagrama general, desde el punto de entrada hacia las capas internas:

```txt
main.ts
  |
  v
composition
  - config.ts
  - container.ts
  - environments/*
  - lifetimes.ts
  |
  v
infrastructure/http
  - server.ts
  - OrderController.ts
  - scope.ts
  |
  v
application
  - ApplicationServices.ts
  - AppContext.ts
  - use-cases/*
  - ports/*
  |
  v
domain
  - entities/*
  - value-objects/*
  - events/*
```

Regla principal: las dependencias apuntan hacia dentro. `domain` no conoce `application`, `infrastructure` ni `composition`. Los casos de uso dependen de puertos abstractos; las implementaciones concretas se eligen en `composition`.

## Instalacion

Requisitos:

- Node.js 22 o superior.
- npm.

Instalar dependencias:

```bash
npm install
```

Para una instalacion reproducible en CI o desde `package-lock.json`:

```bash
npm ci
```

## Ejecutar

```bash
npm run dev
```

Por defecto arranca en:

```txt
http://localhost:3000
```

Cada respuesta HTTP incluye un header `x-request-id`, generado por request.

## Variables De Entorno

La configuracion se lee desde `process.env` en `src/composition/config.ts`. Este proyecto no carga automaticamente ficheros `.env`; las variables se pasan al proceso desde la terminal o desde CI.

Variables soportadas:

| Variable | Valores | Defecto | Uso |
| --- | --- | --- | --- |
| `NODE_ENV` | `development`, `test`, `production` | `development` | Selecciona la composicion por entorno. |
| `DATABASE_URL` | URL valida | opcional | Reservada para adaptadores de BBDD reales. |
| `PRICING_BASE_URL` | URL valida | `http://localhost:4000` | Base URL para un futuro servicio de precios HTTP. |
| `USE_INMEMORY` | `true`, `false` | `true` en dev/test, `false` en production | Activa adaptadores en memoria. |
| `USE_MEMORY` | `true`, `false` | alias de `USE_INMEMORY` | Compatibilidad con el nombre anterior. |
| `USE_OUTBOX` | `true`, `false` | `false` en dev/test, `true` en production | Activa outbox cuando exista implementacion real. |
| `LOG_LEVEL` | `debug`, `info`, `warn`, `error`, `silent` | `debug` en dev, `silent` en test, `info` en production | Nivel de logs configurado por entorno. |
| `PRICING_TIMEOUT_MS` | numero entero positivo | `5000` en dev/test, `1000` en production | Timeout previsto para pricing externo. |
| `PORT` | numero entero positivo | `3000` | Puerto HTTP. |

Ejecutar con puerto personalizado:

```bash
PORT=4001 npm run dev
```

Ejecutar en modo test:

```bash
NODE_ENV=test npm test
```

Arrancar temporalmente en production usando memoria:

```bash
NODE_ENV=production USE_INMEMORY=true USE_OUTBOX=false npm run dev
```

Arrancar con `NODE_ENV=production` sin adaptadores reales falla de forma explicita:

```bash
NODE_ENV=production npm run dev
```

## URLs Operativas

### Crear Orden

```http
POST /orders
```

Ejemplo:

```bash
curl -i -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{"orderId":"order-1","customerId":"customer-1"}'
```

Respuesta:

```json
{
  "orderId": "order-1"
}
```

### Anadir Item A Una Orden

```http
POST /orders/:orderId/items
```

Ejemplo:

```bash
curl -i -X POST http://localhost:3000/orders/order-1/items \
  -H "Content-Type: application/json" \
  -d '{"sku":"LAPTOP-001","quantity":2}'
```

Respuesta:

```json
{
  "orderId": "order-1",
  "sku": "LAPTOP-001",
  "quantity": 2,
  "unitPrice": {
    "amount": 899.99,
    "currency": "EUR"
  },
  "totalPrice": {
    "amount": 1799.98,
    "currency": "EUR"
  },
  "addedAt": "2026-08-31T18:00:00.000Z"
}
```

El valor de `addedAt` es orientativo; en ejecucion real se genera con la fecha actual.

### Consultar Items De Una Orden

```http
GET /orders/:orderId/items
```

Ejemplo:

```bash
curl -i http://localhost:3000/orders/order-1/items
```

Respuesta:

```json
{
  "orderId": "order-1",
  "items": [
    {
      "sku": "LAPTOP-001",
      "quantity": 2,
      "unitPrice": {
        "amount": 899.99,
        "currency": "EUR"
      },
      "totalPrice": {
        "amount": 1799.98,
        "currency": "EUR"
      }
    }
  ],
  "totalPrice": {
    "amount": 1799.98,
    "currency": "EUR"
  }
}
```

## Validacion

```bash
npm run check
npm test
```
