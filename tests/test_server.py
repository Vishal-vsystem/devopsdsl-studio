import io, json, os, sys, threading, urllib.request, zipfile, pytest

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, ROOT_DIR)
import server  # noqa: E402


@pytest.fixture(scope="module")
def live_url(tmp_path_factory):
    tmp_dir = tmp_path_factory.mktemp("snaps")
    orig = server.PROJECTS_FILE
    server.PROJECTS_FILE = str(tmp_dir / "workspace_projects.json")
    httpd = server.ThreadingHTTPServer(("127.0.0.1", 0), server.DevOpsCompilerHandler)
    port = httpd.server_address[1]
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    yield f"http://127.0.0.1:{port}"
    httpd.shutdown()
    httpd.server_close()
    server.PROJECTS_FILE = orig


def test_root_and_health(live_url):
    with urllib.request.urlopen(f"{live_url}/") as r:
        assert r.status == 200
        assert "DevOpsDSL" in r.read().decode("utf-8")
    with urllib.request.urlopen(f"{live_url}/api/health") as r:
        assert json.loads(r.read().decode("utf-8"))["status"] == "healthy"


def test_compile_and_zip_export(live_url):
    src = 'database db1 { image = "postgres:15" port = 5432 }\nserver web1 { image = "nginx:1.25" port = 8080 depends_on = [db1] }'
    req = urllib.request.Request(f"{live_url}/api/export-bundle", data=json.dumps({"source": src, "env": "prod", "name": "ci"}).encode(), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as r:
        assert r.status == 200
        zf = zipfile.ZipFile(io.BytesIO(r.read()))
        assert "terraform/main.tf" in zf.namelist()
        assert "kubernetes/k8s-manifest.yaml" in zf.namelist()
