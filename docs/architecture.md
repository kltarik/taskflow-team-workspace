# Architecture

```text
Browser (Angular 22)
   │  fetch /api/... with HttpOnly session cookie
   ▼
ASP.NET Core 10 minimal API ── validation (DataAnnotations) ── ProblemDetails errors
   │  Rules.cs: who may do what (checked on every request)
   ▼
EF Core 10 + Npgsql ──► PostgreSQL 16 (migrations + seed on startup)
```

- `client/` Angular app. In development `ng serve` proxies `/api` to the API (see `client/proxy.conf.json`).
- `server/TaskFlow.Api` the API. In production it also serves the built Angular files from `wwwroot`.
- `server/TaskFlow.Tests` unit tests for `Rules` and integration tests through HTTP into a real test database.
