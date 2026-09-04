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
  - adapterOptions.ts
  - config.ts
  - container.ts
  - environments/*
  - lifetimes.ts
  - OutboxWorkerCli.ts
  |
  v
infrastructure/http
  - server.ts
  - OrderController.ts
  - scope.ts
infrastructure/database
  - PostgresPoolFactory.ts
infrastructure/messaging
  - MessagingFactory.ts
  - DomainEventOutboxPublisher.ts
  - OutboxDispatcher.ts
infrastructure/observability
  - LoggerFactory.ts
  - PinoLogger.ts
  - NoopLogger.ts
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

Las operaciones de escritura se coordinan mediante el puerto `UnitOfWork`, de forma que los adaptadores reales puedan ejecutar repositorios dentro de una misma transaccion.

La composicion traduce `Config` a opciones explicitas de adaptador antes de instanciar infraestructura. `PostgresPoolFactory` crea y gestiona el pool PostgreSQL; `MessagingFactory` crea el publisher transaccional de eventos de dominio, el dispatcher y el worker de outbox; `LoggerFactory` crea el logger estructurado.

La observabilidad se expone mediante el puerto `Logger` en `application/ports`. La implementacion actual usa Pino en `infrastructure/observability`, con `NoopLogger` para escenarios donde no se quiera emitir logs.

## Casos De Uso

La capa de aplicacion expone casos de uso pequenos y orientados a una intencion concreta:

| Caso de uso | Entrada | Salida | Ruta HTTP |
| --- | --- | --- | --- |
| `CreateOrder` | `orderId`, `customerId` | `orderId` | `POST /orders` |
| `AddItemToOrder` | `orderId`, `sku`, `quantity` | Item anadido con precio unitario, total y fecha | `POST /orders/:orderId/items` |
| `ListOrders` | sin parametros | Listado de ordenes con `orderId`, `customerId` y `totalPrice` | `GET /orders` |
| `FindOrdersByCustomerId` | `customerId` | `customerId` y listado de ordenes con `orderId` y `totalPrice` | `GET /customers/:customerId/orders` |
| `GetOrderItems` | `orderId` | Items de la orden y total de la orden | `GET /orders/:orderId/items` |

## Requisitos Previos

- Node.js 22 o superior.
- npm.
- Docker instalado y en ejecucion, con Docker Compose disponible, si se quiere ejecutar PostgreSQL local mediante `npm run db:up`.
- PostgreSQL accesible, si se ejecuta con `USE_INMEMORY=false` sin usar Docker.

En Linux, el usuario que ejecuta los comandos debe tener permisos para usar Docker. Comprobarlo con:

```bash
docker ps
```

Si devuelve `permission denied while trying to connect to the docker API`, anadir el usuario al grupo `docker` y volver a iniciar sesion:

```bash
sudo usermod -aG docker "$USER"
newgrp docker
docker ps
```

Evita usar `sudo npm run db:up` salvo como solucion temporal, porque despues `npm run db:migrate` tambien necesitara acceder a Docker y puede fallar por permisos.

En Windows, para usar PostgreSQL con Docker:

- Instalar Docker Desktop.
- Activar el backend WSL 2 en Docker Desktop.
- Tener la virtualizacion habilitada en BIOS/UEFI.
- Arrancar Docker Desktop antes de ejecutar `npm run db:up`.
- Ejecutar los comandos desde PowerShell, Windows Terminal o una terminal WSL. Si se usa WSL, es recomendable trabajar con el proyecto dentro del filesystem Linux de WSL.

## Instalacion

Con los requisitos previos instalados, preparar dependencias:

```bash
npm install
```

Para una instalacion reproducible en CI o desde `package-lock.json`:

```bash
npm ci
```

La aplicacion puede ejecutarse en memoria o con PostgreSQL:

- Modo memoria: no necesita base de datos ni migraciones. Es el modo por defecto en `development` y `test`.
- Modo PostgreSQL: requiere `DATABASE_URL`, arrancar la base de datos y aplicar migraciones antes de levantar la aplicacion.

### Archivos De Entorno

La aplicacion puede arrancar en modo memoria sin crear `.env`; `src/composition/config.ts` aplica valores por defecto. Para usar PostgreSQL, se necesita configurar la conexion mediante `.env` o variables de entorno inline.

Ejemplo minimo de `.env` para PostgreSQL local:

```env
NODE_ENV=development
USE_INMEMORY=false
USE_OUTBOX=true
DATABASE_URL=postgres://postgres:postgres@localhost:5432/clean_architecture
```

Los comandos Docker usan `.env.db`. Este archivo es necesario para `npm run db:up`, `npm run db:down` y `npm run db:migrate`, porque los scripts invocan Docker Compose con `--env-file .env.db` y la migracion lee `POSTGRES_USER` y `POSTGRES_DB` desde ese archivo.

Ejemplo minimo de `.env.db`:

```env
POSTGRES_VERSION=16-alpine
POSTGRES_CONTAINER_NAME=clean-architecture-postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=clean_architecture
POSTGRES_PORT=5432
```

Arrancar PostgreSQL local:

```bash
npm run db:up
```

Aplicar migraciones:

```bash
npm run db:migrate
```

Ejecuta `npm run db:migrate` despues de arrancar la base de datos por primera vez y cada vez que haya cambios nuevos en `db/migrations`. La migracion `003_add_outbox.sql` crea la tabla `outbox` usada por el publisher transaccional de eventos de dominio.

## Ejecutar

```bash
npm run dev
```

Por defecto arranca en:

```txt
http://localhost:3000
```

Cada respuesta HTTP incluye un header `x-request-id`, generado por request.

Con `LOG_LEVEL=debug`, cada request HTTP registra metadata segura al recibirse y al completarse. No se registra el `body` completo. Los errores controlados de aplicacion, como validacion, no encontrado o conflicto, se registran con `warn`; los fallos de dependencias se registran con `error`.

Con `LOG_PRETTY=true`, la marca de tiempo se muestra con fecha corta local y hora, por ejemplo `[04/09/2026 10:07:46.328]`.

## Variables De Entorno

La configuracion de aplicacion se carga desde `.env` y `process.env` en `src/composition/config.ts`. Las variables presentes en `process.env` tienen prioridad sobre las definidas en `.env`.

El fichero `.env.db` se usa para Docker Compose y las migraciones de base de datos. No forma parte de la configuracion de aplicacion.

Variables soportadas:

| Variable | Valores | Defecto | Uso |
| --- | --- | --- | --- |
| `NODE_ENV` | `development`, `test`, `production` | `development` | Selecciona la composicion por entorno. |
| `DATABASE_URL` | URL valida | requerida con `USE_INMEMORY=false` | Conexion PostgreSQL para adaptadores de BBDD reales. |
| `DATABASE_POOL_MAX` | numero entero positivo | `10` | Numero maximo de conexiones abiertas en el pool PostgreSQL. |
| `DATABASE_IDLE_TIMEOUT_MS` | numero entero positivo | `30000` | Tiempo maximo de una conexion inactiva antes de cerrarla. |
| `DATABASE_CONNECTION_TIMEOUT_MS` | numero entero positivo | `2000` | Tiempo maximo esperando abrir una conexion antes de fallar. |
| `PRICING_BASE_URL` | URL valida | `http://localhost:4000` | Base URL para un futuro servicio de precios HTTP. |
| `USE_INMEMORY` | `true`, `false` | `true` en dev/test, `false` en production | Activa adaptadores en memoria. |
| `USE_MEMORY` | `true`, `false` | alias de `USE_INMEMORY` | Compatibilidad con el nombre anterior. |
| `USE_OUTBOX` | `true`, `false` | `false` en dev/test, `true` en production | Activa el outbox transaccional cuando se usan adaptadores PostgreSQL. |
| `OUTBOX_WORKER_MODE` | `once`, `loop` | `once` | Define si el worker procesa un lote y termina o queda consultando periodicamente. |
| `OUTBOX_POLL_INTERVAL_MS` | numero entero positivo | `5000` | Intervalo entre lotes cuando `OUTBOX_WORKER_MODE=loop`. |
| `OUTBOX_BATCH_SIZE` | numero entero positivo | `100` | Numero maximo de eventos pendientes que procesa cada lote del dispatcher. |
| `LOG_LEVEL` | `debug`, `info`, `warn`, `error`, `silent` | `debug` en dev, `silent` en test, `info` en production | Nivel de logs configurado por entorno. |
| `LOG_PRETTY` | `true`, `false` | `true` en dev, `false` en test/production | Activa salida de logs legible para desarrollo. |
| `PRICING_TIMEOUT_MS` | numero entero positivo | `5000` en dev/test, `1000` en production | Timeout previsto para pricing externo. |
| `PORT` | numero entero positivo | `3000` | Puerto HTTP. |

Ejecutar con puerto personalizado:

```bash
PORT=4001 npm run dev
```

Ejecutar con PostgreSQL sin outbox:

```bash
USE_INMEMORY=false USE_OUTBOX=false DATABASE_URL=postgres://postgres:postgres@localhost:5432/clean_architecture npm run dev
```

Ejecutar con PostgreSQL y outbox:

```bash
USE_INMEMORY=false USE_OUTBOX=true DATABASE_URL=postgres://postgres:postgres@localhost:5432/clean_architecture npm run dev
```

Despachar eventos pendientes del outbox:

```bash
USE_OUTBOX=true DATABASE_URL=postgres://postgres:postgres@localhost:5432/clean_architecture npm run worker:outbox
```

Despachar eventos pendientes en bucle cada segundo y con lotes de 50 eventos:

```bash
USE_OUTBOX=true OUTBOX_WORKER_MODE=loop OUTBOX_POLL_INTERVAL_MS=1000 OUTBOX_BATCH_SIZE=50 DATABASE_URL=postgres://postgres:postgres@localhost:5432/clean_architecture npm run worker:outbox
```

Ejecutar en modo test:

```bash
NODE_ENV=test npm test
```

Arrancar temporalmente en production usando memoria:

```bash
NODE_ENV=production USE_INMEMORY=true USE_OUTBOX=false npm run dev
```

Arrancar con `NODE_ENV=production` sin `USE_INMEMORY=true` usa PostgreSQL. En ese caso `DATABASE_URL` es obligatoria:

```bash
NODE_ENV=production DATABASE_URL=postgres://postgres:postgres@localhost:5432/clean_architecture npm run dev
```

## Modos De Persistencia Y Eventos

La decision de adaptadores se toma en `composition` a partir de `USE_INMEMORY` y `USE_OUTBOX`.

| Variables | Persistencia | Eventos |
| --- | --- | --- |
| `USE_INMEMORY=true` | Repositorio en memoria | `NoopDomainEventPublisher`, no persiste outbox. |
| `USE_INMEMORY=false USE_OUTBOX=false` | PostgreSQL | `NoopDomainEventPublisher` dentro de la transaccion. |
| `USE_INMEMORY=false USE_OUTBOX=true` | PostgreSQL | `DomainEventOutboxPublisher` dentro de la transaccion. |

Con outbox activo, los eventos de dominio se insertan en `outbox` en la misma transaccion que los cambios de negocio. El dispatcher lee eventos no publicados con `FOR UPDATE SKIP LOCKED` y marca `published_at` cuando los procesa.

## Proceso Outbox

En esta practica el proceso outbox se mantiene separado del servidor HTTP y no se arranca automaticamente con `npm run dev`.

### Secuencia Para PostgreSQL Con Outbox

Configuracion de aplicacion esperada en `.env` o en variables de entorno:

```env
USE_INMEMORY=false
USE_OUTBOX=true
DATABASE_URL=postgres://postgres:postgres@localhost:5432/clean_architecture
OUTBOX_WORKER_MODE=once
OUTBOX_BATCH_SIZE=100
OUTBOX_POLL_INTERVAL_MS=5000
```

`OUTBOX_WORKER_MODE`, `OUTBOX_BATCH_SIZE` y `OUTBOX_POLL_INTERVAL_MS` son opcionales si se aceptan sus valores por defecto. `OUTBOX_POLL_INTERVAL_MS` solo se usa cuando `OUTBOX_WORKER_MODE=loop`.

La configuracion del contenedor local de PostgreSQL esta en `.env.db`:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=clean_architecture
POSTGRES_PORT=5432
```

Secuencia de ejecucion recomendada:

1. Arrancar PostgreSQL.
2. Aplicar migraciones.
3. Arrancar la aplicacion con `USE_INMEMORY=false USE_OUTBOX=true`.
4. Ejecutar operaciones HTTP que generen eventos.
5. Lanzar manualmente el worker para procesar los eventos pendientes.

Ejemplo completo:

```bash
npm run db:up
npm run db:migrate
USE_INMEMORY=false USE_OUTBOX=true DATABASE_URL=postgres://postgres:postgres@localhost:5432/clean_architecture npm run dev
```

Con el servidor arrancado, generar eventos desde otra terminal:

```bash
curl -i -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{"orderId":"order-1","customerId":"customer-1"}'
```

Despues, procesar la cola outbox desde otra terminal:

```bash
USE_OUTBOX=true DATABASE_URL=postgres://postgres:postgres@localhost:5432/clean_architecture npm run worker:outbox
```

El servidor HTTP solo registra eventos en la tabla `outbox`. Si el worker no se ejecuta, los eventos quedan pendientes con `published_at = NULL`.

Por defecto, `worker:outbox` usa `OUTBOX_WORKER_MODE=once`: procesa un lote de hasta `OUTBOX_BATCH_SIZE` eventos, marca `published_at` y termina. Para dejarlo corriendo, usar `OUTBOX_WORKER_MODE=loop`; en ese modo espera `OUTBOX_POLL_INTERVAL_MS` entre lotes y registra en consola que queda esperando al siguiente lote.

En modo `loop`, el proceso puede detenerse con `Ctrl+C` o enviando `SIGTERM`. El worker ejecuta una parada ordenada: termina el lote en curso, evita arrancar otro lote y libera el pool de conexiones.

Este diseno es intencionado para la practica: permite observar la diferencia entre registrar eventos transaccionalmente y publicarlos despues, sin introducir un proceso background automatico dentro del servidor HTTP. En un entorno productivo, el worker normalmente se ejecutaria como proceso separado y continuo, o mediante un scheduler.

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

### Consultar Ordenes

```http
GET /orders
```

Ejemplo:

```bash
curl -i http://localhost:3000/orders
```

Respuesta:

```json
{
  "orders": [
    {
      "orderId": "order-1",
      "customerId": "customer-1",
      "totalPrice": {
        "amount": 1799.98,
        "currency": "EUR"
      }
    }
  ]
}
```

### Consultar Ordenes De Un Cliente

```http
GET /customers/:customerId/orders
```

Ejemplo:

```bash
curl -i http://localhost:3000/customers/customer-1/orders
```

Respuesta:

```json
{
  "customerId": "customer-1",
  "orders": [
    {
      "orderId": "order-1",
      "totalPrice": {
        "amount": 1799.98,
        "currency": "EUR"
      }
    }
  ]
}
```

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
