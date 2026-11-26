import React from 'react';
import {motion} from 'motion/react';
import type {HeapNodeSnapshot, PrintJobNodeData} from '../types/printflow';

interface MinHeapVisualizerProps {
  heapNodes: HeapNodeSnapshot[];
  selectedJob: PrintJobNodeData | null;
  insertedJob: PrintJobNodeData | null;
  phase: 'initialized' | 'merge_step';
}

function getTreeCoordinates(count: number): Array<{x: number; y: number}> {
  // Compute clean binary tree coordinates inside a 640x240 SVG viewBox
  const coords: Array<{x: number; y: number}> = [];
  const totalLevels = Math.max(1, Math.floor(Math.log2(Math.max(1, count))) + 1);
  const levelHeight = totalLevels <= 2 ? 90 : totalLevels === 3 ? 72 : 56;

  for (let i = 0; i < count; i++) {
    const level = Math.floor(Math.log2(i + 1));
    const levelStart = Math.pow(2, level) - 1;
    const posInLevel = i - levelStart;
    const nodesInLevel = Math.pow(2, level);
    const width = 640;
    const slotWidth = width / nodesInLevel;
    const x = slotWidth * (posInLevel + 0.5);
    const y = 36 + level * levelHeight;
    coords.push({x, y});
  }
  return coords;
}

export const MinHeapVisualizer: React.FC<MinHeapVisualizerProps> = ({
  heapNodes,
  selectedJob,
  insertedJob,
  phase,
}) => {
  const treeLimit = 15;
  const visibleTreeNodes = heapNodes.slice(0, treeLimit);
  const coords = getTreeCoordinates(visibleTreeNodes.length);
  const treeLevels = Math.max(1, Math.floor(Math.log2(Math.max(1, visibleTreeNodes.length))) + 1);
  const svgHeight = treeLevels <= 2 ? 180 : treeLevels === 3 ? 220 : 255;

  const isSameJob = (a: PrintJobNodeData | null, b: PrintJobNodeData | null): boolean => {
    if (!a || !b) return false;
    return (
      a.job_id === b.job_id &&
      a.department_code === b.department_code &&
      a.original_position === b.original_position
    );
  };

  return (
    <div className="p-5 rounded-xl bg-[#111A2E] border border-slate-800/90 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
        <div>
          <h3 className="text-base font-semibold text-slate-100">
            Custom Binary Min-Heap
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Stores at most K department heads (root index 0 is always the next minimum job).
          </p>
        </div>
        <div className="text-xs font-mono tabular-nums text-slate-400">
          Heap Size: <span className="text-sky-300 font-semibold">{heapNodes.length}</span>
        </div>
      </div>

      {/* Extracted & Inserted Transition Strip */}
      {phase === 'merge_step' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-emerald-950/35 border border-emerald-500/40 flex items-center justify-between">
            <span className="text-emerald-300 font-medium">Popped Minimum (Root)</span>
            {selectedJob ? (
              <span className="font-mono font-semibold text-emerald-100 tabular-nums">
                {selectedJob.job_id} · Dept {selectedJob.department_code} · t={selectedJob.submission_time}
              </span>
            ) : (
              <span className="font-mono text-slate-500">None</span>
            )}
          </div>
          <div className="p-3 rounded-lg bg-sky-950/35 border border-sky-500/40 flex items-center justify-between">
            <span className="text-sky-300 font-medium">Next Node Inserted</span>
            {insertedJob ? (
              <span className="font-mono font-semibold text-sky-100 tabular-nums">
                {insertedJob.job_id} · Dept {insertedJob.department_code} · t={insertedJob.submission_time}
              </span>
            ) : (
              <span className="font-mono text-slate-400">NULL (Queue Exhausted)</span>
            )}
          </div>
        </div>
      )}

      {/* Binary Heap Tree Diagram */}
      {heapNodes.length === 0 ? (
        <div className="py-10 text-center rounded-lg bg-[#0B1120] border border-dashed border-slate-800 text-xs font-mono text-slate-400">
          Min-Heap is Empty — All department queues have been consolidated.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg bg-[#0B1120] border border-slate-800/90 p-3 overflow-x-auto">
            <svg
              viewBox={`0 0 640 ${svgHeight}`}
              className="w-full min-w-[460px] h-auto"
              role="img"
              aria-label="Binary min-heap tree visualization"
            >
              {/* Parent-Child Edges */}
              {visibleTreeNodes.map((_, idx) => {
                if (idx === 0) return null;
                const parentIdx = Math.floor((idx - 1) / 2);
                const p = coords[parentIdx];
                const c = coords[idx];
                return (
                  <line
                    key={`edge-${parentIdx}-${idx}`}
                    x1={p.x}
                    y1={p.y}
                    x2={c.x}
                    y2={c.y}
                    stroke="#334155"
                    strokeWidth="1.5"
                  />
                );
              })}

              {/* Tree Nodes */}
              {visibleTreeNodes.map((node, idx) => {
                const {x, y} = coords[idx];
                const isRoot = idx === 0;
                const isNewlyInserted = isSameJob(node, insertedJob);

                const fill = isNewlyInserted
                  ? '#0C4A6E'
                  : isRoot
                    ? '#172554'
                    : '#111A2E';
                const stroke = isNewlyInserted
                  ? '#38BDF8'
                  : isRoot
                    ? '#60A5FA'
                    : '#475569';

                return (
                  <g key={`tree-node-${idx}-${node.job_id}`} transform={`translate(${x}, ${y})`}>
                    <rect
                      x={-48}
                      y={-22}
                      width={96}
                      height={44}
                      rx={8}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={isRoot || isNewlyInserted ? 2 : 1.2}
                    />
                    <text
                      x={0}
                      y={-3}
                      textAnchor="middle"
                      fill="#F1F5F9"
                      fontSize="12"
                      fontWeight="600"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {node.job_id.length > 10 ? `${node.job_id.slice(0, 9)}…` : node.job_id}
                    </text>
                    <text
                      x={0}
                      y={13}
                      textAnchor="middle"
                      fill="#94A3B8"
                      fontSize="10"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {`t=${node.submission_time} · ${node.department_code}`}
                    </text>
                  </g>
                );
              })}
            </svg>
            {heapNodes.length > treeLimit && (
              <p className="mt-2 text-center text-xs text-slate-400">
                Showing first {treeLimit} tree nodes; all {heapNodes.length} entries are visible in the heap array below.
              </p>
            )}
          </div>

          {/* Backing Array Representation */}
          <div>
            <div className="text-xs font-medium text-slate-400 mb-2">
              Heap Array State (Index Order)
            </div>
            <div className="flex flex-wrap gap-2">
              {heapNodes.map((node, idx) => {
                const isRoot = idx === 0;
                const isInserted = isSameJob(node, insertedJob);
                return (
                  <motion.div
                    key={`heap-arr-${idx}-${node.job_id}`}
                    layout
                    initial={{opacity: 0, scale: 0.94}}
                    animate={{opacity: 1, scale: 1}}
                    transition={{duration: 0.18}}
                    className={`px-3 py-2 rounded-lg border text-xs font-mono tabular-nums ${
                      isInserted
                        ? 'bg-sky-950/60 border-sky-400 text-sky-100'
                        : isRoot
                          ? 'bg-indigo-950/60 border-sky-500/70 text-slate-100'
                          : 'bg-[#0B1120] border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">[{idx}]</span>
                      <span className="font-semibold text-slate-100">{node.job_id}</span>
                      <span className="text-slate-600">·</span>
                      <span>t={node.submission_time}</span>
                      <span className="text-slate-600">·</span>
                      <span className="text-sky-300">{node.department_code}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
