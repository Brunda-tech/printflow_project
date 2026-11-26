class DepartmentQueue:
    def __init__(self, department_code):
        self.department_code = department_code
        self.head = None
        self.tail = None
        self.job_count = 0

    def append_job(self, job_id, submission_time, original_position):
        node = PrintJobNode(job_id, self.department_code, submission_time, original_position)
        if self.head is None:
            self.head = node
            self.tail = node
        else:
            self.tail.next = node
            self.tail = node
        self.job_count = self.job_count + 1

    def display_queue(self):
        result = []
        current = self.head
        while current is not None:
            result.append(current.to_dict())
            current = current.next
        return result

    def get_job_count(self):
        return self.job_count


class PrintJobNode:
    def __init__(self, job_id, department_code, submission_time, original_position):
        self.job_id = job_id
        self.department_code = department_code
        self.submission_time = submission_time
        self.original_position = original_position
        self.next = None

    def to_dict(self):
        return {
            "job_id": self.job_id,
            "department_code": self.department_code,
            "submission_time": self.submission_time,
            "original_position": self.original_position,
        }


class MergedPrintList:
    def __init__(self):
        self.head = None
        self.tail = None
        self.job_count = 0

    def append_from_node(self, source_node):
        node = PrintJobNode(
            source_node.job_id,
            source_node.department_code,
            source_node.submission_time,
            source_node.original_position,
        )
        if self.head is None:
            self.head = node
            self.tail = node
        else:
            self.tail.next = node
            self.tail = node
        self.job_count = self.job_count + 1
        return node

    def to_list(self):
        result = []
        current = self.head
        position = 1
        while current is not None:
            item = current.to_dict()
            item["final_position"] = position
            result.append(item)
            current = current.next
            position = position + 1
        return result

    def get_job_count(self):
        return self.job_count


class CustomMinHeap:
    def __init__(self):
        self._heap = []
        self.insert_count = 0
        self.remove_count = 0
        self.comparison_count = 0

    def is_empty(self):
        return len(self._heap) == 0

    def size(self):
        return len(self._heap)

    def compare_jobs(self, first, second):
        self.comparison_count = self.comparison_count + 1
        if first.submission_time < second.submission_time:
            return -1
        if first.submission_time > second.submission_time:
            return 1
        if first.department_code < second.department_code:
            return -1
        if first.department_code > second.department_code:
            return 1
        if first.original_position < second.original_position:
            return -1
        if first.original_position > second.original_position:
            return 1
        return 0

    def heap_insert(self, node):
        self._heap.append(node)
        self.insert_count = self.insert_count + 1
        index = len(self._heap) - 1
        while index > 0:
            parent = (index - 1) // 2
            if self.compare_jobs(self._heap[index], self._heap[parent]) < 0:
                temporary = self._heap[index]
                self._heap[index] = self._heap[parent]
                self._heap[parent] = temporary
                index = parent
            else:
                break

    def heap_remove_min(self):
        if self.is_empty():
            return None
        minimum = self._heap[0]
        last_index = len(self._heap) - 1
        if last_index == 0:
            self._heap.pop()
        else:
            self._heap[0] = self._heap[last_index]
            self._heap.pop()
            self.heapify_down(0)
        self.remove_count = self.remove_count + 1
        return minimum

    def heapify_down(self, index):
        length = len(self._heap)
        current = index
        while True:
            left = (2 * current) + 1
            right = (2 * current) + 2
            smallest = current
            if left < length:
                if self.compare_jobs(self._heap[left], self._heap[smallest]) < 0:
                    smallest = left
            if right < length:
                if self.compare_jobs(self._heap[right], self._heap[smallest]) < 0:
                    smallest = right
            if smallest == current:
                break
            temporary = self._heap[current]
            self._heap[current] = self._heap[smallest]
            self._heap[smallest] = temporary
            current = smallest

    def to_list(self):
        result = []
        index = 0
        while index < len(self._heap):
            item = self._heap[index].to_dict()
            item["heap_index"] = index
            result.append(item)
            index = index + 1
        return result


def parse_and_validate_queues(raw_departments, auto_sort=True):
    if not isinstance(raw_departments, list):
        return False, [], "Input payload must include a list of departments.", {}

    queues = []
    seen_codes = {}
    auto_sorted = []
    department_index = 0

    while department_index < len(raw_departments):
        department = raw_departments[department_index]
        if not isinstance(department, dict):
            return False, [], "Department entry at index " + str(department_index) + " must be an object.", {}

        code = department.get("department_code", "")
        if not isinstance(code, str) or code.strip() == "":
            return False, [], "Department at index " + str(department_index) + " must have a non-empty department_code.", {}
        code = code.strip()
        if code in seen_codes:
            return False, [], "Duplicate department code '" + code + "' is not allowed.", {}
        seen_codes[code] = True

        jobs = department.get("jobs", [])
        if not isinstance(jobs, list):
            return False, [], "Jobs for Department " + code + " must be a list.", {}

        queue = DepartmentQueue(code)
        job_index = 0
        unsorted = False
        unsorted_index = None
        previous_time = None

        while job_index < len(jobs):
            job = jobs[job_index]
            if not isinstance(job, dict):
                return False, [], "Job at position " + str(job_index) + " in Department " + code + " must be an object.", {}

            job_id = job.get("job_id", "")
            if not isinstance(job_id, str) or job_id.strip() == "":
                return False, [], "Job at position " + str(job_index) + " in Department " + code + " must have a non-empty job_id.", {}

            raw_time = job.get("submission_time")
            if raw_time is None or isinstance(raw_time, bool):
                return False, [], "Job '" + job_id + "' in Department " + code + " is missing a numeric submission_time.", {}
            try:
                numeric_time = float(raw_time)
            except (TypeError, ValueError):
                return False, [], "Job '" + job_id + "' in Department " + code + " has an invalid submission_time.", {}
            if numeric_time < 0:
                return False, [], "Job '" + job_id + "' in Department " + code + " cannot have a negative timestamp.", {}
            if numeric_time.is_integer():
                numeric_time = int(numeric_time)

            if previous_time is not None and numeric_time < previous_time:
                unsorted = True
                if unsorted_index is None:
                    unsorted_index = job_index
            previous_time = numeric_time
            queue.append_job(job_id, numeric_time, job_index)
            job_index = job_index + 1

        if unsorted and not auto_sort:
            return False, [], "Department " + code + " queue is not sorted.", {
                "department_code": code,
                "invalid_job_index": unsorted_index,
            }
        if unsorted:
            queue = manually_sort_queue(queue)
            auto_sorted.append(code)

        queues.append(queue)
        department_index = department_index + 1

    return True, queues, None, {"auto_sorted_departments": auto_sorted}


def manually_sort_queue(queue):
    if queue.head is None or queue.head.next is None:
        return queue

    changed = True
    while changed:
        changed = False
        current = queue.head
        previous = None
        while current is not None and current.next is not None:
            first = current
            second = current.next
            should_swap = False
            if first.submission_time > second.submission_time:
                should_swap = True
            if (
                first.submission_time == second.submission_time
                and first.original_position > second.original_position
            ):
                should_swap = True

            if should_swap:
                first.next = second.next
                second.next = first
                if previous is None:
                    queue.head = second
                else:
                    previous.next = second
                previous = second
                changed = True
            else:
                previous = first
                current = second

    current = queue.head
    queue.tail = None
    while current is not None:
        queue.tail = current
        current = current.next
    return queue


def execute_merge(queues, capture_steps=True):
    heap = CustomMinHeap()
    merged = MergedPrintList()
    total_input = 0
    empty_queues = 0
    pointer = {}
    initial = []

    department_index = 0
    while department_index < len(queues):
        queue = queues[department_index]
        total_input = total_input + queue.job_count
        pointer[queue.department_code] = 0
        if queue.head is None:
            empty_queues = empty_queues + 1
        else:
            heap.heap_insert(queue.head)
        initial.append({
            "department_code": queue.department_code,
            "job_count": queue.job_count,
            "jobs": queue.display_queue(),
        })
        department_index = department_index + 1

    steps = []
    if capture_steps:
        steps.append({
            "step_number": 0,
            "phase": "initialized",
            "explanation": "Initialized the custom min-heap with all department head jobs.",
            "reason_type": "init",
            "selected_job": None,
            "inserted_job": None,
            "heap_before": heap.to_list(),
            "heap_after": heap.to_list(),
            "merged_so_far": [],
            "department_pointers": pointer.copy(),
            "comparisons_so_far": heap.comparison_count,
            "insertions_so_far": heap.insert_count,
            "removals_so_far": heap.remove_count,
        })

    step_number = 1
    while not heap.is_empty():
        heap_before = heap.to_list() if capture_steps else []
        minimum = heap.heap_remove_min()
        merged_node = merged.append_from_node(minimum)
        next_node = minimum.next
        inserted = None

        pointer[minimum.department_code] = pointer[minimum.department_code] + 1
        if next_node is not None:
            heap.heap_insert(next_node)
            inserted = next_node.to_dict()

        if capture_steps:
            selected = merged_node.to_dict()
            selected["final_position"] = merged.job_count
            explanation = "Selected Job " + minimum.job_id + " from Department " + minimum.department_code + "."
            if inserted is not None:
                explanation = explanation + " Inserted the department's next job."
            steps.append({
                "step_number": step_number,
                "phase": "merge_step",
                "explanation": explanation,
                "reason_type": "min_timestamp",
                "selected_job": selected,
                "inserted_job": inserted,
                "heap_before": heap_before,
                "heap_after": heap.to_list(),
                "merged_so_far": merged.to_list(),
                "department_pointers": pointer.copy(),
                "comparisons_so_far": heap.comparison_count,
                "insertions_so_far": heap.insert_count,
                "removals_so_far": heap.remove_count,
            })
            step_number = step_number + 1

    merged_jobs = merged.to_list()
    counts_match = total_input == merged.job_count
    merge_status = "SUCCESS" if counts_match else "ERROR"
    report = {
        "total_departments": len(queues),
        "total_input_jobs": total_input,
        "total_merged_jobs": merged.job_count,
        "heap_insertions": heap.insert_count,
        "heap_removals": heap.remove_count,
        "comparisons": heap.comparison_count,
        "empty_queues": empty_queues,
        "merge_status": merge_status,
        "counts_verified": counts_match,
        "time_complexity": "O(N log K)",
        "space_complexity": "O(K)",
        "execution_time_ms": 0,
    }

    return {
        "success": counts_match,
        "error": None if counts_match else merge_status,
        "merged_jobs": merged_jobs,
        "report": report,
        "steps": steps if capture_steps else [],
        "initial_queues": initial if capture_steps else [],
    }


def get_example_datasets():
    standard = {
        "id": "standard",
        "name": "Standard 3-Department Consolidation",
        "description": "Demonstrates basic K-way merging and tie-breaking.",
        "expected_order": ["B1", "A2", "C3", "A7", "B7", "A9", "C10"],
        "departments": [
            {"department_code": "A", "jobs": [{"job_id": "A2", "submission_time": 2}, {"job_id": "A7", "submission_time": 7}, {"job_id": "A9", "submission_time": 9}]},
            {"department_code": "B", "jobs": [{"job_id": "B1", "submission_time": 1}, {"job_id": "B7", "submission_time": 7}]},
            {"department_code": "C", "jobs": [{"job_id": "C3", "submission_time": 3}, {"job_id": "C10", "submission_time": 10}]},
        ],
    }
    edge_cases = {
        "id": "edge_cases",
        "name": "Edge Cases",
        "description": "Tests empty queues, timestamp ties, and intra-department stability.",
        "expected_order": ["C2", "A5-1", "A5-2", "C5", "D5", "C8", "A12", "C15", "C20"],
        "departments": [
            {"department_code": "A", "jobs": [{"job_id": "A5-1", "submission_time": 5}, {"job_id": "A5-2", "submission_time": 5}, {"job_id": "A12", "submission_time": 12}]},
            {"department_code": "B", "jobs": []},
            {"department_code": "C", "jobs": [{"job_id": "C2", "submission_time": 2}, {"job_id": "C5", "submission_time": 5}, {"job_id": "C8", "submission_time": 8}, {"job_id": "C15", "submission_time": 15}, {"job_id": "C20", "submission_time": 20}]},
            {"department_code": "D", "jobs": [{"job_id": "D5", "submission_time": 5}]},
        ],
    }
    return {"default_id": "standard", "datasets": {"standard": standard, "edge_cases": edge_cases}}
