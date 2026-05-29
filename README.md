# TAKT Web App Docker Development Environment

## Prerequisites

- Docker
- Docker Compose

## Start

```sh
docker compose up --build
```

## Verify

- Frontend: open http://localhost:5173
- Backend: run `curl http://localhost:3000/health`

The backend response should return HTTP 200 with a JSON body containing `status: "ok"`.

## Hot Reload

Both services mount local source directories into their containers.

- Edit `frontend/src/App.tsx` and confirm the browser updates.
- Edit a backend file under `backend/src` and confirm the Node watch process restarts.

## Stop

```sh
docker compose down
```

If Vite file watching does not react on your host, add `CHOKIDAR_USEPOLLING=true` to the frontend service environment and restart Compose.
