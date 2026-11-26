import React, {useMemo, useState} from 'react';
import {ArrowDown, CheckCircle2, Download, Search, XCircle} from 'lucide-react';
import {downloadCsvReport} from '../api/printflowApi';
import type {MergeReport, PrintJobNodeData} from '../types/printflow';

interface MergedTimelineSectionProps {
  mergedJobs: PrintJobNodeData[];
  report: MergeReport | null;
}

export const MergedTimelineSection: React.FC<MergedTimelineSectionProps> = ({
  mergedJobs,
  report,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const uniqueDepartments = useMemo(() => {
    const seen = new Set<string>();
    for (const job of mergedJobs) {
      seen.add(job.department_code);
    }
    return Array.from(seen);
  }, [mergedJobs]);

  const filteredJobs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return mergedJobs.filter((job) => {
      const matchesDept = deptFilter === 'ALL' || job.department_code === deptFilter;
      const matchesSearch =
        q === '' ||
        job.job_id.toLowerCase().includes(q) ||
        job.department_code.toLowerCase().includes(q) ||
        String(job.submission_time).includes(q);
      return matchesDept && matchesSearch;
    });
  }, [mergedJobs, searchQuery, deptFilter]);

  const departmentServeSummary = useMemo(() => {
    const byDept = new Map<string, Array<{jobId: string; position: number; time: number}>>();
    for (let i = 0; i < mergedJobs.length; i++) {
      const job = mergedJobs[i];
      const pos = job.final_position ?? i + 1;
      const list = byDept.get(job.department_code) ?? [];
      list.push({jobId: job.job_id, position: pos, time: job.submission_time});
      byDept.set(job.department_code, list);
    }
    return Array.from(byDept.entries()).map(([department_code, items]) => ({
      department_code,
      items,
    }));
  }, [mergedJobs]);

  const handleDownloadCsv = async () => {
    try {
      setDownloadError(null);
      await downloadCsvReport();
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Failed to download CSV report.');
    }
  };

  if (!report) {
    return (
      <section id="merged-timeline" className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-100">
            Final Merged Timeline & Merge Report
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Consolidated linked list output, complexity metrics, and downloadable CSV report will appear here after running consolidation.
          </p>
        </div>
        <div className="p-8 rounded-xl bg-[#111A2E] border border-slate-800/90 text-center text-sm text-slate-400">
          No consolidation run executed yet.
        </div>
      </section>
    );
  }

  return (
    <section id="merged-timeline" className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-100">
            Final Merged Timeline & Merge Report
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Complete consolidated print order verified by custom linked list and min-heap traversal.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadCsv}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-950 bg-sky-400 rounded-lg hover:bg-sky-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          Download Merge Report (CSV)
        </button>
      </div>

      {downloadError && (
        <p className="text-xs text-rose-400">{downloadError}</p>
      )}

      {/* Overall Print Service Order + Vertical Consolidated Linked List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Vertical Linked List Chain */}
        <div className="lg:col-span-7 p-5 rounded-xl bg-[#111A2E] border border-slate-800/90 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Final Consolidated Linked List (Vertical Service Order)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Top-to-bottom print order showing which job and department is served first through last.
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums text-slate-400 shrink-0">
              {mergedJobs.length} nodes → NULL
            </span>
          </div>

          {mergedJobs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-xs font-mono">
              <span className="px-3 py-1.5 rounded-md bg-[#0B1120] border border-slate-800 text-slate-400">
                merged_head
              </span>
              <ArrowDown className="w-4 h-4 text-slate-600" />
              <span className="px-4 py-1.5 rounded-md bg-[#0B1120] border border-slate-800 text-slate-400">
                NULL (Empty Timeline)
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center max-h-[520px] overflow-y-auto queue-scroll pr-1 py-1">
              {mergedJobs.slice(0, 100).map((job, idx) => {
                const pos = job.final_position ?? idx + 1;
                const isFirst = idx === 0;
                const isLast = idx === mergedJobs.length - 1;
                return (
                  <React.Fragment key={`final-v-${idx}-${job.job_id}`}>
                    <div
                      className={`w-full max-w-lg px-4 py-3 rounded-lg border text-xs font-mono tabular-nums flex items-center justify-between gap-3 ${
                        isFirst
                          ? 'bg-emerald-950/45 border-emerald-500/60 text-emerald-100'
                          : isLast
                            ? 'bg-sky-950/35 border-sky-500/50 text-sky-100'
                            : 'bg-[#0B1120] border-slate-700/90 text-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-slate-400 font-semibold w-8 shrink-0">
                          #{pos}
                        </span>
                        <span className="font-semibold text-sm text-sky-300 truncate">
                          {job.job_id}
                        </span>
                        <span className="text-slate-500" aria-hidden="true">
                          ·
                        </span>
                        <span className="text-slate-200 whitespace-nowrap">
                          Department {job.department_code}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-slate-400">
                        <span>Time: {job.submission_time}</span>
                        {isFirst && (
                          <span className="font-sans font-semibold text-emerald-300">
                            First Served
                          </span>
                        )}
                        {!isFirst && isLast && (
                          <span className="font-sans font-semibold text-sky-300">
                            Last Served
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowDown className="w-4 h-4 text-slate-500 my-1 shrink-0" />
                  </React.Fragment>
                );
              })}
              {mergedJobs.length > 100 && (
                <div className="mb-2 text-xs text-slate-400 font-sans">
                  Showing first 100 nodes vertically — inspect all {mergedJobs.length} rows in the table below.
                </div>
              )}
              <div className="px-4 py-2 rounded-lg bg-[#0B1120] border border-slate-800 text-xs font-mono text-slate-400">
                NULL
              </div>
            </div>
          )}
        </div>

        {/* Per-Department Serve Summary */}
        <div className="lg:col-span-5 p-5 rounded-xl bg-[#111A2E] border border-slate-800/90 space-y-4">
          <div className="pb-3 border-b border-slate-800/80">
            <h3 className="text-base font-semibold text-slate-100">
              Serve Order by Department
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Which positions each department received in the consolidated timeline.
            </p>
          </div>

          {mergedJobs.length === 0 ? (
            <p className="text-xs text-slate-400">No jobs served.</p>
          ) : (
            <div className="space-y-2.5 max-h-[520px] overflow-y-auto queue-scroll pr-1">
              {departmentServeSummary.map((entry) => (
                <div
                  key={`dept-summary-${entry.department_code}`}
                  className="p-3.5 rounded-lg bg-[#0B1120] border border-slate-800/90 space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between font-mono">
                    <span className="font-semibold text-slate-100">
                      Department {entry.department_code}
                    </span>
                    <span className="text-slate-400 tabular-nums">
                      {entry.items.length} served
                    </span>
                  </div>
                  <div className="font-mono text-slate-300 tabular-nums leading-relaxed">
                    {entry.items
                      .map((it) => `#${it.position} ${it.jobId} (t=${it.time})`)
                      .join(' → ')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Merge Report Summary Grid */}
      <div className="p-5 rounded-xl bg-[#111A2E] border border-slate-800/90 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
          <h3 className="text-base font-semibold text-slate-100">
            Execution & Verification Report
          </h3>
          <div
            className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
              report.counts_verified ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {report.counts_verified ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
            <span>{report.merge_status}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-sm">
          <div className="space-y-1">
            <div className="text-xs text-slate-400">Total Departments</div>
            <div className="font-mono font-semibold text-slate-100 tabular-nums">
              {report.total_departments}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-slate-400">Total Input Jobs</div>
            <div className="font-mono font-semibold text-slate-100 tabular-nums">
              {report.total_input_jobs}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-slate-400">Total Merged Jobs</div>
            <div className="font-mono font-semibold text-emerald-300 tabular-nums">
              {report.total_merged_jobs}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-slate-400">Heap Insertions</div>
            <div className="font-mono font-semibold text-slate-100 tabular-nums">
              {report.heap_insertions}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-slate-400">Heap Removals</div>
            <div className="font-mono font-semibold text-slate-100 tabular-nums">
              {report.heap_removals}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-slate-400">Comparisons</div>
            <div className="font-mono font-semibold text-sky-300 tabular-nums">
              {report.comparisons}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-slate-400">Empty Queues</div>
            <div className="font-mono font-semibold text-slate-100 tabular-nums">
              {report.empty_queues}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-slate-400">Time Complexity</div>
            <div className="font-mono font-semibold text-slate-100">
              {report.time_complexity}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-slate-400">Space Complexity</div>
            <div className="font-mono font-semibold text-slate-100">
              {report.space_complexity}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-slate-400">Backend Runtime</div>
            <div className="font-mono font-semibold text-slate-100 tabular-nums">
              {report.execution_time_ms} ms
            </div>
          </div>
        </div>
      </div>

      {/* Consolidated Job Schedule Table */}
      <div className="rounded-xl bg-[#111A2E] border border-slate-800/90 overflow-hidden">
        <div className="p-4 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-slate-100">
            Consolidated Print Order Table
          </h3>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter Job ID or timestamp..."
                className="pl-8 pr-3 py-1.5 text-xs bg-[#0B1120] border border-slate-700/80 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-[#0B1120] border border-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => setDeptFilter('ALL')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  deptFilter === 'ALL'
                    ? 'bg-sky-500/20 text-sky-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All
              </button>
              {uniqueDepartments.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setDeptFilter(code)}
                  className={`px-2.5 py-1 text-xs font-mono rounded-md transition-colors cursor-pointer ${
                    deptFilter === code
                      ? 'bg-sky-500/20 text-sky-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/80 bg-[#0B1120]/60 text-xs font-medium text-slate-400">
                <th className="py-3 px-4">Job ID</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4 text-right">Timestamp</th>
                <th className="py-3 px-4 text-right">Original Input Index</th>
                <th className="py-3 px-4 text-right">Final Position</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-xs text-slate-400">
                    No matching print jobs found.
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job, idx) => (
                  <tr
                    key={`row-${idx}-${job.job_id}`}
                    className="hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-2.5 px-4 font-mono font-semibold text-sky-300">
                      {job.job_id}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-200">
                      {job.department_code}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-200">
                      {job.submission_time}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-400">
                      {job.original_position}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-emerald-300">
                      {job.final_position ?? idx + 1}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
