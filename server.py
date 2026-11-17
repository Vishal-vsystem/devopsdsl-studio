"""
DevOpsDSL Enterprise Cloud Compiler Service (v4.0)
Course: Compiler Design (CSA1422) | Saveetha Engineering College (Autonomous)
Project Guide: Dr. K. Pandikumar
"""

import http.server
import socketserver
import os
import io
import json
import time
import zipfile
import shutil
import subprocess
from urllib.parse import urlparse, parse_qs

PORT = int(os.environ.get("PORT", 8080))
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
PROJECTS_FILE = os.path.join(DIRECTORY, "workspace_projects.json")
START_TIME = time.time()
MAX_PAYLOAD_BYTES = 262144

STATS = {
    "total_compiles": 0,
    "successful_compiles": 0,
    "failed_compiles": 0,
    "bundles_exported": 0
}

COMPILER_METADATA = {
    "project_name": "DevOpsDSL: A Domain-Specific Infrastructure Compiler",
    "version": "4.0.0-enterprise",
    "course_name": "Compiler Design",
    "course_code": "CSA1422",
    "institution": "Saveetha Engineering College (Autonomous)",
    "guide": "Dr. K. Pandikumar",
    "team": [
        {"name": "K. Subashree", "reg": "192522396", "role": "Module 1: Lexical Analysis"},
        {"name": "Vishwa U", "reg": "192511192", "role": "Module 2: Syntax Analysis"},
        {"name": "Vishal Balaji J", "reg": "192525014", "role": "Module 3: Semantic Analysis"},
        {"name": "Divya U", "reg": "192372277", "role": "Module 4: IR & DAG Optimization"},
        {"name": "Ganesh Reddy V", "reg": "192525262", "role": "Module 5: Code Generation & DevOps"}
    ]
}


def load_saved_projects():
    if not os.path.exists(PROJECTS_FILE):
        return []
    try:
        with open(PROJECTS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def save_projects_to_disk(projects):
    with open(PROJECTS_FILE, "w", encoding="utf-8") as f:
        json.dump(projects, f, indent=2)


def invoke_node_compiler(source, env="dev"):
    script_path = os.path.join(DIRECTORY, "devops_compiler.js")
    node_cmd = [
        "node",
        "-e",
        (
            f"const compiler = require({json.dumps(script_path)});"
            f"const res = compiler.Pipeline.compile({json.dumps(source)}, {{ env: {json.dumps(env)} }});"
            "if (res.semanticResult && res.semanticResult.symbolMap instanceof Map) {"
            "  res.semanticResult.symbolMapSize = res.semanticResult.symbolMap.size;"
            "  delete res.semanticResult.symbolMap;"
            "}"
            "if (res.irResult && res.irResult.graph instanceof Map) {"
            "  res.irResult.graphNodes = Object.fromEntries(res.irResult.graph);"
            "  delete res.irResult.graph;"
            "}"
            "process.stdout.write(JSON.stringify(res));"
        )
    ]
    proc = subprocess.run(node_cmd, capture_output=True, text=True, timeout=6)
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr or "Compiler process error")
    return json.loads(proc.stdout)


class DevOpsCompilerHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        clean_path = urlparse(self.path).path
        if clean_path.endswith((".js", ".html", ".css")) or clean_path == "/":
            self.send_header("Cache-Control", "no-store, must-revalidate")
            self.send_header("Pragma", "no-cache")
        super().end_headers()

    def log_message(self, format, *args):
        pass

    def _send_json(self, status_code, payload):
        raw = json.dumps(payload, indent=2).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path in ["/", "/index.html", "/devopsdsl", "/devopsdsl.html"]:
            file_path = os.path.join(DIRECTORY, "index.html")
            if os.path.exists(file_path):
                with open(file_path, "rb") as f:
                    content = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                self.wfile.write(content)
                return

        if parsed.path == "/api/health":
            self._send_json(200, {
                "status": "healthy",
                "uptime_sec": round(time.time() - START_TIME, 2),
                "node_available": shutil.which("node") is not None,
                "compiler_version": COMPILER_METADATA["version"]
            })
            return

        if parsed.path == "/api/status":
            resp = dict(COMPILER_METADATA)
            resp["server_time"] = time.strftime("%Y-%m-%d %H:%M:%S")
            resp["uptime_sec"] = round(time.time() - START_TIME, 2)
            resp["stats"] = dict(STATS)
            resp["status"] = "ACTIVE"
            self._send_json(200, resp)
            return

        if parsed.path == "/api/projects":
            self._send_json(200, {"projects": load_saved_projects()})
            return

        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        try:
            length = int(self.headers.get("Content-Length", 0))
        except ValueError:
            length = 0

        if length > MAX_PAYLOAD_BYTES:
            self._send_json(413, {"error": f"Payload exceeds {MAX_PAYLOAD_BYTES} byte limit"})
            return

        body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
        try:
            payload = json.loads(body)
        except Exception:
            self._send_json(400, {"error": "Invalid JSON request body"})
            return

        if parsed.path == "/api/compile":
            source = payload.get("source", "")
            env = payload.get("env", "dev")
            if not isinstance(source, str):
                self._send_json(400, {"error": "'source' must be a string"})
                return
            try:
                res = invoke_node_compiler(source, env)
                STATS["total_compiles"] += 1
                if res.get("success"):
                    STATS["successful_compiles"] += 1
                else:
                    STATS["failed_compiles"] += 1
                self._send_json(200, res)
            except Exception as e:
                self._send_json(500, {"error": str(e)})
            return

        if parsed.path == "/api/export-bundle":
            source = payload.get("source", "")
            env = payload.get("env", "dev")
            project_name = payload.get("name", "devopsdsl-stack").strip() or "devopsdsl-stack"
            safe_name = "".join(c for c in project_name if c.isalnum() or c in "-_") or "devopsdsl-stack"
            try:
                res = invoke_node_compiler(source, env)
                if not res.get("success"):
                    self._send_json(422, {"error": "Cannot export bundle: compilation failed", "details": res})
                    return
                cg = res["codeGenResult"]
                buf = io.BytesIO()
                with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
                    zf.writestr("infrastructure.dsl", source)
                    zf.writestr("terraform/main.tf", cg.get("terraform", ""))
                    zf.writestr("docker-compose.yml", cg.get("dockerCompose", ""))
                    zf.writestr("kubernetes/k8s-manifest.yaml", cg.get("kubernetes", ""))
                    zf.writestr("ansible/playbook.yml", cg.get("ansible", ""))
                    zf.writestr(".github/workflows/deploy.yml", cg.get("githubActions", ""))
                    zf.writestr("audit-report.json", json.dumps({
                        "project": safe_name,
                        "env": env,
                        "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                        "compiler": COMPILER_METADATA,
                        "finops": res["irResult"]["finops"],
                        "linter": res["linterResult"]
                    }, indent=2))
                zip_bytes = buf.getvalue()
                STATS["bundles_exported"] += 1
                self.send_response(200)
                self.send_header("Content-Type", "application/zip")
                self.send_header("Content-Disposition", f'attachment; filename="{safe_name}-{env}-bundle.zip"')
                self.send_header("Content-Length", str(len(zip_bytes)))
                self.end_headers()
                self.wfile.write(zip_bytes)
            except Exception as e:
                self._send_json(500, {"error": str(e)})
            return

        if parsed.path == "/api/projects":
            name = (payload.get("name") or "").strip()
            source = payload.get("source", "")
            env = payload.get("env", "dev")
            if not name:
                self._send_json(400, {"error": "Project 'name' is required"})
                return
            projects = load_saved_projects()
            now_str = time.strftime("%Y-%m-%d %H:%M:%S")
            for p in projects:
                if p["name"] == name:
                    p["source"] = source
                    p["env"] = env
                    p["updated_at"] = now_str
                    break
            else:
                projects.insert(0, {"name": name, "source": source, "env": env, "updated_at": now_str})
            save_projects_to_disk(projects)
            self._send_json(200, {"ok": True, "projects": projects})
            return

        self._send_json(404, {"error": "Endpoint not found"})


class ThreadingHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == "__main__":
    with ThreadingHTTPServer(("0.0.0.0", PORT), DevOpsCompilerHandler) as httpd:
        print(f"DevOpsDSL Studio v4.0 running on http://localhost:{PORT}")
        httpd.serve_forever()
