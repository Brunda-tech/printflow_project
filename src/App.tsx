import {useCallback, useEffect, useMemo, useState} from 'react';
import {Play} from 'lucide-react';
import {fetchExamples, runMerge, validateQueues} from './api/printflowApi';
import {DepartmentBuilder} from './components/DepartmentBuilder';
import {LinkedListVisualizer} from './components/LinkedListVisualizer';
import {MergedTimelineSection} from './components/MergedTimelineSection';
import {StepSimulator} from './components/StepSimulator';
import type {DepartmentInput, MergeResponse} from './types/printflow';

export default function App() {
  const [departments, setDepartments] = useState<DepartmentInput[]>([]);
  const [orderedDepartments, setOrderedDepartments] = useState<DepartmentInput[]>([]);
  const [autoSortedDepartments, setAutoSortedDepartments] = useState<string[]>([]);
  const [mergeResult, setMergeResult] = useState<MergeResponse | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [invalidDeptCode, setInvalidDeptCode] = useState<string | undefined>(undefined);
  const [invalidJobIdx, setInvalidJobIdx] = useState<number | undefined>(undefined);
  const [isMerging, setIsMerging] = useState(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);

  const loadDataset = useCallback(async (id: 'standard' | 'edge_cases', autoMerge = false) => {
    try {
      const data = await fetchExamples(id);
      const loadedDepts = data.dataset.departments;
      setDepartments(loadedDepts);
      setOrderedDepartments(loadedDepts);
      setAutoSortedDepartments([]);
      setValidationError(null);
      setInvalidDeptCode(undefined);
      setInvalidJobIdx(undefined);

      if (autoMerge) {
        const res = await runMerge(loadedDepts);
        if (res.success) {
          setMergeResult(res);
          if (res.initial_queues && res.initial_queues.length > 0) {
            setOrderedDepartments(
              res.initial_queues.map((q) => ({
                department_code: q.department_code,
                jobs: q.jobs.map((j) => ({
                  job_id: j.job_id,
                  submission_time: j.submission_time,
                })),
              })),
            );
          }
          setAutoSortedDepartments(res.auto_sorted_departments ?? []);
        }
      } else {
        setMergeResult(null);
      }
    } catch (err) {
      setValidationError(
        err instanceof Error ? err.message : 'Unable to connect to PrintFlow Python backend.',
      );
    } finally {
      setIsLoadingInitial(false);
    }
  }, []);

  useEffect(() => {
    loadDataset('standard', true);
  }, [loadDataset]);

  const handleDepartmentsChange = async (next: DepartmentInput[]) => {
    setDepartments(next);
    setMergeResult(null);

    if (next.length === 0) {
      setOrderedDepartments([]);
      setAutoSortedDepartments([]);
      setValidationError(null);
      setInvalidDeptCode(undefined);
      setInvalidJobIdx(undefined);
      return;
    }

    try {
      const res = await validateQueues(next);
      if (!res.valid) {
        setOrderedDepartments(next);
        setAutoSortedDepartments([]);
        setValidationError(res.error || 'One or more department queues contain invalid inputs.');
        setInvalidDeptCode(res.detail?.department_code);
        setInvalidJobIdx(res.detail?.invalid_job_index);
      } else {
        setValidationError(null);
        setInvalidDeptCode(undefined);
        setInvalidJobIdx(undefined);
        setAutoSortedDepartments(res.auto_sorted_departments ?? []);
        if (res.linked_lists) {
          setOrderedDepartments(
            res.linked_lists.map((q) => ({
              department_code: q.department_code,
              jobs: q.jobs.map((j) => ({
                job_id: j.job_id,
                submission_time: j.submission_time,
              })),
            })),
          );
        } else {
          setOrderedDepartments(next);
        }
      }
    } catch {
      setOrderedDepartments(next);
    }
  };

  const handleClearAll = () => {
    setDepartments([]);
    setOrderedDepartments([]);
    setAutoSortedDepartments([]);
    setMergeResult(null);
    setValidationError(null);
    setInvalidDeptCode(undefined);
    setInvalidJobIdx(undefined);
  };

  const handleStartMerge = async () => {
    setIsMerging(true);
    setValidationError(null);
    setInvalidDeptCode(undefined);
    setInvalidJobIdx(undefined);

    try {
      const res = await runMerge(departments);
      if (!res.success) {
        setValidationError(res.error || 'Merge validation failed.');
        setInvalidDeptCode(res.detail?.department_code);
        setInvalidJobIdx(res.detail?.invalid_job_index);
        setMergeResult(null);
        return;
      }
      setMergeResult(res);
      setAutoSortedDepartments(res.auto_sorted_departments ?? []);
      if (res.initial_queues && res.initial_queues.length > 0) {
        setOrderedDepartments(
          res.initial_queues.map((q) => ({
            department_code: q.department_code,
            jobs: q.jobs.map((j) => ({
              job_id: j.job_id,
              submission_time: j.submission_time,
            })),
          })),
        );
      }
    } catch (err) {
      setValidationError(
        err instanceof Error ? err.message : 'Failed to execute consolidation.',
      );
    } finally {
      setIsMerging(false);
    }
  };

  const totalInputJobs = useMemo(
    () => departments.reduce((sum, dept) => sum + dept.jobs.length, 0),
    [departments],
  );

  const mergedCount = mergeResult?.report.total_merged_jobs ?? 0;
  const comparisonCount = mergeResult?.report.comparisons ?? 0;

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100">
      {/* Top Bar Contract: [Brand title] — [4 single-line nav links] — [1 primary action] */}
      <header className="sticky top-0 z-30 bg-[#0B1120]/95 backdrop-blur border-b border-slate-800/90">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between gap-8">
          <a
            href="#top"
            className="font-display text-lg font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0"
          >
            PrintFlow
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
            <a
              href="#queue-input"
              className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
            >
              Queue Input
            </a>
            <a
              href="#linked-lists"
              className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
            >
              Linked Lists
            </a>
            <a
              href="#step-simulator"
              className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
            >
              Step Simulator
            </a>
            <a
              href="#merged-timeline"
              className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
            >
              Merged Timeline
            </a>
          </nav>

          <button
            type="button"
            onClick={handleStartMerge}
            disabled={isMerging || departments.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-500 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {isMerging ? 'Consolidating...' : 'Start Queue Consolidation'}
          </button>
        </div>
      </header>

      <main id="top" className="max-w-7xl mx-auto px-6 py-10 space-y-12">
        {/* Hero / Title Header */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="max-w-3xl space-y-2">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-100 text-balance">
                PrintFlow — Smart Print Queue Consolidation
              </h1>
              <p className="text-base text-slate-400">
                Merge multiple department queues into one reliable print timeline.
              </p>
              <div className="pt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span>Custom Singly Linked Lists</span>
                <span aria-hidden="true">·</span>
                <span>Manual Binary Min-Heap</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-sky-300">O(N log K) Time</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-sky-300">O(K) Auxiliary Space</span>
              </div>
            </div>

          </div>

          {/* 4-Column Statistics Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl bg-[#111A2E] border border-slate-800/90">
              <div className="text-xs font-medium text-slate-400">Departments</div>
              <div className="mt-2 text-2xl font-semibold font-mono tabular-nums text-slate-100">
                {departments.length}
              </div>
            </div>

            <div className="p-5 rounded-xl bg-[#111A2E] border border-slate-800/90">
              <div className="text-xs font-medium text-slate-400">Total Print Jobs</div>
              <div className="mt-2 text-2xl font-semibold font-mono tabular-nums text-slate-100">
                {totalInputJobs}
              </div>
            </div>

            <div className="p-5 rounded-xl bg-[#111A2E] border border-slate-800/90">
              <div className="text-xs font-medium text-slate-400">Merged Jobs</div>
              <div className="mt-2 text-2xl font-semibold font-mono tabular-nums text-emerald-300">
                {mergedCount}
              </div>
            </div>

            <div className="p-5 rounded-xl bg-[#111A2E] border border-slate-800/90">
              <div className="text-xs font-medium text-slate-400">Algorithm Comparisons</div>
              <div className="mt-2 text-2xl font-semibold font-mono tabular-nums text-sky-300">
                {comparisonCount}
              </div>
            </div>
          </div>
        </section>

        <hr className="border-slate-800/70" />

        {isLoadingInitial ? (
          <div className="p-10 rounded-xl bg-[#111A2E] border border-slate-800/90 text-center text-sm text-slate-400">
            Initializing PrintFlow Python engine and loading sample queues...
          </div>
        ) : (
          <>
            {/* Section 1: Department Queue Builder */}
            <DepartmentBuilder
              departments={departments}
              onChangeDepartments={handleDepartmentsChange}
              onLoadExample={(id) => loadDataset(id, true)}
              onClearAll={handleClearAll}
              onStartMerge={handleStartMerge}
              isMerging={isMerging}
              validationError={validationError}
              autoSortedDepartments={autoSortedDepartments}
              invalidDepartmentCode={invalidDeptCode}
              invalidJobIndex={invalidJobIdx}
            />

            <hr className="border-slate-800/70" />

            {/* Section 2: Linked List Visualization */}
            <section id="linked-lists">
              <LinkedListVisualizer departments={orderedDepartments} />
            </section>

            <hr className="border-slate-800/70" />

            {/* Section 3: Interactive Step-by-Step Merge Simulator */}
            <StepSimulator
              departments={orderedDepartments}
              steps={mergeResult?.steps ?? []}
              onStartMerge={handleStartMerge}
              hasMergeResult={Boolean(mergeResult)}
            />

            <hr className="border-slate-800/70" />

            {/* Section 4: Final Merged Timeline & Report */}
            <MergedTimelineSection
              mergedJobs={mergeResult?.merged_jobs ?? []}
              report={mergeResult?.report ?? null}
            />
          </>
        )}
      </main>

      <footer className="mt-16 border-t border-slate-800/80 py-6">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>PrintFlow — Linked List & Custom Binary Min-Heap Queue Consolidation</span>
          <div className="flex items-center gap-4">
            <span className="hidden md:inline">
              Tie-break rule: Timestamp ASC → Department Code ASC → Original Input Position ASC
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
