from backend.merge_engine import execute_merge, get_example_datasets, parse_and_validate_queues


class PrintFlowState:
    def __init__(self):
        self.validated_raw_departments = None
        self.latest_merge_result = None
        self.current_step_index = 0


_STATE = PrintFlowState()


def handle_health():
    return 200, {
        "status": "ok",
        "service": "PrintFlow Queue Consolidation Engine",
        "algorithm": "Custom Singly Linked List + Custom Binary Min-Heap (O(N log K))",
    }


def handle_example(dataset_id=None):
    examples = get_example_datasets()
    if dataset_id is not None and dataset_id in examples["datasets"]:
        return 200, {
            "dataset": examples["datasets"][dataset_id],
            "datasets": examples["datasets"],
        }
    return 200, {
        "dataset": examples["datasets"][examples["default_id"]],
        "datasets": examples["datasets"],
    }


def handle_queues(payload):
    if not isinstance(payload, dict) or "departments" not in payload:
        return 400, {
            "valid": False,
            "error": "Request body must be JSON containing a 'departments' array.",
        }

    raw_departments = payload["departments"]
    valid, queues, error, detail = parse_and_validate_queues(raw_departments)
    if not valid:
        return 400, {"valid": False, "error": error, "detail": detail}

    _STATE.validated_raw_departments = raw_departments
    linked_lists = []
    total_jobs = 0
    index = 0
    while index < len(queues):
        queue = queues[index]
        total_jobs = total_jobs + queue.job_count
        linked_lists.append({
            "department_code": queue.department_code,
            "job_count": queue.job_count,
            "jobs": queue.display_queue(),
        })
        index = index + 1

    return 200, {
        "valid": True,
        "total_departments": len(queues),
        "total_jobs": total_jobs,
        "linked_lists": linked_lists,
        "auto_sorted_departments": detail.get("auto_sorted_departments", []),
    }


def handle_merge(payload):
    raw_departments = None
    capture_steps = True

    if isinstance(payload, dict):
        if "departments" in payload:
            raw_departments = payload["departments"]
        if "capture_steps" in payload:
            capture_steps = bool(payload["capture_steps"])

    if raw_departments is None:
        raw_departments = _STATE.validated_raw_departments
    if raw_departments is None:
        return 400, {
            "success": False,
            "error": "No department queues provided. Submit queues first or include 'departments' in the request body.",
        }

    valid, queues, error, detail = parse_and_validate_queues(raw_departments)
    if not valid:
        return 400, {"success": False, "error": error, "detail": detail}

    total_jobs = 0
    index = 0
    while index < len(queues):
        total_jobs = total_jobs + queues[index].job_count
        index = index + 1
    if total_jobs > 500:
        capture_steps = False

    result = execute_merge(queues, capture_steps)
    result["auto_sorted_departments"] = detail.get("auto_sorted_departments", [])
    _STATE.validated_raw_departments = raw_departments
    _STATE.latest_merge_result = result
    _STATE.current_step_index = 0

    return (200 if result["success"] else 500), result


def handle_merge_step(payload):
    if not isinstance(payload, dict):
        payload = {}

    if "departments" in payload and payload["departments"] is not None:
        status, merge_result = handle_merge({
            "departments": payload["departments"],
            "capture_steps": True,
        })
        if status != 200:
            return status, merge_result

    if _STATE.latest_merge_result is None:
        return 400, {
            "success": False,
            "error": "No active merge session. Run POST /api/merge or provide 'departments' first.",
        }

    steps = _STATE.latest_merge_result.get("steps", [])
    if len(steps) == 0:
        return 400, {
            "success": False,
            "error": "Step-by-step trace is unavailable for this merge.",
        }

    action = payload.get("action", "next")
    total_steps = len(steps)
    if action == "start" or action == "reset":
        _STATE.current_step_index = 0
    elif action == "next":
        if _STATE.current_step_index < total_steps - 1:
            _STATE.current_step_index = _STATE.current_step_index + 1
    elif action == "prev":
        if _STATE.current_step_index > 0:
            _STATE.current_step_index = _STATE.current_step_index - 1
    elif action == "jump":
        try:
            index = int(payload.get("step_index", 0))
        except (TypeError, ValueError):
            index = 0
        if index < 0:
            index = 0
        if index >= total_steps:
            index = total_steps - 1
        _STATE.current_step_index = index

    return 200, {
        "success": True,
        "current_step_index": _STATE.current_step_index,
        "total_steps": total_steps,
        "step": steps[_STATE.current_step_index],
        "report": _STATE.latest_merge_result["report"],
    }


def handle_report():
    if _STATE.latest_merge_result is None:
        return 404, {
            "success": False,
            "error": "No merge has been executed yet. Run POST /api/merge first.",
        }
    return 200, {
        "success": True,
        "report": _STATE.latest_merge_result["report"],
        "merged_jobs": _STATE.latest_merge_result["merged_jobs"],
    }


def generate_csv_report():
    if _STATE.latest_merge_result is None:
        return 404, "Error,No merge has been executed yet\n"

    report = _STATE.latest_merge_result["report"]
    merged_jobs = _STATE.latest_merge_result["merged_jobs"]
    rows = [
        ["PrintFlow Merge Report"],
        ["Metric", "Value"],
        ["Total Departments", report["total_departments"]],
        ["Total Input Jobs", report["total_input_jobs"]],
        ["Total Merged Jobs", report["total_merged_jobs"]],
        ["Heap Insertions", report["heap_insertions"]],
        ["Heap Removals", report["heap_removals"]],
        ["Algorithm Comparisons", report["comparisons"]],
        ["Empty Queues", report["empty_queues"]],
        ["Merge Status", report["merge_status"]],
        ["Time Complexity", report["time_complexity"]],
        ["Space Complexity", report["space_complexity"]],
        [],
        ["Final Merged Timeline"],
        ["Final Position", "Job ID", "Department", "Submission Timestamp", "Original Position"],
    ]

    index = 0
    while index < len(merged_jobs):
        job = merged_jobs[index]
        rows.append([
            job["final_position"],
            job["job_id"],
            job["department_code"],
            job["submission_time"],
            job["original_position"],
        ])
        index = index + 1

    lines = []
    for row in rows:
        cells = []
        for cell in row:
            text = "" if cell is None else str(cell)
            text = text.replace('"', '""')
            if "," in text or '"' in text or "\n" in text:
                text = '"' + text + '"'
            cells.append(text)
        lines.append(",".join(cells))
    return 200, "\n".join(lines) + "\n"
