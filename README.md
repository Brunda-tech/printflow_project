# PrintFlow — Smart Print Queue Consolidation Simulator

**Problem Statement:** *The Printing Office's Conflicting Logs*  
**Domain:** Linked Lists & Priority Processing.

PrintFlow is a full-stack data structures and algorithms application that merges $K$ pre-sorted department print queues (stored as custom singly linked lists) into a single consolidated print timeline in **$O(N \log K)$** time and **$O(K)$** auxiliary heap space — without ever using built-in sorting functions (`sort()`, `sorted()`) or built-in priority queue libraries (`heapq`, `PriorityQueue`).

---

## Key Algorithm Rules

1. **Ascending Submission Time:** Print jobs with smaller `submission_time` are processed first.
2. **Department Code Tie-Breaker:** When two jobs have identical timestamps, the job from the smaller alphabetical `department_code` (e.g., `A` before `B`) comes first.
3. **Intra-Department Stability:** When two jobs from the same department share an identical timestamp, their `original_position` preserves original input order.
4. **Strict Validation:** Every department queue is validated manually to ensure it is already sorted. Unsorted inputs produce a clear validation error instead of silently sorting.
5. **No Lost or Altered Jobs:** All job identifiers remain untouched and `total_input_jobs == total_merged_jobs` is strictly verified.

---

## Project Structure

```text
├── backend/
│   ├── __init__.py          # Python package marker
│   ├── linked_list.py       # PrintJobNode, DepartmentQueue, MergedPrintList
│   ├── custom_min_heap.py   # CustomMinHeap (manual heapify_up, heapify_down, compare_jobs)
│   ├── merge_engine.py      # K-way linked list merge algorithm, validation, step tracer, examples
│   ├── api_service.py       # Shared stateful REST handlers & CSV generator
│   ├── app.py               # Flask REST API server
│   ├── wsgi_fallback.py     # Zero-dependency Python stdlib HTTP fallback bridge
│   └── test_merge.py        # 15+ unit & 100,000-job benchmark test suite
├── src/
│   ├── api/printflowApi.ts
│   ├── components/
│   │   ├── DepartmentBuilder.tsx
│   │   ├── LinkedListVisualizer.tsx
│   │   ├── MinHeapVisualizer.tsx
│   │   ├── StepSimulator.tsx
│   │   └── MergedTimelineSection.tsx
│   ├── types/printflow.ts
│   ├── App.tsx
│   └── index.css
├── server.ts                # Express + Vite bridge spawning Python backend on dev/prod
├── requirements.txt         # Flask & flask-cors
└── package.json
```

---

## REST API Endpoints

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Check backend status and algorithm summary |
| `GET` | `/api/example` | Fetch built-in demonstration datasets (`standard` and `edge_cases`) |
| `POST` | `/api/queues` | Build department linked lists and validate sorted order |
| `POST` | `/api/merge` | Run the custom $O(N \log K)$ merge engine and return report + trace |
| `POST` | `/api/merge/step` | Navigate step-by-step visualization state (`start`, `next`, `prev`, `reset`, `jump`) |
| `GET` | `/api/report` | Retrieve latest JSON merge report, or CSV via `/api/report?format=csv` |

---

## How to Install and Run on Windows

### Prerequisites
- **Python 3.10+** (Ensure *"Add Python to PATH"* is checked during installation)
- **Node.js 18+** (Includes `npm`)

### 1. Clone or Open the Project Folder
Open **Command Prompt** or **PowerShell** inside the project root directory:
```powershell
cd path\to\printflow
```

### 2. Set Up the Python Flask Backend
```powershell
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Install Frontend Dependencies
```powershell
npm install
```

### 4. Run the Application

#### Option A: Single-Command Full-Stack Launch (Recommended)
Starts the Express/Vite web UI on `http://localhost:3000` and automatically spawns the Python Flask backend:
```powershell
npm run dev
```
Open your browser and visit **`http://localhost:3000`**.

#### Option B: Run Flask Backend Standalone (Port 5000)
If you want to query or test the Flask server directly:
```powershell
venv\Scripts\activate
python backend\app.py
```
Flask will listen on **`http://localhost:5000`**.

---

## Running the Test Suite (All 15+ Test Cases + 100k Benchmark)

Run the Python `unittest` suite from the project root:
```powershell
python -m unittest backend/test_merge.py -v
```

This verifies:
- Normal multi-department merge (`B1, A2, C3, A7, B7, A9, C10`)
- Empty departments & all-empty departments
- Single department queues & uneven queue sizes
- Cross-department and intra-department duplicate timestamps
- Exact preservation of special job identifiers
- 50+ departments and **100,000 total jobs** stress benchmark
- Rejection of unsorted input queues without silent sorting
- End-to-end API route verification..
