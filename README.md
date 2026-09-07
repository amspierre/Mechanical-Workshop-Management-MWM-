# MWM Frontend

Web frontend for **Mechanical Workshop Management**. This repository contains only the application interface. Data, authentication, business rules, and persistence belong to the separate `MWM-API` repository.

## Responsibilities

This project is responsible for:

- displaying the login screen and workshop dashboard;
- consuming the REST API over HTTP;
- sending the authentication token with requests;
- displaying clients, staff, vehicles, and service orders;
- sending create, update, and delete operations to the API;
- applying filters and rendering dashboard metrics.

This project does not contain:

- a database;
- a backend server;
- migrations or seed data;
- business rules as the source of truth;
- persistent mock data.

## API

The API must be available at:

```text
http://localhost:3000/api/v1
```

The URL can be overridden before loading the application scripts:

```html
<script>
  window.MWM_API_URL = 'http://localhost:3000/api/v1';
</script>
<script src="home-page-api.js"></script>
```

Without this configuration, the frontend uses `http://localhost:3000/api/v1` by default.

The complete API documentation is maintained in the separate repository:

```text
MWM-API/README.md
```

## Requirements

- MWM API running;
- Node.js/npm only if the selected static server requires it;
- Python, VS Code Live Server, or another HTTP server;
- the frontend origin allowed by the API CORS configuration.

During development, the API should allow at least:

```env
CORS_ORIGIN=http://localhost:5500,http://localhost:5173
```

## Run locally

1. Start the API in the `MWM-API` repository:

```powershell
cd path\to\MWM-API
npm start
```

2. Serve this frontend over HTTP:

```powershell
cd path\to\Mechanical-Workshop-Management-MWM-\frontend
python -m http.server 5500
```

3. Open the login page:

```text
http://localhost:5500/login-page/login.html
```

Do not open the files through `file://`. The frontend needs an HTTP origin for `fetch` and CORS to work correctly.

## Login

The login screen sends:

```http
POST http://localhost:3000/api/v1/auth/login
Content-Type: application/json
```

```json
{
  "email": "admin@oficina.com",
  "senha": "senha-segura"
}
```

The token returned by the API is stored in the browser as `mwm_access_token`. The controller automatically sends:

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
```

When the API returns `401`, the token is removed and the user is redirected to the login page.

## API endpoints used

The frontend uses these API endpoints:

```text
POST /api/v1/auth/login
GET  /api/v1/clientes?limit=1000
GET  /api/v1/funcionarios?limit=1000
GET  /api/v1/veiculos?limit=1000
GET  /api/v1/ordens-servico?limit=1000&sort=data_inicio_desc
GET  /api/v1/dashboard/resumo
POST /api/v1/clientes
POST /api/v1/funcionarios
POST /api/v1/veiculos
POST /api/v1/ordens-servico
PATCH /api/v1/ordens-servico/:id
DELETE /api/v1/ordens-servico/:id
```

The Portuguese resource and field names above are part of the API contract and must not be translated in frontend requests.

Service order filters are sent using:

```text
responsavel_id
data_inicio_de
data_inicio_ate
valor_min
valor_max
sort
```

List endpoints are expected to return:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "pages": 0
  }
}
```

## Structure

```text
.
├── README.md
└── frontend
    ├── style.css
    ├── home-page
    │   ├── home-page-api.js
    │   ├── home-page.css
    │   └── home-page.html
    └── login-page
        ├── login.html
        ├── script.js
        └── style.css
```

## Main files

- `frontend/home-page/home-page.html`: dashboard markup.
- `frontend/home-page/home-page-api.js`: API integration, rendering, filtering, and CRUD operations.
- `frontend/login-page/login.html`: authentication screen.
- `frontend/login-page/script.js`: login request and token storage.

## Development rules

Do not add `db.json`, fake data, or local persistence logic to this repository. To test data, use the seed and database defined in the `MWM-API` repository.

Changes to endpoint contracts, fields, authentication, service order statuses, or response formats must be made first in the API documentation and implementation. Then update this frontend to consume the new contract.

## Status

The frontend is ready to consume the local API at `http://localhost:3000`. The Finance section currently contains only the initial visual structure and depends on financial endpoints that still need to be defined in the API.
