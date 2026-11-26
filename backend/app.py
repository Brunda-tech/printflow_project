"""
PrintFlow Flask Backend API.

Provides REST endpoints for queue validation, custom K-way merge execution,
step-by-step visualization navigation, built-in example datasets, and CSV reporting.
"""

import os
import sys

# Ensure project root is on sys.path when invoked as `python backend/app.py`
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask, Response, jsonify, request
from flask_cors import CORS

from backend.api_service import (
    generate_csv_report,
    handle_example,
    handle_health,
    handle_merge,
    handle_merge_step,
    handle_queues,
    handle_report,
)

app = Flask(__name__)
CORS(app)


@app.route("/api/health", methods=["GET"])
def api_health():
    status, body = handle_health()
    return jsonify(body), status


@app.route("/api/example", methods=["GET"])
def api_example():
    dataset_id = request.args.get("id")
    status, body = handle_example(dataset_id)
    return jsonify(body), status


@app.route("/api/queues", methods=["POST"])
def api_queues():
    payload = request.get_json(silent=True)
    status, body = handle_queues(payload)
    return jsonify(body), status


@app.route("/api/merge", methods=["POST"])
def api_merge():
    payload = request.get_json(silent=True)
    status, body = handle_merge(payload)
    return jsonify(body), status


@app.route("/api/merge/step", methods=["POST"])
def api_merge_step():
    payload = request.get_json(silent=True)
    status, body = handle_merge_step(payload)
    return jsonify(body), status


@app.route("/api/report", methods=["GET"])
def api_report():
    fmt = request.args.get("format", "json").lower()
    if fmt == "csv":
        status, csv_text = generate_csv_report()
        if status != 200:
            return jsonify({"success": False, "error": "No merge report available."}), status
        return Response(
            csv_text,
            status=200,
            mimetype="text/csv",
            headers={
                "Content-Disposition": "attachment; filename=printflow_merge_report.csv"
            },
        )
    status, body = handle_report()
    return jsonify(body), status


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=True)
