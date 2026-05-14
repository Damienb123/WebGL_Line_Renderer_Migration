# Trace REST API Backend

FastAPI service for saving, loading, updating, listing, and deleting generated line data without changing the React UI.

## Run

```bash
cd backend
python -m uvicorn app.main:app --reload
```

By default the API uses `trace_lines.db` in the backend working directory. Override settings with environment variables:

```bash
$env:TRACE_API_KEY="replace-with-a-long-secret"
$env:TRACE_DATABASE_PATH="data/trace_lines.db"
```

Every request to `/api/v1/line-documents` requires:

- `X-API-Key`: shared API key from `TRACE_API_KEY`
- `X-User-Id`: stable user identifier; the backend stores only a SHA-256 hash

## Endpoints

- `GET /health`
- `POST /api/v1/line-documents`
- `GET /api/v1/line-documents`
- `GET /api/v1/line-documents/{id}`
- `PUT /api/v1/line-documents/{id}`
- `DELETE /api/v1/line-documents/{id}`

## Test

```bash
cd backend
python -m pytest
```

