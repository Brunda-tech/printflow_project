"""
Comprehensive Unit & Performance Test Suite for PrintFlow.

STRICT RULES FOLLOWED:
- All expected outputs are manually constructed.
- NO built-in sort(), sorted(), heapq, or PriorityQueue is used anywhere in tests.
- Covers all 15 hackathon test cases plus API validation and 100,000-job benchmark.
"""

import os
import sys
import unittest

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
from backend.linked_list import DepartmentQueue
from backend.merge_engine import execute_merge, parse_and_validate_queues


def extract_job_ids(merged_jobs):
    """Manually extract job_id sequence without list comprehensions or external helpers."""
    ids = []
    idx = 0
    while idx < len(merged_jobs):
        ids.append(merged_jobs[idx]["job_id"])
        idx += 1
    return ids


class TestPrintFlowMergeAlgorithm(unittest.TestCase):
    """Tests covering all 15 required hackathon scenarios."""

    # 1. Normal merging of multiple sorted queues (exact prompt example)
    def test_01_normal_multiple_sorted_queues(self):
        raw = [
            {
                "department_code": "A",
                "jobs": [
                    {"job_id": "A2", "submission_time": 2},
                    {"job_id": "A7", "submission_time": 7},
                    {"job_id": "A9", "submission_time": 9},
                ],
            },
            {
                "department_code": "B",
                "jobs": [
                    {"job_id": "B1", "submission_time": 1},
                    {"job_id": "B7", "submission_time": 7},
                ],
            },
            {
                "department_code": "C",
                "jobs": [
                    {"job_id": "C3", "submission_time": 3},
                    {"job_id": "C10", "submission_time": 10},
                ],
            },
        ]
        valid, queues, err, _ = parse_and_validate_queues(raw)
        self.assertTrue(valid, err)
        res = execute_merge(queues, capture_steps=True)
        self.assertTrue(res["success"])
        self.assertEqual(
            extract_job_ids(res["merged_jobs"]),
            ["B1", "A2", "C3", "A7", "B7", "A9", "C10"],
        )
        self.assertEqual(res["report"]["total_input_jobs"], 7)
        self.assertEqual(res["report"]["total_merged_jobs"], 7)

    # 2. One empty department
    def test_02_one_empty_department(self):
        raw = [
            {
                "department_code": "A",
                "jobs": [{"job_id": "A1", "submission_time": 1}, {"job_id": "A5", "submission_time": 5}],
            },
            {"department_code": "B", "jobs": []},
            {
                "department_code": "C",
                "jobs": [{"job_id": "C3", "submission_time": 3}],
            },
        ]
        valid, queues, err, _ = parse_and_validate_queues(raw)
        self.assertTrue(valid, err)
        res = execute_merge(queues)
        self.assertEqual(extract_job_ids(res["merged_jobs"]), ["A1", "C3", "A5"])
        self.assertEqual(res["report"]["empty_queues"], 1)

    # 3. All departments empty
    def test_03_all_departments_empty(self):
        raw = [
            {"department_code": "A", "jobs": []},
            {"department_code": "B", "jobs": []},
            {"department_code": "C", "jobs": []},
        ]
        valid, queues, err, _ = parse_and_validate_queues(raw)
        self.assertTrue(valid, err)
        res = execute_merge(queues)
        self.assertTrue(res["success"])
        self.assertEqual(res["merged_jobs"], [])
        self.assertEqual(res["report"]["empty_queues"], 3)
        self.assertEqual(res["report"]["total_input_jobs"], 0)
        self.assertEqual(res["report"]["total_merged_jobs"], 0)

    # 4. One department only
    def test_04_one_department_only(self):
        raw = [
            {
                "department_code": "ENG",
                "jobs": [
                    {"job_id": "E10", "submission_time": 10},
                    {"job_id": "E20", "submission_time": 20},
                    {"job_id": "E30", "submission_time": 30},
                ],
            }
        ]
        valid, queues, err, _ = parse_and_validate_queues(raw)
        self.assertTrue(valid, err)
        res = execute_merge(queues)
        self.assertEqual(extract_job_ids(res["merged_jobs"]), ["E10", "E20", "E30"])

    # 5. Equal timestamps across departments
    def test_05_equal_timestamps_across_departments(self):
        raw = [
            {"department_code": "C", "jobs": [{"job_id": "J_C", "submission_time": 10}]},
            {"department_code": "A", "jobs": [{"job_id": "J_A", "submission_time": 10}]},
            {"department_code": "B", "jobs": [{"job_id": "J_B", "submission_time": 10}]},
        ]
        valid, queues, err, _ = parse_and_validate_queues(raw)
        self.assertTrue(valid, err)
        res = execute_merge(queues)
        self.assertEqual(extract_job_ids(res["merged_jobs"]), ["J_A", "J_B", "J_C"])

    # 6. Equal timestamps within the same department (must preserve input order)
    def test_06_equal_timestamps_same_department(self):
        raw = [
            {
                "department_code": "A",
                "jobs": [
                    {"job_id": "Z_first", "submission_time": 4},
                    {"job_id": "A_second", "submission_time": 4},
                    {"job_id": "M_third", "submission_time": 4},
                ],
            }
        ]
        valid, queues, err, _ = parse_and_validate_queues(raw)
        self.assertTrue(valid, err)
        res = execute_merge(queues)
        # Note Z_first stays before A_second because original_position preserves FIFO order
        self.assertEqual(
            extract_job_ids(res["merged_jobs"]),
            ["Z_first", "A_second", "M_third"],
        )

    # 7. Uneven queue sizes
    def test_07_uneven_queue_sizes(self):
        raw = [
            {
                "department_code": "A",
                "jobs": [
                    {"job_id": "A1", "submission_time": 1},
                    {"job_id": "A3", "submission_time": 3},
                    {"job_id": "A5", "submission_time": 5},
                    {"job_id": "A7", "submission_time": 7},
                    {"job_id": "A9", "submission_time": 9},
                    {"job_id": "A11", "submission_time": 11},
                ],
            },
            {
                "department_code": "B",
                "jobs": [{"job_id": "B4", "submission_time": 4}],
            },
        ]
        valid, queues, err, _ = parse_and_validate_queues(raw)
        self.assertTrue(valid, err)
        res = execute_merge(queues)
        self.assertEqual(
            extract_job_ids(res["merged_jobs"]),
            ["A1", "A3", "B4", "A5", "A7", "A9", "A11"],
        )

    # 8. Duplicate job timestamps across and within departments
    def test_08_duplicate_timestamps(self):
        raw = [
            {
                "department_code": "B",
                "jobs": [
                    {"job_id": "B_5_1", "submission_time": 5},
                    {"job_id": "B_5_2", "submission_time": 5},
                ],
            },
            {
                "department_code": "A",
                "jobs": [
                    {"job_id": "A_5_1", "submission_time": 5},
                    {"job_id": "A_5_2", "submission_time": 5},
                ],
            },
        ]
        valid, queues, err, _ = parse_and_validate_queues(raw)
        self.assertTrue(valid, err)
        res = execute_merge(queues)
        self.assertEqual(
            extract_job_ids(res["merged_jobs"]),
            ["A_5_1", "A_5_2", "B_5_1", "B_5_2"],
        )

    # 9. Job IDs remain completely unchanged
    def test_09_job_ids_remain_unchanged(self):
        special_ids = ["HR-009_v2", "DOC#42/final", "  lead_space", "PRINT_999"]
        raw = [
            {
                "department_code": "A",
                "jobs": [
                    {"job_id": special_ids[0], "submission_time": 1},
                    {"job_id": special_ids[1], "submission_time": 4},
                ],
            },
            {
                "department_code": "B",
                "jobs": [
                    {"job_id": special_ids[2], "submission_time": 2},
                    {"job_id": special_ids[3], "submission_time": 3},
                ],
            },
        ]
        valid, queues, err, _ = parse_and_validate_queues(raw)
        self.assertTrue(valid, err)
        res = execute_merge(queues)
        self.assertEqual(
            extract_job_ids(res["merged_jobs"]),
            [special_ids[0], special_ids[2], special_ids[3], special_ids[1]],
        )

    # 10. Maximum number of departments (e.g. 50 departments)
    def test_10_many_departments(self):
        raw = []
        expected_ids = []
        # Create 50 departments D00..D49 each with 2 jobs (t = dept_idx and t = dept_idx + 100)
        d = 0
        while d < 50:
            code = f"D{d:02d}"
            raw.append(
                {
                    "department_code": code,
                    "jobs": [
                        {"job_id": f"{code}_first", "submission_time": d},
                        {"job_id": f"{code}_second", "submission_time": d + 100},
                    ],
                }
            )
            d += 1

        d = 0
        while d < 50:
            expected_ids.append(f"D{d:02d}_first")
            d += 1
        d = 0
        while d < 50:
            expected_ids.append(f"D{d:02d}_second")
            d += 1

        valid, queues, err, _ = parse_and_validate_queues(raw)
        self.assertTrue(valid, err)
        res = execute_merge(queues, capture_steps=False)
        self.assertEqual(res["report"]["total_departments"], 50)
        self.assertEqual(res["report"]["total_merged_jobs"], 100)
        self.assertEqual(extract_job_ids(res["merged_jobs"]), expected_ids)

    # 11. Large input with 100,000 total jobs
    def test_11_large_input_100k_jobs(self):
        # 10 departments x 10,000 jobs each = 100,000 total jobs
        num_depts = 10
        jobs_per_dept = 10000
        queues = []

        d = 0
        while d < num_depts:
            dept_code = f"DEPT_{d:02d}"
            q = DepartmentQueue(dept_code)
            j = 0
            while j < jobs_per_dept:
                # Timestamp interleaves across departments: j * num_depts + d
                ts = j * num_depts + d
                q.append_job(job_id=f"{dept_code}_{j}", submission_time=ts, original_position=j)
                j += 1
            queues.append(q)
            d += 1

        res = execute_merge(queues, capture_steps=False)
        self.assertTrue(res["success"])
        self.assertEqual(res["report"]["total_input_jobs"], 100000)
        self.assertEqual(res["report"]["total_merged_jobs"], 100000)

        # Verify monotonic non-decreasing order manually without using sort/sorted
        merged = res["merged_jobs"]
        idx = 0
        while idx < len(merged) - 1:
            curr = merged[idx]
            nxt = merged[idx + 1]
            self.assertLessEqual(curr["submission_time"], nxt["submission_time"])
            idx += 1

    # 12. Input queue that is not sorted (strict validation mode)
    def test_12_unsorted_input_queue_rejected(self):
        raw = [
            {
                "department_code": "A",
                "jobs": [
                    {"job_id": "A10", "submission_time": 10},
                    {"job_id": "A4", "submission_time": 4},
                ],
            }
        ]
        valid, queues, err, detail = parse_and_validate_queues(raw, auto_sort=False)
        self.assertFalse(valid)
        self.assertIn("not sorted", err)
        self.assertEqual(detail["department_code"], "A")
        self.assertEqual(detail["invalid_job_index"], 1)

    # 13 & 14. Verification that no job is lost and no job is duplicated
    def test_13_14_no_job_lost_or_duplicated(self):
        raw = [
            {
                "department_code": "A",
                "jobs": [
                    {"job_id": "A1", "submission_time": 1},
                    {"job_id": "A5", "submission_time": 5},
                    {"job_id": "A8", "submission_time": 8},
                ],
            },
            {
                "department_code": "B",
                "jobs": [
                    {"job_id": "B2", "submission_time": 2},
                    {"job_id": "B5", "submission_time": 5},
                    {"job_id": "B9", "submission_time": 9},
                ],
            },
        ]
        valid, queues, err, _ = parse_and_validate_queues(raw)
        self.assertTrue(valid, err)
        res = execute_merge(queues)
        merged_ids = extract_job_ids(res["merged_jobs"])

        expected_set = {"A1", "A5", "A8", "B2", "B5", "B9"}
        seen = {}
        idx = 0
        while idx < len(merged_ids):
            jid = merged_ids[idx]
            self.assertNotIn(jid, seen, f"Duplicate job found: {jid}")
            seen[jid] = True
            idx += 1

        self.assertEqual(set(seen.keys()), expected_set)
        self.assertEqual(res["report"]["total_input_jobs"], 6)
        self.assertEqual(res["report"]["total_merged_jobs"], 6)

    # 15. Verification of the department tie-breaking rule
    def test_15_department_tie_breaking_rule(self):
        raw = [
            {
                "department_code": "Z",
                "jobs": [{"job_id": "Z7", "submission_time": 7}],
            },
            {
                "department_code": "B",
                "jobs": [{"job_id": "B7", "submission_time": 7}],
            },
            {
                "department_code": "A",
                "jobs": [
                    {"job_id": "A7_first", "submission_time": 7},
                    {"job_id": "A7_second", "submission_time": 7},
                ],
            },
        ]
        valid, queues, err, _ = parse_and_validate_queues(raw)
        self.assertTrue(valid, err)
        res = execute_merge(queues)
        self.assertEqual(
            extract_job_ids(res["merged_jobs"]),
            ["A7_first", "A7_second", "B7", "Z7"],
        )

    # API Service Integration Tests
    def test_16_api_endpoints(self):
        status, health = handle_health()
        self.assertEqual(status, 200)
        self.assertEqual(health["status"], "ok")

        status, ex = handle_example("standard")
        self.assertEqual(status, 200)
        deps = ex["dataset"]["departments"]

        status, q_res = handle_queues({"departments": deps})
        self.assertEqual(status, 200)
        self.assertTrue(q_res["valid"])

        status, m_res = handle_merge({"departments": deps})
        self.assertEqual(status, 200)
        self.assertEqual(
            extract_job_ids(m_res["merged_jobs"]),
            ["B1", "A2", "C3", "A7", "B7", "A9", "C10"],
        )

        status, step0 = handle_merge_step({"action": "start"})
        self.assertEqual(status, 200)
        self.assertEqual(step0["current_step_index"], 0)

        status, step1 = handle_merge_step({"action": "next"})
        self.assertEqual(status, 200)
        self.assertEqual(step1["step"]["selected_job"]["job_id"], "B1")

        status, rep = handle_report()
        self.assertEqual(status, 200)
        self.assertEqual(rep["report"]["merge_status"], "SUCCESS")

        status, csv_text = generate_csv_report()
        self.assertEqual(status, 200)
        self.assertIn("PrintFlow Merge Report", csv_text)
        self.assertIn("B1", csv_text)

    # 17. Stress test: 200 departments and 1,000 total datapoints
    def test_17_200_departments_1000_jobs(self):
        raw = []
        d = 0
        while d < 200:
            code = f"D{d:03d}"
            jobs = []
            j = 0
            while j < 5:
                jobs.append({"job_id": f"{code}_J{j}", "submission_time": j * 50 + (d % 10)})
                j += 1
            raw.append({"department_code": code, "jobs": jobs})
            d += 1

        valid, queues, err, _ = parse_and_validate_queues(raw)
        self.assertTrue(valid, err)
        res = execute_merge(queues, capture_steps=False)
        self.assertTrue(res["success"])
        self.assertEqual(res["report"]["total_departments"], 200)
        self.assertEqual(res["report"]["total_input_jobs"], 1000)
        self.assertEqual(res["report"]["total_merged_jobs"], 1000)

        merged = res["merged_jobs"]
        idx = 0
        while idx < len(merged) - 1:
            curr = merged[idx]
            nxt = merged[idx + 1]
            self.assertLessEqual(
                (curr["submission_time"], curr["department_code"], curr["original_position"]),
                (nxt["submission_time"], nxt["department_code"], nxt["original_position"]),
            )
            idx += 1

    # 18. Unsorted user input is automatically ordered manually via linked-list merge sort
    def test_18_unsorted_input_auto_sorted_manually(self):
        raw = [
            {
                "department_code": "A",
                "jobs": [
                    {"job_id": "A9", "submission_time": 9},
                    {"job_id": "A5_first", "submission_time": 5},
                    {"job_id": "A2", "submission_time": 2},
                    {"job_id": "A5_second", "submission_time": 5},
                ],
            },
            {
                "department_code": "B",
                "jobs": [
                    {"job_id": "B7", "submission_time": 7},
                    {"job_id": "B1", "submission_time": 1},
                ],
            },
        ]
        valid, queues, err, detail = parse_and_validate_queues(raw, auto_sort=True)
        self.assertTrue(valid, err)
        self.assertEqual(detail["auto_sorted_departments"], ["A", "B"])

        res = execute_merge(queues)
        self.assertTrue(res["success"])
        self.assertEqual(
            extract_job_ids(res["merged_jobs"]),
            ["B1", "A2", "A5_first", "A5_second", "B7", "A9"],
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)
