'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Shield, Flame, Sparkles, CheckCircle2, Trophy } from 'lucide-react';
import Link from 'next/link';

interface DayLog {
  morningRoutine: Record<string, boolean>;
  eveningRoutine: Record<string, boolean>;
  hydration: { ozConsumed: number; goal: number };
  coffee: { cups: number };
  tweezed: boolean;
  nutrition: { ateFruit: boolean; ateVegetable: boolean; ateFastFood: boolean };
}

interface SkinTrackerState {
  startDate: string;
  longestStreak: number;
  logs: Record<string, DayLog>;
}

function getPhaseInfo(dayNumber: number): { phase: string; label: string; color: string; icon: React.ReactNode } {
  if (dayNumber <= 14) {
    return { phase: 'Phase 1', label: 'Heal', color: '#EF4444', icon: <Shield className="w-4 h-4" /> };
  } else if (dayNumber <= 42) {
    return { phase: 'Phase 2', label: 'Rebuild', color: '#F59E0B', icon: <Flame className="w-4 h-4" /> };
  } else {
    return { phase: 'Phase 3', label: 'Maintain', color: '#10B981', icon: <Sparkles className="w-4 h-4" /> };
  }
}

function getDayNumber(startDate: string): number {
  const start = new Date(startDate + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffMs = now.getTime() - start.getTime();
  return Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);
}

function getNoTweezeStreak(logs: Record<string, DayLog>): number {
  let streak = 0;
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const log = logs[key];

    if (!log) break;
    if (log.tweezed) break;
    streak++;
  }

  return streak;
}

function getRoutineCompletion(log: DayLog | undefined): { done: number; total: number } {
  if (!log) return { done: 0, total: 14 };

  let done = 0;
  let total = 0;

  if (log.morningRoutine) {
    const values = Object.values(log.morningRoutine);
    total += values.length;
    done += values.filter(Boolean).length;
  }
  if (log.eveningRoutine) {
    const values = Object.values(log.eveningRoutine);
    total += values.length;
    done += values.filter(Boolean).length;
  }

  return { done, total: total || 14 };
}

export function SkinRecoveryCard({ today }: { today: string }) {
  const [data, setData] = useState<SkinTrackerState | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('skin-tracker-state');
      if (raw) {
        setData(JSON.parse(raw));
      }
    } catch {
      // ignore parse errors
    }
    setLoaded(true);
  }, []);

  if (!loaded) return null;

  if (!data) {
    return (
      <Link href="/skin">
        <Card className="cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
          <CardContent className="py-6">
            <div className="text-center space-y-2">
              <Shield className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mx-auto" />
              <p className="text-sm text-neutral-500">
                No skin tracker data yet — tap to start logging.
              </p>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  const dayNumber = getDayNumber(data.startDate);
  const phaseInfo = getPhaseInfo(dayNumber);
  const noTweezeStreak = getNoTweezeStreak(data.logs);
  const todayLog = data.logs[today];
  const routine = getRoutineCompletion(todayLog);
  const routinePct = Math.round((routine.done / routine.total) * 100);
  const phaseMaxDay = dayNumber <= 14 ? 14 : dayNumber <= 42 ? 42 : 90;
  const phaseStartDay = dayNumber <= 14 ? 1 : dayNumber <= 42 ? 15 : 43;
  const phaseProgress = Math.min(((dayNumber - phaseStartDay) / (phaseMaxDay - phaseStartDay + 1)) * 100, 100);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" style={{ color: phaseInfo.color }} />
            Skin Recovery
          </div>
          <Link
            href="/skin"
            className="text-xs text-neutral-400 hover:text-[#E07A3A] transition-colors"
          >
            View full tracker &rarr;
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Phase & Day */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge
              className="text-white text-xs font-semibold px-2 py-0.5"
              style={{ backgroundColor: phaseInfo.color }}
            >
              {phaseInfo.phase}: {phaseInfo.label}
            </Badge>
          </div>
          <span className="text-sm font-bold" style={{ color: phaseInfo.color }}>
            Day {dayNumber}
          </span>
        </div>
        <Progress
          value={phaseProgress}
          indicatorStyle={{ backgroundColor: phaseInfo.color }}
          className="h-1.5"
        />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* No-Tweeze Streak */}
          <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[11px] text-neutral-500 font-medium">No-Tweeze Streak</span>
            </div>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
              {noTweezeStreak} <span className="text-xs font-normal text-neutral-500">day{noTweezeStreak !== 1 ? 's' : ''}</span>
            </p>
            {data.longestStreak > 0 && (
              <p className="text-[10px] text-neutral-400 mt-0.5">
                Best: {data.longestStreak} day{data.longestStreak !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Routine Completion */}
          <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2A9D8F]" />
              <span className="text-[11px] text-neutral-500 font-medium">Today&apos;s Routine</span>
            </div>
            <p className="text-xl font-bold" style={{ color: routinePct === 100 ? '#10B981' : '#2A9D8F' }}>
              {routine.done}/{routine.total}
            </p>
            <Progress
              value={routinePct}
              indicatorClassName={routinePct === 100 ? 'bg-emerald-500' : 'bg-[#2A9D8F]'}
              className="h-1 mt-1.5"
            />
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
