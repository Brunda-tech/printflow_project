"""
Zero-dependency Python 3 stdlib HTTP server adapter for PrintFlow.
Invokes the exact same api_service.py + linked_list.py + custom_min_heap.py + merge_engine.py
when running inside sandboxes without pip/Flask installed.
"""

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
import sys
from urllib.parse import parse_qs, urlparse

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.api_service import (
    generate_csv_report,
    handle_example,
    handle_health,
    handle_merge,
    handle_merge_step,
    handle_queues,
    handle_report,
)


class PrintFlowHandler(BaseHTTPRequestHandler):
    """Handles HTTP REST requests using Python's built-in ThreadingHTTPServer."""

    def log_message(self, format: str, *args) -> None:
        # Suppress verbose stdout logs during clean operation
        return

    def _send_json(self, status_code: int, payload: dict) -> None:
        raw = json.dumps(payload).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(raw)

    def _read_json_body(self):
        content_len = int(self.headers.get("Content-Length", "0") or "0")
        if content_len <= 0:
            return None
        raw_bytes = self.rfile.read(content_len)
        try:
            return json.loads(raw_bytes.decode("utf-8"))
        except Exception:
            return None

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        query = parse_qs(parsed.query)

        if parsed.path == "/api/health":
            status, body = handle_health()
            self._send_json(status, body)
        elif parsed.path == "/api/example":
            dataset_id = query.get("id", [None])[0]
            status, body = handle_example(dataset_id)
            self._send_json(status, body)
        elif parsed.path == "/api/report":
            fmt = (query.get("format", ["json"])[0] or "json").lower()
            if fmt == "csv":
                status, csv_text = generate_csv_report()
                if status != 200:
                    self._send_json(status, {"success": False, "error": "No merge report available."})
                    return
                raw = csv_text.encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "text/csv; charset=utf-8")
                self.send_header("Content-Disposition", "attachment; filename=printflow_merge_report.csv")
                self.send_header("Content-Length", str(len(raw)))
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(raw)
                return
            status, body = handle_report()
            self._send_json(status, body)
        else:
            self._send_json(404, {"error": f"Unknown endpoint: {parsed.path}"})

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        payload = self._read_json_body()

        if parsed.path == "/api/queues":
            status, body = handle_queues(payload)
            self._send_json(status, body)
        elif parsed.path == "/api/merge":
            status, body = handle_merge(payload)
            self._send_json(status, body)
        elif parsed.path == "/api/merge/step":
            status, body = handle_merge_step(payload)
            self._send_json(status, body)
        else:
            self._send_json(404, {"error": f"Unknown endpoint: {parsed.path}"})


if __name__ == "__main__":
    port = int(os.environ.get("PYTHON_API_PORT", "5001"))
    server = ThreadingHTTPServer(("127.0.0.1", port), PrintFlowHandler)
    print(f"PrintFlow Python backend bridge listening on http://127.0.0.1:{port}", flush=True)
    server.serve_forever()
