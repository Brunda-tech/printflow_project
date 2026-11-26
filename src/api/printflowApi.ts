import type {
  DepartmentInput,
  ExampleApiResponse,
  MergeReport,
  MergeResponse,
  MergeStep,
  PrintJobNodeData,
  QueueValidationResponse,
} from '../types/printflow';

async function parseJsonSafe<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Unexpected response from server (${response.status})`);
  }
}

export async function fetchHealth(): Promise<{status: string; service: string; algorithm: string}> {
  const res = await fetch('/api/health');
  if (!res.ok) {
    throw new Error('Backend health check failed.');
  }
  return parseJsonSafe(res);
}

export async function fetchExamples(datasetId?: string): Promise<ExampleApiResponse> {
  const url = datasetId ? `/api/example?id=${encodeURIComponent(datasetId)}` : '/api/example';
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to load example datasets.');
  }
  return parseJsonSafe(res);
}

export async function validateQueues(
  departments: DepartmentInput[],
): Promise<QueueValidationResponse> {
  const res = await fetch('/api/queues', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({departments}),
  });
  return parseJsonSafe(res);
}

export async function runMerge(departments: DepartmentInput[]): Promise<MergeResponse> {
  const res = await fetch('/api/merge', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({departments, capture_steps: true}),
  });
  return parseJsonSafe(res);
}

export async function fetchMergeStep(
  action: 'start' | 'next' | 'prev' | 'reset' | 'jump',
  stepIndex?: number,
): Promise<{
  success: boolean;
  current_step_index: number;
  total_steps: number;
  step: MergeStep;
  report: MergeReport;
  error?: string;
}> {
  const res = await fetch('/api/merge/step', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({action, step_index: stepIndex}),
  });
  return parseJsonSafe(res);
}

export function downloadCsvReport(report: MergeReport, mergedJobs: PrintJobNodeData[]): void {
  const rows: Array<Array<string | number>> = [
    ['PrintFlow Merge Report'],
    ['Metric', 'Value'],
    ['Total Departments', report.total_departments],
    ['Total Input Jobs', report.total_input_jobs],
    ['Total Merged Jobs', report.total_merged_jobs],
    ['Heap Insertions', report.heap_insertions],
    ['Heap Removals', report.heap_removals],
    ['Algorithm Comparisons', report.comparisons],
    ['Empty Queues', report.empty_queues],
    ['Merge Status', report.merge_status],
    ['Time Complexity', report.time_complexity],
    ['Space Complexity', report.space_complexity],
    [],
    ['Final Merged Timeline'],
    ['Final Position', 'Job ID', 'Department', 'Submission Timestamp', 'Original Position'],
  ];

  for (const job of mergedJobs) {
    rows.push([
      job.final_position ?? 0,
      job.job_id,
      job.department_code,
      job.submission_time,
      job.original_position,
    ]);
  }

  const csv = rows
    .map((row) =>
      row
        .map((value) => {
          const text = String(value).replace(/"/g, '""');
          return /[",\r\n]/.test(text) ? `"${text}"` : text;
        })
        .join(','),
    )
    .join('\r\n');
  const csvBlob = new Blob([`${csv}\r\n`], {type: 'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(csvBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'printflow_merge_report.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

