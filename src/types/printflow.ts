export interface PrintJobInput {
  job_id: string;
  submission_time: number;
}

export interface DepartmentInput {
  department_code: string;
  jobs: PrintJobInput[];
}

export interface PrintJobNodeData {
  job_id: string;
  department_code: string;
  submission_time: number;
  original_position: number;
  final_position?: number;
}

export interface HeapNodeSnapshot extends PrintJobNodeData {
  heap_index: number;
}

export interface MergeStep {
  step_number: number;
  phase: 'initialized' | 'merge_step';
  explanation: string;
  reason_type:
    | 'init'
    | 'min_timestamp'
    | 'department_tiebreak'
    | 'position_tiebreak'
    | 'sole_candidate';
  selected_job: PrintJobNodeData | null;
  inserted_job: PrintJobNodeData | null;
  heap_before: HeapNodeSnapshot[];
  heap_after: HeapNodeSnapshot[];
  merged_so_far: PrintJobNodeData[];
  department_pointers: Record<string, number>;
  comparisons_so_far: number;
  insertions_so_far: number;
  removals_so_far: number;
}

export interface MergeReport {
  total_departments: number;
  total_input_jobs: number;
  total_merged_jobs: number;
  heap_insertions: number;
  heap_removals: number;
  comparisons: number;
  empty_queues: number;
  merge_status: string;
  counts_verified: boolean;
  time_complexity: string;
  space_complexity: string;
  execution_time_ms: number;
}

export interface InitialQueueSnapshot {
  department_code: string;
  job_count: number;
  jobs: PrintJobNodeData[];
}

export interface MergeResponse {
  success: boolean;
  error: string | null;
  detail?: {
    department_code?: string;
    invalid_job_index?: number;
  };
  merged_jobs: PrintJobNodeData[];
  report: MergeReport;
  steps: MergeStep[];
  initial_queues: InitialQueueSnapshot[];
  auto_sorted_departments?: string[];
}

export interface QueueValidationResponse {
  valid: boolean;
  error?: string;
  detail?: {
    department_code?: string;
    invalid_job_index?: number;
  };
  total_departments?: number;
  total_jobs?: number;
  linked_lists?: InitialQueueSnapshot[];
  auto_sorted_departments?: string[];
}

export interface ExampleDataset {
  id: string;
  name: string;
  description: string;
  expected_order: string[];
  departments: DepartmentInput[];
}

export interface ExampleApiResponse {
  dataset: ExampleDataset;
  datasets: Record<string, ExampleDataset>;
}
