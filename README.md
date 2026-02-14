# tax-service

Tax service API.

## Prerequisites
- Node.js 18+
- npm

## Setup & Running

Copy the example environment file (optional):
```
cp .env.example .env
```

Install dependencies:
```
npm install
```

Start the server:
```
npm start
```

Server runs at http://localhost:3000 (or the port defined in .env if different)

## Testing

Run tests:
```
npm test
```

## API Endpoints

- `POST /transactions` - Ingest a sales or tax payment event
- `PATCH /sale` - Amend an item within a sales event  
- `GET /tax-position?date=<ISO8601>` - Query tax position at a given date

## Example Usage

Ingest a sales event:
```
curl -X POST http://localhost:3000/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "SALES",
    "date": "2026-01-01T00:00:00Z",
    "invoiceId": "3419027d-960f-4e8f-b8b7-f7b2b4791824",
    "items": [{
      "itemId": "02db47b6-fe68-4005-a827-24c6e962f3df",
      "cost": 1000,
      "taxRate": 0.2
    }]
  }'
```

Ingest a tax payment:
```
curl -X POST http://localhost:3000/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "TAX_PAYMENT",
    "date": "2026-01-02T00:00:00Z",
    "amount": 100
  }'
```

Amend a sale item:
```
curl -X PATCH http://localhost:3000/sale \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-01-03T00:00:00Z",
    "invoiceId": "3419027d-960f-4e8f-b8b7-f7b2b4791824",
    "itemId": "02db47b6-fe68-4005-a827-24c6e962f3df",
    "cost": 2000,
    "taxRate": 0.2
  }'
```

Query tax position (expected result: 300 - i.e. 2000 * 0.2 - 100):
```
curl "http://localhost:3000/tax-position?date=2026-01-04T00:00:00Z"
```

## Design Decisions

### Architecture

- Simple Express.js server is sufficient for the task without over-engineering
- CommonJS modules used to avoid configuration friction with Jest as Node hasn't fully moved to native ESM yet
- Dependency injection used to pass store into routers and handlers, making testing easier and decoupling components
- In a production service would separate `/transactions` into distinct endpoints per `eventType` (eg. `/transactions/sales`, `/transactions/tax-payments`) for a cleaner API design

### Storage

- In-memory storage used for simplicity, which means that data doesn't persist between restarts
- In a production service would use PostgreSQL, using a Docker container for local development to mirror the production environment
- Store exposes a basic method-based API rather than raw arrays to decouple storage implementation
- Sales events stored as arrays rather than say a Map (keyed by invoiceId), which could be more efficient, for simplicity and to avoid data repetition. In a production service a database index would handle lookup performance

### Types

- Zod used to create and validate API schemas and types decoupled from domain types
- Domain types use `Date` objects rather than strings for reliable date comparison
- Amendment domain type nests an `Item` object rather than using an flat/intersection type, as an amendment is essentially a wrapper around an item change

### Amendments

- Amendments stored separately rather than overwriting original sales events, preserving full audit history
- Most recent amendment at or before the queried date takes precedence; original item values used if no amendment exists at that date
- Amendments may arrive before the original sales event, per the spec; they are stored and only applied once the sales event is eventually received
- Amendments referencing a non-existent `itemId` on an existing invoice are silently ignored. A production implementation might validate `itemId` against existing invoices on receipt, and validate against existing stored amendments on receipt of invoices, logging warnings for any invalid amendments found

### Assumptions

- Both `cost` and `taxRate` are required fields in amendment requests; would obviously clarify the spec for a production project
- `cost` and `amount` fields must be non-negative integer
- `taxRate` fields must be between 0 and 1 inclusive
- `items` field array can't be empty
- Tax position may be negative if tax payments exceed tax liability; this is logged as info
- Tax position accumulates indefinitely across all time as per the spec - no financial years
- Single-user service, no authentication required as per the spec

### Error Handling

- Centralised error handling middleware handles all errors:
  - Zod validation errors -> 400 with structured error details
  - Unknown routes -> 404
  - Unexpected errors -> 500
- A production service would probably use more granular error types, error monitoring and alerting etc.

### Observability

- Structured JSON logging via Pino in all handlers
- Console output sufficient for local development
- Production service would add things like:
  - Distributed tracing
  - Metrics collection
  - Log aggregation

### Testing

- Integration tests cover main happy paths and all considered edge cases per endpoint. Tests use a fresh store instance per test to ensure isolation
- A production service might benefit from more comprehensive edge case coverage and potentially separate unit tests for more complex logic (eg. tax calculation possibly)