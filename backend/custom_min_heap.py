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

    def peek(self):
        if self.is_empty():
            return None
        return self._heap[0]

    def compare_jobs(self, job_a, job_b):
        self.comparison_count = self.comparison_count + 1

        if job_a.submission_time < job_b.submission_time:
            return -1
        if job_a.submission_time > job_b.submission_time:
            return 1

        if job_a.department_code < job_b.department_code:
            return -1
        if job_a.department_code > job_b.department_code:
            return 1

        if job_a.original_position < job_b.original_position:
            return -1
        if job_a.original_position > job_b.original_position:
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
        heap_length = len(self._heap)
        current = index

        while True:
            left = (2 * current) + 1
            right = (2 * current) + 2
            smallest = current

            if left < heap_length:
                if self.compare_jobs(self._heap[left], self._heap[smallest]) < 0:
                    smallest = left
            if right < heap_length:
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
