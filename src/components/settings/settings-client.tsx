'use client';

import React, { useState, useTransition } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTheme } from '@/components/theme-provider';
import { Sun, Moon, Download, Save, User, Target, DollarSign, FlaskConical } from 'lucide-react';
import { updateUserSettings } from '@/db/queries/user-settings';
import { toast } from 'sonner';

interface Settings {
  id: number;
  name: string | null;
  dob: string | null;
  heightIn: number | null;
  weightLbs: number | null;
  sex: 'male' | 'female' | null;
  caloriesTarget: number | null;
  proteinTarget: number | null;
  carbsTarget: number | null;
  fatTarget: number | null;
  fiberTarget: number | null;
  vitaminATarget: number | null;
  vitaminCTarget: number | null;
  vitaminDTarget: number | null;
  vitaminB12Target: number | null;
  ironTarget: number | null;
  zincTarget: number | null;
  calciumTarget: number | null;
  magnesiumTarget: number | null;
  potassiumTarget: number | null;
  fastFoodWeeklyBaseline: number | null;
}

export function SettingsClient({ settings }: { settings: Settings }) {
  const { theme, toggleTheme } = useTheme();
  const [isPending, startTransition] = useTransition();

  // Profile
  const [name, setName] = useState(settings.name ?? 'Rene');
  const [dob, setDob] = useState(settings.dob ?? '1993-03-14');
  const [heightIn, setHeightIn] = useState(String(settings.heightIn ?? 69));
  const [weightLbs, setWeightLbs] = useState(String(settings.weightLbs ?? 150));

  // Macro targets
  const [calories, setCalories] = useState(String(settings.caloriesTarget ?? 2000));
  const [protein, setProtein] = useState(String(settings.proteinTarget ?? 150));
  const [carbs, setCarbs] = useState(String(settings.carbsTarget ?? 200));
  const [fat, setFat] = useState(String(settings.fatTarget ?? 65));
  const [fiber, setFiber] = useState(String(settings.fiberTarget ?? 30));

  // Micro targets
  const [vitA, setVitA] = useState(String(settings.vitaminATarget ?? 900));
  const [vitC, setVitC] = useState(String(settings.vitaminCTarget ?? 500));
  const [vitD, setVitD] = useState(String(settings.vitaminDTarget ?? 50));
  const [vitB12, setVitB12] = useState(String(settings.vitaminB12Target ?? 10));
  const [iron, setIron] = useState(String(settings.ironTarget ?? 8));
  const [zinc, setZinc] = useState(String(settings.zincTarget ?? 15));
  const [calcium, setCalcium] = useState(String(settings.calciumTarget ?? 1000));
  const [magnesium, setMagnesium] = useState(String(settings.magnesiumTarget ?? 500));
  const [potassium, setPotassium] = useState(String(settings.potassiumTarget ?? 4700));

  // Cost
  const [fastFood, setFastFood] = useState(String(settings.fastFoodWeeklyBaseline ?? 350));

  // Computed BMI
  const heightM = (parseFloat(heightIn) || 69) * 0.0254;
  const bmi = ((parseFloat(weightLbs) || 150) / 2.205) / (heightM * heightM);
  const heightFt = Math.floor((parseFloat(heightIn) || 69) / 12);
  const heightInRem = (parseFloat(heightIn) || 69) % 12;

  const handleSave = () => {
    startTransition(async () => {
      await updateUserSettings({
        name,
        dob,
        heightIn: parseInt(heightIn),
        weightLbs: parseFloat(weightLbs),
        caloriesTarget: parseInt(calories),
        proteinTarget: parseInt(protein),
        carbsTarget: parseInt(carbs),
        fatTarget: parseInt(fat),
        fiberTarget: parseInt(fiber),
        vitaminATarget: parseFloat(vitA),
        vitaminCTarget: parseFloat(vitC),
        vitaminDTarget: parseFloat(vitD),
        vitaminB12Target: parseFloat(vitB12),
        ironTarget: parseFloat(iron),
        zincTarget: parseFloat(zinc),
        calciumTarget: parseFloat(calcium),
        magnesiumTarget: parseFloat(magnesium),
        potassiumTarget: parseFloat(potassium),
        fastFoodWeeklyBaseline: parseInt(fastFood),
      });
      toast.success('Settings saved!');
    });
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/settings/export');
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vitae-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Data exported!');
    } catch {
      toast.error('Export failed');
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>Settings</h1>
        <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">Customize your Villalobos experience</p>
      </div>

      {/* Appearance */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Sun className="w-4 h-4" /> Appearance</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Theme</span>
            <Button variant="outline" size="sm" onClick={toggleTheme}>
              {theme === 'light' ? <Moon className="w-4 h-4 mr-2" /> : <Sun className="w-4 h-4 mr-2" />}
              {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Profile */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4" /> Profile</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Date of Birth</label>
              <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Height (inches)</label>
              <Input type="number" value={heightIn} onChange={(e) => setHeightIn(e.target.value)} />
              <p className="text-xs text-neutral-400 mt-0.5">{heightFt}&apos;{heightInRem}&quot;</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Weight (lbs)</label>
              <Input type="number" step="0.1" value={weightLbs} onChange={(e) => setWeightLbs(e.target.value)} />
              <p className="text-xs text-neutral-400 mt-0.5">BMI {isNaN(bmi) ? '—' : bmi.toFixed(1)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Macro Targets */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="w-4 h-4" /> Daily Macro Targets</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Calories', val: calories, set: setCalories },
              { label: 'Protein (g)', val: protein, set: setProtein },
              { label: 'Carbs (g)', val: carbs, set: setCarbs },
              { label: 'Fat (g)', val: fat, set: setFat },
              { label: 'Fiber (g)', val: fiber, set: setFiber },
            ].map(({ label, val, set }) => (
              <div key={label}>
                <label className="text-xs font-medium mb-1 block text-neutral-500">{label}</label>
                <Input type="number" value={val} onChange={(e) => set(e.target.value)} className="h-9" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Micro Targets */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><FlaskConical className="w-4 h-4" /> Daily Micro Targets</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Vit A (mcg)', val: vitA, set: setVitA },
              { label: 'Vit C (mg)', val: vitC, set: setVitC },
              { label: 'Vit D (mcg)', val: vitD, set: setVitD },
              { label: 'Vit B12 (mcg)', val: vitB12, set: setVitB12 },
              { label: 'Iron (mg)', val: iron, set: setIron },
              { label: 'Zinc (mg)', val: zinc, set: setZinc },
              { label: 'Calcium (mg)', val: calcium, set: setCalcium },
              { label: 'Magnesium (mg)', val: magnesium, set: setMagnesium },
              { label: 'Potassium (mg)', val: potassium, set: setPotassium },
            ].map(({ label, val, set }) => (
              <div key={label}>
                <label className="text-xs font-medium mb-1 block text-neutral-500">{label}</label>
                <Input type="number" step="0.1" value={val} onChange={(e) => set(e.target.value)} className="h-9" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cost */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><DollarSign className="w-4 h-4" /> Cost Comparison</CardTitle></CardHeader>
        <CardContent>
          <div>
            <label className="text-sm font-medium mb-1 block">Weekly fast-food estimate ($)</label>
            <Input type="number" value={fastFood} onChange={(e) => setFastFood(e.target.value)} className="max-w-[160px]" />
            <p className="text-xs text-neutral-400 mt-1">Used to calculate how much you&apos;re saving by meal prepping</p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} size="lg" className="w-full" disabled={isPending}>
        <Save className="w-4 h-4" /> {isPending ? 'Saving…' : 'Save Settings'}
      </Button>

      {/* Data */}
      <Card>
        <CardHeader><CardTitle className="text-base">Data Management</CardTitle></CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleExport} className="w-full">
            <Download className="w-4 h-4" /> Export All Data (JSON)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
