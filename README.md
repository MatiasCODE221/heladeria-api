
# Heladería Frío Natural — API (Express + Prisma + SQLite)

## Cómo ejecutar
```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```
La API arrancará en `http://localhost:3000`.

## Entidades (Diagrama de clases)
```mermaid
classDiagram
  class User { Int id; String name; String email; String passwordHash; Role role; }
  class Product { Int id; String name; String description; Int price; String imageUrl; Boolean isActive; }
  class Topping { Int id; String name; Int price; }
  class Order { Int id; Int userId; OrderStatus status; Int total; Date createdAt; Date updatedAt; }
  class OrderItem { Int id; Int orderId; Int productId; Int quantity; String baseFlavor; String notes; Int lineTotal; }
  class OrderItemTopping { Int id; Int orderItemId; Int toppingId; }
  class Payment { Int id; Int orderId; Int amount; PaymentStatus status; String method; Date createdAt; }

  User "1" --> "many" Order
  Order "1" --> "many" OrderItem
  Product "1" --> "many" OrderItem
  OrderItem "1" --> "many" OrderItemTopping
  Topping "1" --> "many" OrderItemTopping
  Order "1" --> "1" Payment
```

## Rutas
### Auth
- `POST /auth/register`
- `POST /auth/login` → `{ token }`

### Catálogo
- `GET /catalog/products`
- `GET /catalog/toppings`

### Carrito (token)
- `GET /cart`
- `POST /cart/items` `{ productId, quantity, baseFlavor, notes, toppingIds }`
- `POST /cart/checkout`

### Pedidos (token)
- `GET /orders/:id`
- `GET /orders/:id/status`
- `GET /orders/:id/receipt`

### Pagos (mock)
- `POST /payments` `{ orderId, method }`

### Admin (token + role=ADMIN)
- `GET /admin/users`
- `PUT /admin/users/:id/role`
- `GET /admin/orders`
- `PATCH /admin/orders/:id/status`

### Reportes de Ventas (Admin)
- `GET /reports/sales?from=YYYY-MM-DD&to=YYYY-MM-DD&productId=&userId=&groupBy=none|day|month`
- `GET /reports/sales.xlsx?...`
- `GET /reports/sales.pdf?...`

### Filtros y agrupaciones en `/reports/sales`
Parámetros opcionales:
- `from`, `to` (YYYY-MM-DD)
- `productId`, `userId`
- `groupBy` = `none` (default) | `day` | `month`

Ejemplos:
- `GET /reports/sales?from=2025-10-01&to=2025-10-31&groupBy=day`
- `GET /reports/sales?productId=3&groupBy=month`
- `GET /reports/sales?userId=5`
