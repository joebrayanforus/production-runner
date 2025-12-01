# Docker Setup Dokumentation

## Überblick

Dieses Projekt nutzt Docker Compose zur einfachen Bereitstellung von Frontend (Angular) und Backend (.NET 9 API) zusammen.

## Anforderungen

### Entwicklung (Windows + WSL2 / Linux / Mac)
- Docker Desktop installiert
- Docker Compose installiert (enthalten in Docker Desktop)

## Starten

### Lokal

```bash
docker-compose up --build -d
```

### Zugriff

- **Frontend**: http://127.0.0.1 (empfohlen)
  - Auf Windows/WSL2: `localhost` funktioniert möglicherweise nicht, verwenden Sie `127.0.0.1`
- **Backend API**: http://127.0.0.1:5000

### Container stoppen

```bash
docker-compose down
```

