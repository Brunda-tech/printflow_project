import React from 'react';
import {ArrowRight} from 'lucide-react';
import type {DepartmentInput, PrintJobNodeData} from '../types/printflow';

interface LinkedListVisualizerProps {
  departments: DepartmentInput[];
  activePointers?: Record<string, number>;
  selectedJob?: PrintJobNodeData | null;
  insertedJob?: PrintJobNodeData | null;
  title?: string;
  subtitle?: string;
  compact?: boolean;
}

export const LinkedListVisualizer: React.FC<LinkedListVisualizerProps> = ({
  departments,
  activePointers,
  selectedJob,
  insertedJob,
  title = 'Department Singly Linked Lists',
  subtitle = 'Each department maintains its own singly linked list with explicit next pointers terminating at NULL.',
  compact = false,
}) => {
  return (
    <div className="space-y-4">
      {!compact && (
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-100">{title}</h2>
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        </div>
      )}

      <div className="space-y-3">
        {departments.map((dept) => {
          const pointerIdx = activePointers ? (activePointers[dept.department_code] ?? 0) : 0;

          return (
            <div
              key={dept.department_code}
              className="p-4 rounded-xl bg-[#111A2E] border border-slate-800/90"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-semibold text-slate-100">
                    Department {dept.department_code}
                  </span>
                  <span className="text-slate-600" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-xs font-mono tabular-nums text-slate-400">
                    {dept.jobs.length} nodes
                  </span>
                  {activePointers && (
                    <>
                      <span className="text-slate-600" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-xs font-mono tabular-nums text-sky-400">
                        {pointerIdx < dept.jobs.length
                          ? `head → ${dept.jobs[pointerIdx].job_id}`
                          : 'head → NULL'}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-2 queue-scroll">
                {dept.jobs.length === 0 ? (
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="px-2.5 py-1.5 rounded-md bg-[#0B1120] border border-slate-800 text-slate-400">
                      head
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />
                    <span className="px-3 py-1.5 rounded-md bg-slate-900/90 border border-slate-700/70 text-slate-400">
                      NULL
                    </span>
                  </div>
                ) : (
                  <>
                    {dept.jobs.map((job, idx) => {
                      const isProcessed = activePointers ? idx < pointerIdx : false;
                      const isCurrentHead = activePointers ? idx === pointerIdx : idx === 0;
                      const isSelectedPop =
                        selectedJob &&
                        selectedJob.department_code === dept.department_code &&
                        selectedJob.original_position === idx;
                      const isNewlyInserted =
                        insertedJob &&
                        insertedJob.department_code === dept.department_code &&
                        insertedJob.original_position === idx;

                      let nodeStyle =
                        'bg-[#0B1120] border-slate-700/80 text-slate-100';
                      let statusNote: string | null = null;

                      if (isSelectedPop) {
                        nodeStyle =
                          'bg-emerald-950/60 border-emerald-400 text-emerald-100 ring-1 ring-emerald-400/40';
                        statusNote = 'Popped to Merged';
                      } else if (isNewlyInserted) {
                        nodeStyle =
                          'bg-sky-950/70 border-sky-400 text-sky-100 ring-1 ring-sky-400/40';
                        statusNote = 'Inserted to Heap';
                      } else if (isProcessed) {
                        nodeStyle =
                          'bg-[#0B1120]/40 border-slate-800/60 text-slate-500 opacity-50';
                      } else if (activePointers && isCurrentHead) {
                        nodeStyle =
                          'bg-[#16233F] border-sky-500/60 text-slate-100';
                        statusNote = 'In Min-Heap';
                      }

                      return (
                        <React.Fragment key={`${dept.department_code}-node-${idx}-${job.job_id}`}>
                          <div
                            className={`shrink-0 min-w-[136px] px-3 py-2.5 rounded-lg border transition-all duration-200 ${nodeStyle}`}
                          >
                            <div className="flex items-center justify-between gap-2 text-xs font-mono">
                              <span className="font-semibold truncate max-w-[90px]">
                                {job.job_id}
                              </span>
                              <span className="text-slate-400 tabular-nums">
                                Dept {dept.department_code}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-xs font-mono tabular-nums text-slate-400">
                              <span>Time: {job.submission_time}</span>
                              <span>Pos: {idx}</span>
                            </div>
                            {statusNote && (
                              <div className="mt-1.5 pt-1 border-t border-slate-700/50 text-[11px] font-medium text-sky-300">
                                {statusNote}
                              </div>
                            )}
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-500 shrink-0" />
                        </React.Fragment>
                      );
                    })}
                    <div className="shrink-0 px-3 py-2 rounded-lg bg-[#0B1120] border border-slate-800 text-xs font-mono text-slate-400">
                      NULL
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
