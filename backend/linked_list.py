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


class DepartmentQueue:
    def __init__(self, department_code):
        self.department_code = department_code
        self.head = None
        self.tail = None
        self.job_count = 0

    def append_job(self, job_id, submission_time, original_position=None):
        position = self.job_count if original_position is None else original_position
        node = PrintJobNode(job_id, self.department_code, submission_time, position)

        if self.head is None:
            self.head = node
            self.tail = node
        else:
            self.tail.next = node
            self.tail = node

        self.job_count = self.job_count + 1
        return node

    def display_queue(self):
        result = []
        current = self.head
        while current is not None:
            result.append(current.to_dict())
            current = current.next
        return result

    def validate_sorted_order(self):
        current = self.head
        index = 0

        while current is not None and current.next is not None:
            if current.submission_time > current.next.submission_time:
                message = (
                    "Department " + self.department_code
                    + " queue is not sorted: Job '"
                    + current.next.job_id
                    + "' appears after Job '" + current.job_id + "'."
                )
                return False, message, index + 1
            current = current.next
            index = index + 1

        return True, None, None

    def get_job_count(self):
        return self.job_count


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
