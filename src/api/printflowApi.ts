import type {
  DepartmentInput,
  ExampleApiResponse,
  MergeReport,
  MergeResponse,
  MergeStep,
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

export async function downloadCsvReport(): Promise<void> {
  const res = await fetch('/api/report?format=csv');
  if (!res.ok) {
    throw new Error('Run queue consolidation before downloading the CSV report.');
  }
  const csvBlob = await res.blob();
  const url = URL.createObjectURL(csvBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'printflow_merge_report.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

