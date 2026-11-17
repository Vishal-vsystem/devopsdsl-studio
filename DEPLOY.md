# DevOpsDSL Studio v3.0 — Production Deployment Guide
**Course:** Compiler Design (`CSA1422`) | **Guide:** Dr. K. Pandikumar | **Saveetha Engineering College**

---

## 1. Local Production Execution
Requires Python 3.10+ and Node.js 18+:
```bash
python web_portal/server.py
```
Access the studio at **http://localhost:8080/**.

---

## 2. Containerized Production Deployment (Docker & Nginx Edge Proxy)
Build and launch the hardened multi-runtime container with an Nginx TLS/reverse-proxy front door:
```bash
docker compose up -d --build
```
- **App Service:** `http://localhost:8080` (Health probe: `/api/health`)
- **Edge Proxy:** `http://localhost:80` (configured in `deploy/nginx.conf` with gzip + security headers)
- **Persistent Snapshots:** Stored on Docker volume `devopsdsl_snapshots`.

---

## 3. Cloud PaaS Deployment (Render / Railway / Fly.io)
A declarative blueprint is included in `render.yaml`:
1. Push this repository to GitHub (`.github/workflows/ci.yml` automatically validates all Node compiler tests and Pytest integration checks).
2. Connect the repository on **Render.com** -> *New Blueprint Instance* (auto-detects `render.yaml` & `Dockerfile`).
3. Live public HTTPS URL provisions automatically with zero-downtime health checks on `/api/health`.

---

## 4. Automated Verification Commands
```bash
# Run 5-Module Compiler Unit Tests
node tests/test_compiler.js

# Run Backend REST API & ZIP Exporter Integration Tests
pytest -v tests/test_server.py
```
