import React, {useState} from 'react';
import {AlertTriangle, FolderPlus, Play, Plus, RotateCcw, Trash2, X} from 'lucide-react';
import type {DepartmentInput} from '../types/printflow';

interface DepartmentBuilderProps {
  departments: DepartmentInput[];
  onChangeDepartments: (next: DepartmentInput[]) => void;
  onLoadExample: (id: 'standard' | 'edge_cases') => void;
  onClearAll: () => void;
  onStartMerge: () => void;
  isMerging: boolean;
  validationError: string | null;
  autoSortedDepartments?: string[];
  invalidDepartmentCode?: string;
  invalidJobIndex?: number;
}

export const DepartmentBuilder: React.FC<DepartmentBuilderProps> = ({
  departments,
  onChangeDepartments,
  onLoadExample,
  onClearAll,
  onStartMerge,
  isMerging,
  validationError,
  autoSortedDepartments = [],
  invalidDepartmentCode,
  invalidJobIndex,
}) => {
  const [newDeptCode, setNewDeptCode] = useState('');
  const [deptInputError, setDeptInputError] = useState<string | null>(null);
  const [jobDrafts, setJobDrafts] = useState<Record<string, {jobId: string; time: string}>>({});
  const [jobDraftErrors, setJobDraftErrors] = useState<Record<string, string>>({});

  const suggestNextCode = (): string => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < alphabet.length; i++) {
      const candidate = alphabet[i];
      if (!departments.some((d) => d.department_code.toUpperCase() === candidate)) {
        return candidate;
      }
    }
    return `D${departments.length + 1}`;
  };

  const handleAddDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = (newDeptCode.trim() || suggestNextCode()).toUpperCase();
    if (!raw) {
      setDeptInputError('Enter a department code.');
      return;
    }
    if (departments.some((d) => d.department_code.toUpperCase() === raw)) {
      setDeptInputError(`Department "${raw}" already exists.`);
      return;
    }
    setDeptInputError(null);
    onChangeDepartments([...departments, {department_code: raw, jobs: []}]);
    setNewDeptCode('');
  };

  const handleRemoveDepartment = (code: string) => {
    onChangeDepartments(departments.filter((d) => d.department_code !== code));
  };

  const getDraft = (code: string, currentCount: number) => {
    if (jobDrafts[code]) {
      return jobDrafts[code];
    }
    return {
      jobId: `${code}${currentCount + 1}`,
      time: '',
    };
  };

  const updateDraft = (code: string, field: 'jobId' | 'time', value: string, currentCount: number) => {
    const prev = getDraft(code, currentCount);
    setJobDrafts({
      ...jobDrafts,
      [code]: {
        ...prev,
        [field]: value,
      },
    });
    if (jobDraftErrors[code]) {
      const nextErrors = {...jobDraftErrors};
      delete nextErrors[code];
      setJobDraftErrors(nextErrors);
    }
  };

  const handleAddJob = (e: React.FormEvent, deptCode: string) => {
    e.preventDefault();
    const targetDept = departments.find((d) => d.department_code === deptCode);
    if (!targetDept) return;

    const draft = getDraft(deptCode, targetDept.jobs.length);
    const trimmedId = draft.jobId.trim();
    const parsedTime = Number(draft.time);

    if (!trimmedId) {
      setJobDraftErrors({...jobDraftErrors, [deptCode]: 'Job ID is required.'});
      return;
    }
    if (draft.time.trim() === '' || Number.isNaN(parsedTime) || parsedTime < 0) {
      setJobDraftErrors({
        ...jobDraftErrors,
        [deptCode]: 'Enter a valid non-negative numeric timestamp.',
      });
      return;
    }

    const updated = departments.map((dept) => {
      if (dept.department_code !== deptCode) return dept;
      return {
        ...dept,
        jobs: [...dept.jobs, {job_id: trimmedId, submission_time: parsedTime}],
      };
    });

    onChangeDepartments(updated);
    setJobDrafts({
      ...jobDrafts,
      [deptCode]: {
        jobId: `${deptCode}${targetDept.jobs.length + 2}`,
        time: '',
      },
    });
  };

  const handleRemoveJob = (deptCode: string, jobIndex: number) => {
    const updated = departments.map((dept) => {
      if (dept.department_code !== deptCode) return dept;
      return {
        ...dept,
        jobs: dept.jobs.filter((_, idx) => idx !== jobIndex),
      };
    });
    onChangeDepartments(updated);
  };

  return (
    <section id="queue-input" className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-100">
            Department Queue Input
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Add print jobs in any timestamp order — out-of-order queues are automatically ordered via manual linked-list merge sort before K-way consolidation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onLoadExample('standard')}
            className="px-3.5 py-2 text-xs font-medium text-slate-200 bg-[#162038] border border-slate-700/80 rounded-lg hover:border-sky-400/60 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Load Example
          </button>
          <button
            type="button"
            onClick={() => onLoadExample('edge_cases')}
            className="px-3.5 py-2 text-xs font-medium text-slate-200 bg-[#162038] border border-slate-700/80 rounded-lg hover:border-sky-400/60 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Load Edge-Case Example
          </button>
          <button
            type="button"
            onClick={onClearAll}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-300 bg-transparent border border-slate-700/80 rounded-lg hover:border-rose-500/60 hover:text-rose-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear All
          </button>
        </div>
      </div>

      {/* Add Department Bar */}
      <form
        onSubmit={handleAddDepartment}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#111A2E] border border-slate-800/90"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
          <label htmlFor="new-dept-code" className="text-sm font-medium text-slate-300 whitespace-nowrap">
            New Department Code
          </label>
          <input
            id="new-dept-code"
            type="text"
            maxLength={10}
            value={newDeptCode}
            onChange={(e) => {
              setNewDeptCode(e.target.value);
              if (deptInputError) setDeptInputError(null);
            }}
            placeholder={`e.g. ${suggestNextCode()}`}
            className="w-full sm:w-44 px-3 py-2 text-sm font-mono bg-[#0B1120] border border-slate-700/90 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 rounded-lg hover:bg-sky-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" />
            Add Department
          </button>
          {deptInputError && (
            <span className="text-xs text-rose-400 font-medium">{deptInputError}</span>
          )}
        </div>

        <button
          type="button"
          onClick={onStartMerge}
          disabled={isMerging || departments.length === 0}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Play className="w-4 h-4 fill-current" />
          {isMerging ? 'Consolidating Queues...' : 'Start Queue Consolidation'}
        </button>
      </form>

      {/* Backend Validation Error Banner */}
      {validationError && (
        <div
          role="alert"
          className="flex items-start gap-3 p-4 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-200"
        >
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-rose-300">Input Validation Failed</p>
            <p>{validationError}</p>
          </div>
        </div>
      )}

      {/* Auto-Ordered Info Notice */}
      {!validationError && autoSortedDepartments.length > 0 && (
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-sky-950/35 border border-sky-500/40 text-sky-200 text-xs sm:text-sm">
          <span>
            Out-of-order jobs in{' '}
            <span className="font-mono font-semibold text-sky-300">
              {autoSortedDepartments.map((c) => `Department ${c}`).join(', ')}
            </span>{' '}
            were automatically ordered by timestamp using manual linked-list merge sort (preserving input order on equal timestamps).
          </span>
        </div>
      )}

      {/* Department Cards Grid */}
      {departments.length === 0 ? (
        <div className="p-8 text-center rounded-xl bg-[#111A2E] border border-slate-800/90">
          <p className="text-sm text-slate-300">
            No departments configured yet. Add a department above or load one of the demonstration datasets.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {departments.map((dept) => {
            const draft = getDraft(dept.department_code, dept.jobs.length);
            const hasDeptError = invalidDepartmentCode === dept.department_code;

            return (
              <div
                key={dept.department_code}
                className={`flex flex-col justify-between p-5 rounded-xl bg-[#111A2E] border transition-colors ${
                  hasDeptError ? 'border-rose-500/70' : 'border-slate-800/90'
                }`}
              >
                <div>
                  {/* Card Top */}
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800/80">
                    <div>
                      <h3 className="text-base font-semibold text-slate-100">
                        Department {dept.department_code}
                      </h3>
                      <p className="text-xs text-slate-400 font-mono tabular-nums mt-0.5">
                        {dept.jobs.length} {dept.jobs.length === 1 ? 'print job' : 'print jobs'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveDepartment(dept.department_code)}
                      aria-label={`Remove Department ${dept.department_code}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  </div>

                  {/* Existing Jobs List */}
                  <div className="space-y-2 mb-4 max-h-56 overflow-y-auto queue-scroll pr-1">
                    {dept.jobs.length === 0 ? (
                      <div className="py-4 text-center rounded-lg bg-[#0B1120]/70 border border-dashed border-slate-800 text-xs text-slate-500 font-mono">
                        Empty Queue (head → NULL)
                      </div>
                    ) : (
                      dept.jobs.map((job, idx) => {
                        const isInvalidNode = hasDeptError && invalidJobIndex === idx;
                        return (
                          <div
                            key={`${dept.department_code}-${idx}-${job.job_id}`}
                            className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-mono tabular-nums ${
                              isInvalidNode
                                ? 'bg-rose-950/40 border-rose-500/70 text-rose-200'
                                : 'bg-[#0B1120] border-slate-800/90 text-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-slate-500">#{idx}</span>
                              <span className="font-semibold text-sky-300 truncate">
                                {job.job_id}
                              </span>
                              <span className="text-slate-600" aria-hidden="true">
                                ·
                              </span>
                              <span className="text-slate-300">t={job.submission_time}</span>
                              {isInvalidNode && (
                                <span className="text-rose-400 font-sans font-medium">
                                  Out of order
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveJob(dept.department_code, idx)}
                              aria-label={`Remove job ${job.job_id}`}
                              className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer shrink-0"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Add Print Job Form */}
                <form
                  onSubmit={(e) => handleAddJob(e, dept.department_code)}
                  className="pt-3 border-t border-slate-800/80 space-y-2"
                >
                  <div className="grid grid-cols-12 gap-2">
                    <input
                      type="text"
                      value={draft.jobId}
                      onChange={(e) =>
                        updateDraft(dept.department_code, 'jobId', e.target.value, dept.jobs.length)
                      }
                      placeholder="Job ID"
                      aria-label={`Job ID for Department ${dept.department_code}`}
                      className="col-span-5 px-2.5 py-2 text-xs font-mono bg-[#0B1120] border border-slate-700/80 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                    />
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={draft.time}
                      onChange={(e) =>
                        updateDraft(dept.department_code, 'time', e.target.value, dept.jobs.length)
                      }
                      placeholder="Time"
                      aria-label={`Timestamp for Department ${dept.department_code}`}
                      className="col-span-4 px-2.5 py-2 text-xs font-mono tabular-nums bg-[#0B1120] border border-slate-700/80 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                    />
                    <button
                      type="submit"
                      className="col-span-3 inline-flex items-center justify-center gap-1 px-2 py-2 text-xs font-medium text-sky-100 bg-sky-600/30 border border-sky-500/40 rounded-lg hover:bg-sky-600/50 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add
                    </button>
                  </div>
                  {jobDraftErrors[dept.department_code] && (
                    <p className="text-xs text-rose-400">{jobDraftErrors[dept.department_code]}</p>
                  )}
                </form>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
