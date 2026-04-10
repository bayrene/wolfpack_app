'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

// Universal tooth numbering (1-32)
// Upper: 1(R back) -> 16(L back)
// Lower: 17(L back) -> 32(R back)

const UPPER_RIGHT = [1, 2, 3, 4, 5, 6, 7, 8]; // upper right (patient's right)
const UPPER_LEFT = [9, 10, 11, 12, 13, 14, 15, 16];
const LOWER_LEFT = [17, 18, 19, 20, 21, 22, 23, 24];
const LOWER_RIGHT = [25, 26, 27, 28, 29, 30, 31, 32];

const TOOTH_NAMES: Record<number, string> = {
  1: '3rd Molar (Wisdom)', 2: '2nd Molar', 3: '1st Molar', 4: '2nd Premolar', 5: '1st Premolar', 6: 'Canine', 7: 'Lateral Incisor', 8: 'Central Incisor',
  9: 'Central Incisor', 10: 'Lateral Incisor', 11: 'Canine', 12: '1st Premolar', 13: '2nd Premolar', 14: '1st Molar', 15: '2nd Molar', 16: '3rd Molar (Wisdom)',
  17: '3rd Molar (Wisdom)', 18: '2nd Molar', 19: '1st Molar', 20: '2nd Premolar', 21: '1st Premolar', 22: 'Canine', 23: 'Lateral Incisor', 24: 'Central Incisor',
  25: 'Central Incisor', 26: 'Lateral Incisor', 27: 'Canine', 28: '1st Premolar', 29: '2nd Premolar', 30: '1st Molar', 31: '2nd Molar', 32: '3rd Molar (Wisdom)',
};

// Max pocket depth for color coding
function getDepthColor(depth: number): string {
  if (depth <= 3) return 'bg-emerald-500';
  if (depth === 4) return 'bg-amber-500';
  return 'bg-red-500';
}

function getDepthTextColor(depth: number): string {
  if (depth <= 3) return 'text-emerald-600 dark:text-emerald-400';
  if (depth === 4) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function getMaxDepth(depths: number[]): number {
  return Math.max(...depths, 0);
}

// Measurements = { "1": [3,2,3], "14": [4,3,5], ... }
export type ToothMeasurements = Record<string, number[]>;

interface ToothChartProps {
  measurements: ToothMeasurements;
  onChange?: (measurements: ToothMeasurements) => void;
  previousMeasurements?: ToothMeasurements; // for comparison
  readOnly?: boolean;
  compact?: boolean;
}

function ToothButton({
  num,
  depths,
  prevDepths,
  selected,
  onClick,
  readOnly,
  compact,
}: {
  num: number;
  depths?: number[];
  prevDepths?: number[];
  selected: boolean;
  onClick: () => void;
  readOnly?: boolean;
  compact?: boolean;
}) {
  const maxDepth = depths ? getMaxDepth(depths) : 0;
  const prevMaxDepth = prevDepths ? getMaxDepth(prevDepths) : 0;
  const hasMeasurement = depths && depths.length > 0;
  const hasChange = hasMeasurement && prevDepths && prevDepths.length > 0;

  // Trend: negative = improvement, positive = worsening
  const trend = hasChange ? maxDepth - prevMaxDepth : 0;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={readOnly}
      className={cn(
        'relative flex flex-col items-center justify-center rounded-lg border transition-all',
        compact ? 'w-7 h-8 text-[9px]' : 'w-9 h-11 text-[10px]',
        selected
          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950 ring-2 ring-indigo-300 dark:ring-indigo-700'
          : hasMeasurement
            ? maxDepth <= 3
              ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/30'
              : maxDepth === 4
                ? 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/30'
                : 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-950/30'
            : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800',
        readOnly && 'cursor-default',
      )}
      title={`#${num} ${TOOTH_NAMES[num]}${hasMeasurement ? ` — depths: ${depths!.join(', ')}mm` : ''}`}
    >
      <span className="font-bold leading-none">{num}</span>
      {hasMeasurement && (
        <span className={cn('font-semibold leading-none', compact ? 'text-[8px]' : 'text-[9px]', getDepthTextColor(maxDepth))}>
          {maxDepth}
        </span>
      )}
      {/* Trend indicator */}
      {hasChange && trend !== 0 && (
        <span className={cn(
          'absolute -top-1 -right-1 w-3 h-3 rounded-full flex items-center justify-center text-[7px] font-bold text-white',
          trend < 0 ? 'bg-emerald-500' : 'bg-red-500',
        )}>
          {trend < 0 ? '\u2193' : '\u2191'}
        </span>
      )}
    </button>
  );
}

export function ToothChart({ measurements, onChange, previousMeasurements, readOnly, compact }: ToothChartProps) {
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [depthInput, setDepthInput] = useState('');

  const handleToothClick = (num: number) => {
    if (readOnly) return;
    setSelectedTooth(num);
    const existing = measurements[String(num)];
    setDepthInput(existing ? existing.join(', ') : '');
  };

  const handleSaveDepths = () => {
    if (!selectedTooth || !onChange) return;
    const trimmed = depthInput.trim();
    if (!trimmed) {
      // Remove tooth measurement
      const next = { ...measurements };
      delete next[String(selectedTooth)];
      onChange(next);
    } else {
      const depths = trimmed.split(/[,\s]+/).map(Number).filter((n) => !isNaN(n) && n >= 0);
      if (depths.length === 0) return;
      onChange({ ...measurements, [String(selectedTooth)]: depths });
    }
    setSelectedTooth(null);
    setDepthInput('');
  };

  const renderRow = (teeth: number[], label: string) => (
    <div className="flex items-center gap-0.5">
      <span className="text-[9px] text-neutral-400 w-5 text-right mr-1 shrink-0">{label}</span>
      {teeth.map((num) => (
        <ToothButton
          key={num}
          num={num}
          depths={measurements[String(num)]}
          prevDepths={previousMeasurements?.[String(num)]}
          selected={selectedTooth === num}
          onClick={() => handleToothClick(num)}
          readOnly={readOnly}
          compact={compact}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex items-center gap-3 text-[10px] text-neutral-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> 1-3mm Healthy</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> 4mm Watch</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> 5mm+ Concern</span>
      </div>

      {/* Chart */}
      <div className="space-y-1">
        <p className="text-[10px] text-neutral-400 text-center font-medium">UPPER</p>
        <div className="flex justify-center gap-2">
          {renderRow(UPPER_RIGHT, 'R')}
          <div className="w-px bg-neutral-200 dark:bg-neutral-700" />
          {renderRow(UPPER_LEFT, 'L')}
        </div>
        <div className="h-px bg-neutral-200 dark:bg-neutral-700 my-1" />
        <div className="flex justify-center gap-2">
          {renderRow(LOWER_RIGHT.slice().reverse(), 'R')}
          <div className="w-px bg-neutral-200 dark:bg-neutral-700" />
          {renderRow(LOWER_LEFT.slice().reverse(), 'L')}
        </div>
        <p className="text-[10px] text-neutral-400 text-center font-medium">LOWER</p>
      </div>

      {/* Selected tooth input */}
      {selectedTooth && !readOnly && (
        <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              #{selectedTooth} — {TOOTH_NAMES[selectedTooth]}
            </p>
            <button
              type="button"
              onClick={() => { setSelectedTooth(null); setDepthInput(''); }}
              className="text-xs text-neutral-400 hover:text-neutral-600"
            >
              Cancel
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={depthInput}
              onChange={(e) => setDepthInput(e.target.value)}
              placeholder="e.g. 3, 2, 3, 2, 3, 2"
              className="flex-1 text-sm rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveDepths(); }}
              autoFocus
            />
            <button
              type="button"
              onClick={handleSaveDepths}
              className="px-3 py-1.5 rounded-md bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition-colors"
            >
              Save
            </button>
          </div>
          <p className="text-[10px] text-neutral-400">
            Enter pocket depths in mm (up to 6 sites per tooth), separated by commas. Leave blank to clear.
          </p>
        </div>
      )}
    </div>
  );
}

// Utility to get a summary of tooth measurements
export function getToothSummary(measurements: ToothMeasurements): {
  totalTeeth: number;
  healthy: number;
  watch: number;
  concern: number;
  avgDepth: number;
  maxDepth: number;
} {
  const teeth = Object.entries(measurements);
  if (teeth.length === 0) return { totalTeeth: 0, healthy: 0, watch: 0, concern: 0, avgDepth: 0, maxDepth: 0 };

  let healthy = 0, watch = 0, concern = 0;
  let allDepths: number[] = [];

  for (const [, depths] of teeth) {
    const max = getMaxDepth(depths);
    allDepths.push(...depths);
    if (max <= 3) healthy++;
    else if (max === 4) watch++;
    else concern++;
  }

  return {
    totalTeeth: teeth.length,
    healthy,
    watch,
    concern,
    avgDepth: allDepths.length > 0 ? Math.round((allDepths.reduce((a, b) => a + b, 0) / allDepths.length) * 10) / 10 : 0,
    maxDepth: allDepths.length > 0 ? Math.max(...allDepths) : 0,
  };
}
