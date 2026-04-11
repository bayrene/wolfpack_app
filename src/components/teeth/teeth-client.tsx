'use client';

import React, { useState, useTransition, useMemo, useRef } from 'react';
import { compressImage } from '@/lib/compress-image';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Plus,
  Trash2,
  Calendar,
  Clock,
  DollarSign,
  Zap,
  Droplets,
  Sparkles,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Package,
  Stethoscope,
  Activity,
  Timer,
  Star,
  FileText,
  Upload,
  Phone,
  Globe,
  MapPin,
  Users,
  ChevronDown,
  ChevronUp,
  Heart,
  ExternalLink,
  Pencil,
  Copy,
} from 'lucide-react';
import {
  addDentalProduct,
  updateDentalProduct,
  deleteDentalProduct,
  addDentalLog,
  deleteDentalLog,
  addDentalCheckup,
  deleteDentalCheckup,
  addGumHealthLog,
  deleteGumHealthLog,
} from '@/db/queries/dental';
import { addDentalDocument, deleteDentalDocument } from '@/db/queries/dental';
import { addDentalContact, toggleDentalContactFavorite, deleteDentalContact } from '@/db/queries/dental';
import { formatDate, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type {
  DentalProduct,
  DentalLogEntry,
  DentalCheckup,
  GumHealthEntry,
} from '@/db/schema';
import type { DentalDocument } from '@/db/schema';
import type { DentalContact } from '@/db/schema';
import { ToothChart, getToothSummary, type ToothMeasurements } from './tooth-chart';

// --- Types & Constants ---

interface Props {
  products: DentalProduct[];
  logs: DentalLogEntry[];
  checkups: DentalCheckup[];
  gumLogs: GumHealthEntry[];
  documents: DentalDocument[];
  contacts: DentalContact[];
  today: string;
  embedded?: boolean;
}

type TabType = 'daily' | 'products' | 'gum' | 'checkups' | 'docs' | 'dentists';

type ActivityType = 'brush' | 'water_flosser' | 'floss_pick' | 'whitener' | 'mouthwash';
type ProductCategory = 'toothbrush' | 'toothpaste' | 'water_flosser' | 'floss_pick' | 'whitener' | 'mouthwash' | 'other';
type CheckupType = 'cleaning' | 'exam' | 'procedure' | 'emergency' | 'other';

const ACTIVITY_CONFIG: Record<ActivityType, { label: string; icon: string; color: string; bgColor: string }> = {
  brush: { label: 'Brush', icon: '🪥', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-950' },
  water_flosser: { label: 'Water Flosser', icon: '💦', color: 'text-cyan-600 dark:text-cyan-400', bgColor: 'bg-cyan-50 dark:bg-cyan-950' },
  floss_pick: { label: 'Floss Pick', icon: '🦷', color: 'text-violet-600 dark:text-violet-400', bgColor: 'bg-violet-50 dark:bg-violet-950' },
  whitener: { label: 'Whitener', icon: '✨', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-950' },
  mouthwash: { label: 'Mouthwash', icon: '🫧', color: 'text-teal-600 dark:text-teal-400', bgColor: 'bg-teal-50 dark:bg-teal-950' },
};

const PRODUCT_CATEGORY_CONFIG: Record<ProductCategory, { label: string; icon: string }> = {
  toothbrush: { label: 'Toothbrush', icon: '🪥' },
  toothpaste: { label: 'Toothpaste', icon: '🧴' },
  water_flosser: { label: 'Water Flosser', icon: '💦' },
  floss_pick: { label: 'Floss Pick', icon: '🦷' },
  whitener: { label: 'Whitener', icon: '✨' },
  mouthwash: { label: 'Mouthwash', icon: '🫧' },
  other: { label: 'Other', icon: '📦' },
};

const CHECKUP_TYPE_CONFIG: Record<CheckupType, { label: string; color: string }> = {
  cleaning: { label: 'Cleaning', color: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' },
  exam: { label: 'Exam', color: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' },
  procedure: { label: 'Procedure', color: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300' },
  emergency: { label: 'Emergency', color: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' },
  other: { label: 'Other', color: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300' },
};

const GUM_SCORE_LABELS: Record<number, { label: string; color: string; desc: string }> = {
  1: { label: 'Excellent', color: 'text-green-600 dark:text-green-400', desc: 'Healthy gums, no issues' },
  2: { label: 'Good', color: 'text-emerald-600 dark:text-emerald-400', desc: 'Minor inflammation' },
  3: { label: 'Fair', color: 'text-amber-600 dark:text-amber-400', desc: 'Moderate gingivitis' },
  4: { label: 'Poor', color: 'text-orange-600 dark:text-orange-400', desc: 'Early periodontitis' },
  5: { label: 'Severe', color: 'text-red-600 dark:text-red-400', desc: 'Advanced disease' },
};

const DOC_CATEGORY_CONFIG: Record<string, { label: string; icon: string }> = {
  xray: { label: 'X-Ray', icon: '📷' },
  treatment_plan: { label: 'Treatment Plan', icon: '📋' },
  invoice: { label: 'Invoice', icon: '🧾' },
  insurance: { label: 'Insurance', icon: '🛡️' },
  lab_results: { label: 'Lab Results', icon: '🔬' },
  referral: { label: 'Referral', icon: '📨' },
  other: { label: 'Other', icon: '📄' },
};

const CONTACT_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  general: { label: 'General', color: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' },
  orthodontist: { label: 'Orthodontist', color: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300' },
  oral_surgeon: { label: 'Oral Surgeon', color: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' },
  periodontist: { label: 'Periodontist', color: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300' },
  endodontist: { label: 'Endodontist', color: 'bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300' },
  pediatric: { label: 'Pediatric', color: 'bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300' },
  cosmetic: { label: 'Cosmetic', color: 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300' },
};

function getCurrentTime() {
  return new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
}

function formatTime12(time: string) {
  const [h, m] = time.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function getDateOffset(date: string, offset: number): string {
  const d = new Date(date + 'T00:00:00');
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
  return (bytes / 1024).toFixed(1) + ' KB';
}

function parseMeasurementsJson(raw: string | null | undefined): ToothMeasurements {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as ToothMeasurements;
    }
    return {};
  } catch {
    // Old format (plain text) — return empty
    return {};
  }
}

// --- Main Component ---

export function TeethClient({ products, logs, checkups, gumLogs, documents, contacts, today, embedded }: Props) {
  const [tab, setTab] = useState<TabType>('daily');
  const [isPending, startTransition] = useTransition();
  const [viewDate, setViewDate] = useState(today);

  // Quick-log states
  const [showLogModal, setShowLogModal] = useState(false);
  const [logActivity, setLogActivity] = useState<ActivityType>('brush');
  const [logTime, setLogTime] = useState(getCurrentTime());
  const [logDuration, setLogDuration] = useState('');
  const [logProductId, setLogProductId] = useState<number | undefined>(undefined);
  const [logNotes, setLogNotes] = useState('');

  // Product modal
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodBrand, setProdBrand] = useState('');
  const [prodCategory, setProdCategory] = useState<ProductCategory>('toothbrush');
  const [prodModel, setProdModel] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodPurchaseDate, setProdPurchaseDate] = useState(today);
  const [prodReplacementDays, setProdReplacementDays] = useState('');
  const [prodNotes, setProdNotes] = useState('');

  // Checkup modal
  const [showCheckupModal, setShowCheckupModal] = useState(false);
  const [ckDate, setCkDate] = useState(today);
  const [ckDentist, setCkDentist] = useState('');
  const [ckLocation, setCkLocation] = useState('');
  const [ckType, setCkType] = useState<CheckupType>('cleaning');
  const [ckCost, setCkCost] = useState('');
  const [ckInsurance, setCkInsurance] = useState('');
  const [ckNotes, setCkNotes] = useState('');
  const [ckNextAppt, setCkNextAppt] = useState('');

  // Gum health modal
  const [showGumModal, setShowGumModal] = useState(false);
  const [gumDate, setGumDate] = useState(today);
  const [gumScore, setGumScore] = useState(0);
  const [gumBleeding, setGumBleeding] = useState(false);
  const [gumNotes, setGumNotes] = useState('');
  const [gumMeasurements, setGumMeasurements] = useState('');
  const [gumToothMeasurements, setGumToothMeasurements] = useState<Record<string, number[]>>({});

  // Document modal
  const [showDocModal, setShowDocModal] = useState(false);
  const [docName, setDocName] = useState('');
  const [docCategory, setDocCategory] = useState<string>('other');
  const [docNotes, setDocNotes] = useState('');
  const [docCheckupId, setDocCheckupId] = useState<number | undefined>(undefined);
  const [docFileData, setDocFileData] = useState('');
  const [docFileType, setDocFileType] = useState('');
  const [docFileSize, setDocFileSize] = useState(0);
  const [docDate, setDocDate] = useState(today);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Contact modal
  const [showContactModal, setShowContactModal] = useState(false);
  const [ctName, setCtName] = useState('');
  const [ctType, setCtType] = useState<string>('general');
  const [ctAddress, setCtAddress] = useState('');
  const [ctPhone, setCtPhone] = useState('');
  const [ctWebsite, setCtWebsite] = useState('');
  const [ctDoctors, setCtDoctors] = useState('');
  const [ctInsurance, setCtInsurance] = useState('');
  const [ctNotes, setCtNotes] = useState('');
  const [ctLastVisited, setCtLastVisited] = useState('');

  // Document viewer
  const [viewDocData, setViewDocData] = useState<string | null>(null);

  // Expanded contact cards
  const [expandedContacts, setExpandedContacts] = useState<Set<number>>(new Set());
  const toggleContactExpanded = (id: number) => {
    setExpandedContacts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Computed
  const todaysLogs = useMemo(() => logs.filter((l) => l.date === viewDate), [logs, viewDate]);
  const todaysBrushCount = todaysLogs.filter((l) => l.activity === 'brush').length;
  const todaysFlossCount = todaysLogs.filter((l) => l.activity === 'water_flosser' || l.activity === 'floss_pick').length;
  const todaysWhitener = todaysLogs.some((l) => l.activity === 'whitener');
  const todaysMouthwash = todaysLogs.some((l) => l.activity === 'mouthwash');

  const activeProducts = products.filter((p) => p.active);
  const totalProductCost = activeProducts.reduce((sum, p) => sum + (p.price || 0), 0);

  const lastCheckup = checkups.length > 0 ? checkups[0] : null;
  const nextAppt = lastCheckup?.nextAppointment || null;

  const latestGumScore = gumLogs.length > 0 ? gumLogs[0] : null;

  // 7-day streak
  const last7Days = useMemo(() => {
    const days: { date: string; brushCount: number; flossed: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = getDateOffset(today, -i);
      const dayLogs = logs.filter((l) => l.date === d);
      days.push({
        date: d,
        brushCount: dayLogs.filter((l) => l.activity === 'brush').length,
        flossed: dayLogs.some((l) => l.activity === 'water_flosser' || l.activity === 'floss_pick'),
      });
    }
    return days;
  }, [logs, today]);

  const brushStreak = useMemo(() => {
    let streak = 0;
    for (let i = 0; i <= 60; i++) {
      const d = getDateOffset(today, -i);
      const dayBrushes = logs.filter((l) => l.date === d && l.activity === 'brush').length;
      if (dayBrushes >= 2) streak++;
      else break;
    }
    return streak;
  }, [logs, today]);

  // Gum health trend comparison
  const gumTrend = useMemo(() => {
    if (gumLogs.length < 2) return null;
    const latest = gumLogs[0];
    const previous = gumLogs[1];
    const latestM = parseMeasurementsJson(latest.measurements);
    const previousM = parseMeasurementsJson(previous.measurements);
    const latestSummary = getToothSummary(latestM);
    const previousSummary = getToothSummary(previousM);

    const scoreChange = (latest.overallScore || 0) - (previous.overallScore || 0);
    const scoreLabel = scoreChange < 0 ? 'improved' : scoreChange > 0 ? 'worsened' : 'same';

    // Per-tooth comparison
    let teethImproved = 0;
    let teethWorsened = 0;
    const allToothKeys = new Set([...Object.keys(latestM), ...Object.keys(previousM)]);
    for (const key of allToothKeys) {
      const latestMax = latestM[key] ? Math.max(...latestM[key]) : 0;
      const prevMax = previousM[key] ? Math.max(...previousM[key]) : 0;
      if (latestMax > 0 && prevMax > 0) {
        if (latestMax < prevMax) teethImproved++;
        else if (latestMax > prevMax) teethWorsened++;
      }
    }

    let reflection = '';
    const parts: string[] = [];
    if (teethImproved > 0) parts.push(`${teethImproved} ${teethImproved === 1 ? 'tooth' : 'teeth'} improved`);
    if (teethWorsened > 0) parts.push(`${teethWorsened} ${teethWorsened === 1 ? 'tooth' : 'teeth'} worsened`);
    if (parts.length > 0) {
      reflection = parts.join(', ') + ' since last visit';
    } else if (Object.keys(latestM).length > 0 && Object.keys(previousM).length > 0) {
      reflection = 'No per-tooth changes since last visit';
    }

    return {
      latest,
      previous,
      latestM,
      previousM,
      latestSummary,
      previousSummary,
      scoreChange,
      scoreLabel,
      reflection,
    };
  }, [gumLogs]);

  // Reset functions
  const resetLogForm = () => {
    setLogActivity('brush');
    setLogTime(getCurrentTime());
    setLogDuration('');
    setLogProductId(undefined);
    setLogNotes('');
  };

  const resetProductForm = () => {
    setEditingProductId(null);
    setProdName('');
    setProdBrand('');
    setProdCategory('toothbrush');
    setProdModel('');
    setProdPrice('');
    setProdPurchaseDate(today);
    setProdReplacementDays('');
    setProdNotes('');
  };

  const openEditProduct = (prod: DentalProduct) => {
    setEditingProductId(prod.id);
    setProdName(prod.name);
    setProdBrand(prod.brand);
    setProdCategory(prod.category as ProductCategory);
    setProdModel(prod.model || '');
    setProdPrice(prod.price ? String(prod.price) : '');
    setProdPurchaseDate(prod.purchaseDate || '');
    setProdReplacementDays(prod.replacementFrequencyDays ? String(prod.replacementFrequencyDays) : '');
    setProdNotes(prod.notes || '');
    setShowProductModal(true);
  };

  const resetCheckupForm = () => {
    setCkDate(today);
    setCkDentist('');
    setCkLocation('');
    setCkType('cleaning');
    setCkCost('');
    setCkInsurance('');
    setCkNotes('');
    setCkNextAppt('');
  };

  const resetGumForm = () => {
    setGumDate(today);
    setGumScore(0);
    setGumBleeding(false);
    setGumNotes('');
    setGumMeasurements('');
    setGumToothMeasurements({});
  };

  const copyFromLastGumSession = () => {
    if (gumLogs.length === 0) return;
    const last = gumLogs[0];
    setGumScore(last.overallScore ?? 0);
    setGumBleeding(last.bleedingOnProbing ?? false);
    setGumNotes(last.notes ?? '');
    // Copy tooth measurements if they exist as JSON
    try {
      const parsed = last.measurements ? JSON.parse(last.measurements) : {};
      if (typeof parsed === 'object' && !Array.isArray(parsed)) {
        setGumToothMeasurements(parsed as Record<string, number[]>);
        setGumMeasurements('');
      } else {
        setGumMeasurements(last.measurements ?? '');
        setGumToothMeasurements({});
      }
    } catch {
      setGumMeasurements(last.measurements ?? '');
      setGumToothMeasurements({});
    }
    toast.success('Copied from last session');
  };

  const resetDocForm = () => {
    setDocName('');
    setDocCategory('other');
    setDocNotes('');
    setDocCheckupId(undefined);
    setDocFileData('');
    setDocFileType('');
    setDocFileSize(0);
    setDocDate(today);
  };

  const resetContactForm = () => {
    setCtName('');
    setCtType('general');
    setCtAddress('');
    setCtPhone('');
    setCtWebsite('');
    setCtDoctors('');
    setCtInsurance('');
    setCtNotes('');
    setCtLastVisited('');
  };

  // Handlers
  const handleQuickLog = (activity: ActivityType) => {
    // Pre-fill the log modal so user can adjust time if needed
    setLogActivity(activity);
    setLogTime(getCurrentTime());
    setLogDuration('');
    setLogProductId(undefined);
    setLogNotes('');
    setShowLogModal(true);
  };

  const handleSaveLog = () => {
    startTransition(async () => {
      await addDentalLog({
        date: viewDate,
        time: logTime,
        activity: logActivity,
        duration: logDuration ? parseInt(logDuration) : undefined,
        productId: logProductId,
        notes: logNotes.trim() || undefined,
      });
      toast.success(`${ACTIVITY_CONFIG[logActivity].label} logged!`);
      setShowLogModal(false);
      resetLogForm();
    });
  };

  const handleDeleteLog = (id: number) => {
    startTransition(async () => {
      await deleteDentalLog(id);
      toast.success('Entry deleted');
    });
  };

  const handleSaveProduct = () => {
    if (!prodName.trim() || !prodBrand.trim()) {
      toast.error('Name and brand are required');
      return;
    }
    startTransition(async () => {
      const data = {
        name: prodName.trim(),
        brand: prodBrand.trim(),
        category: prodCategory,
        model: prodModel.trim() || undefined,
        price: prodPrice ? parseFloat(prodPrice) : undefined,
        purchaseDate: prodPurchaseDate || undefined,
        replacementFrequencyDays: prodReplacementDays ? parseInt(prodReplacementDays) : undefined,
        notes: prodNotes.trim() || undefined,
      };
      if (editingProductId) {
        await updateDentalProduct(editingProductId, data);
        toast.success('Product updated!');
      } else {
        await addDentalProduct(data);
        toast.success('Product added!');
      }
      setShowProductModal(false);
      resetProductForm();
    });
  };

  const handleToggleProductActive = (id: number, currentActive: boolean) => {
    startTransition(async () => {
      await updateDentalProduct(id, { active: !currentActive });
      toast.success(currentActive ? 'Product archived' : 'Product reactivated');
    });
  };

  const handleDeleteProduct = (id: number) => {
    startTransition(async () => {
      await deleteDentalProduct(id);
      toast.success('Product deleted');
    });
  };

  const handleSaveCheckup = () => {
    startTransition(async () => {
      await addDentalCheckup({
        date: ckDate,
        dentistName: ckDentist.trim() || undefined,
        location: ckLocation.trim() || undefined,
        type: ckType,
        cost: ckCost ? parseFloat(ckCost) : undefined,
        insuranceCovered: ckInsurance ? parseFloat(ckInsurance) : undefined,
        notes: ckNotes.trim() || undefined,
        nextAppointment: ckNextAppt || undefined,
      });
      toast.success('Checkup logged!');
      setShowCheckupModal(false);
      resetCheckupForm();
    });
  };

  const handleDeleteCheckup = (id: number) => {
    startTransition(async () => {
      await deleteDentalCheckup(id);
      toast.success('Checkup deleted');
    });
  };

  const handleSaveGumLog = () => {
    if (gumScore === 0) {
      toast.error('Please select a gum health score');
      return;
    }
    startTransition(async () => {
      const measurementsStr = Object.keys(gumToothMeasurements).length > 0
        ? JSON.stringify(gumToothMeasurements)
        : gumMeasurements.trim() || undefined;
      await addGumHealthLog({
        date: gumDate,
        overallScore: gumScore,
        bleedingOnProbing: gumBleeding,
        measurements: measurementsStr,
        notes: gumNotes.trim() || undefined,
      });
      toast.success('Gum health logged!');
      setShowGumModal(false);
      resetGumForm();
    });
  };

  const handleDeleteGumLog = (id: number) => {
    startTransition(async () => {
      await deleteGumHealthLog(id);
      toast.success('Entry deleted');
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = file.type.startsWith('image/')
      ? await compressImage(file)
      : await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
    setDocFileData(base64);
    setDocFileType(file.type);
    setDocFileSize(file.size);
    if (!docName) setDocName(file.name.replace(/\.[^/.]+$/, ''));
  };

  const handleSaveDocument = () => {
    if (!docName.trim()) {
      toast.error('Document name is required');
      return;
    }
    if (!docFileData) {
      toast.error('Please select a file');
      return;
    }
    startTransition(async () => {
      await addDentalDocument({
        date: docDate,
        name: docName.trim(),
        fileType: docFileType,
        fileData: docFileData,
        fileSize: docFileSize,
        category: docCategory as 'xray' | 'treatment_plan' | 'invoice' | 'insurance' | 'lab_results' | 'referral' | 'other',
        checkupId: docCheckupId,
        notes: docNotes.trim() || undefined,
      });
      toast.success('Document saved!');
      setShowDocModal(false);
      resetDocForm();
    });
  };

  const handleDeleteDocument = (id: number) => {
    startTransition(async () => {
      await deleteDentalDocument(id);
      toast.success('Document deleted');
    });
  };

  const handleSaveContact = () => {
    if (!ctName.trim()) {
      toast.error('Practice name is required');
      return;
    }
    startTransition(async () => {
      await addDentalContact({
        name: ctName.trim(),
        type: ctType as 'general' | 'orthodontist' | 'oral_surgeon' | 'periodontist' | 'endodontist' | 'pediatric' | 'cosmetic',
        address: ctAddress.trim() || undefined,
        phone: ctPhone.trim() || undefined,
        website: ctWebsite.trim() || undefined,
        doctors: ctDoctors.trim() || undefined,
        insurance: ctInsurance.trim() || undefined,
        notes: ctNotes.trim() || undefined,
        lastVisited: ctLastVisited || undefined,
      });
      toast.success('Contact added!');
      setShowContactModal(false);
      resetContactForm();
    });
  };

  const handleToggleFavorite = (id: number, current: boolean) => {
    startTransition(async () => {
      await toggleDentalContactFavorite(id, !current);
      toast.success(!current ? 'Added to favorites' : 'Removed from favorites');
    });
  };

  const handleDeleteContact = (id: number) => {
    startTransition(async () => {
      await deleteDentalContact(id);
      toast.success('Contact deleted');
    });
  };

  const isToday = viewDate === today;

  return (
    <div className={embedded ? 'space-y-6' : 'max-w-4xl mx-auto space-y-6'}>
      {!embedded && (
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
          >
            Teeth
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Track brushing, flossing, products, and gum health
          </p>
        </div>
      )}

      {/* Tab toggle */}
      <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1 w-fit flex-wrap">
        <Button
          variant={tab === 'daily' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setTab('daily')}
          className="gap-2"
        >
          <Zap className="w-4 h-4" />
          Daily Log
        </Button>
        <Button
          variant={tab === 'products' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setTab('products')}
          className="gap-2"
        >
          <Package className="w-4 h-4" />
          Products
        </Button>
        <Button
          variant={tab === 'gum' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setTab('gum')}
          className="gap-2"
        >
          <Activity className="w-4 h-4" />
          Gum Health
        </Button>
        <Button
          variant={tab === 'checkups' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setTab('checkups')}
          className="gap-2"
        >
          <Stethoscope className="w-4 h-4" />
          Checkups
        </Button>
        <Button
          variant={tab === 'docs' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setTab('docs')}
          className="gap-2"
        >
          <FileText className="w-4 h-4" />
          Docs
        </Button>
        <Button
          variant={tab === 'dentists' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setTab('dentists')}
          className="gap-2"
        >
          <Users className="w-4 h-4" />
          Dentists
        </Button>
      </div>

      {/* ==================== DAILY LOG TAB ==================== */}
      {tab === 'daily' && (
        <div className="space-y-4">
          {/* Date navigator */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setViewDate(getDateOffset(viewDate, -1))}
              className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <p className="text-sm font-medium">
                {isToday ? 'Today' : formatDate(viewDate)}
              </p>
              {!isToday && (
                <button
                  onClick={() => setViewDate(today)}
                  className="text-xs text-[#E07A3A] hover:underline"
                >
                  Back to today
                </button>
              )}
            </div>
            <button
              onClick={() => !isToday && setViewDate(getDateOffset(viewDate, 1))}
              className={cn(
                'p-2 rounded-lg transition-colors',
                isToday ? 'opacity-30 cursor-not-allowed' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800',
              )}
              disabled={isToday}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Today's scorecard */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="!p-3 text-center">
              <div className={cn(
                'text-2xl font-bold',
                todaysBrushCount >= 2 ? 'text-green-600 dark:text-green-400' : todaysBrushCount === 1 ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-300 dark:text-neutral-600',
              )} style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
                {todaysBrushCount}/2
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Brushing</p>
              {todaysBrushCount >= 2 && <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto mt-1" />}
            </Card>
            <Card className="!p-3 text-center">
              <div className={cn(
                'text-2xl font-bold',
                todaysFlossCount > 0 ? 'text-green-600 dark:text-green-400' : 'text-neutral-300 dark:text-neutral-600',
              )} style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
                {todaysFlossCount > 0 ? '✓' : '—'}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Flossed</p>
            </Card>
            <Card className="!p-3 text-center">
              <div className={cn(
                'text-2xl font-bold',
                todaysWhitener ? 'text-amber-500' : 'text-neutral-300 dark:text-neutral-600',
              )} style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
                {todaysWhitener ? '✓' : '—'}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Whitener</p>
            </Card>
            <Card className="!p-3 text-center">
              <div className={cn(
                'text-2xl font-bold',
                todaysMouthwash ? 'text-teal-500' : 'text-neutral-300 dark:text-neutral-600',
              )} style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
                {todaysMouthwash ? '✓' : '—'}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Mouthwash</p>
            </Card>
          </div>

          {/* Quick log buttons */}
          <Card className="!p-4">
            <p className="text-sm font-medium mb-3">Quick Log</p>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(ACTIVITY_CONFIG) as [ActivityType, typeof ACTIVITY_CONFIG[ActivityType]][]).map(([key, cfg]) => (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickLog(key)}
                  disabled={isPending}
                  className="gap-2"
                >
                  <span>{cfg.icon}</span>
                  {cfg.label}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => { resetLogForm(); setShowLogModal(true); }}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Detailed
              </Button>
            </div>
          </Card>

          {/* 7-day streak */}
          <Card className="!p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium">7-Day Overview</p>
              {brushStreak > 0 && (
                <Badge variant="secondary" className="text-xs gap-1">
                  🔥 {brushStreak} day streak (2x brush)
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {last7Days.map((day) => {
                const dayName = new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
                const perfect = day.brushCount >= 2 && day.flossed;
                return (
                  <div key={day.date} className="text-center">
                    <p className="text-[10px] text-neutral-400 mb-1">{dayName}</p>
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center mx-auto text-xs font-bold',
                      perfect
                        ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                        : day.brushCount >= 2
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                          : day.brushCount === 1
                            ? 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400',
                    )}>
                      {day.brushCount >= 2 ? (day.flossed ? '★' : '✓') : day.brushCount || '·'}
                    </div>
                    {day.flossed && (
                      <p className="text-[8px] text-cyan-500 mt-0.5">floss</p>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-neutral-400 mt-2">★ = 2x brush + floss &nbsp; ✓ = 2x brush &nbsp; # = brush count</p>
          </Card>

          {/* Today's activity log */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              {isToday ? "Today's" : formatDate(viewDate)} Activity
            </p>
            {todaysLogs.length === 0 ? (
              <Card className="!p-6 text-center">
                <p className="text-neutral-400 text-sm">No activity logged{isToday ? ' yet today' : ' for this day'}.</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {todaysLogs.map((entry) => {
                  const cfg = ACTIVITY_CONFIG[entry.activity as ActivityType];
                  const product = entry.productId ? products.find((p) => p.id === entry.productId) : null;
                  return (
                    <Card key={entry.id} className="!p-3">
                      <div className="flex items-center gap-3">
                        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center text-lg', cfg.bgColor)}>
                          {cfg.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn('text-sm font-medium', cfg.color)}>{cfg.label}</span>
                            <span className="text-xs text-neutral-400">
                              <Clock className="w-3 h-3 inline mr-0.5" />
                              {formatTime12(entry.time)}
                            </span>
                            {entry.duration && (
                              <span className="text-xs text-neutral-400">
                                <Timer className="w-3 h-3 inline mr-0.5" />
                                {entry.duration}s
                              </span>
                            )}
                          </div>
                          {product && (
                            <p className="text-xs text-neutral-400 truncate">Using: {product.name}</p>
                          )}
                          {entry.notes && (
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{entry.notes}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteLog(entry.id)}
                          disabled={isPending}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== PRODUCTS TAB ==================== */}
      {tab === 'products' && (
        <div className="space-y-4">
          {/* Stats row */}
          <div className="flex items-center justify-between gap-4">
            <Card className="flex-1 !p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900 flex items-center justify-center">
                  <Package className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
                    {activeProducts.length}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    active products &bull; {formatCurrency(totalProductCost)} total
                  </p>
                </div>
              </div>
            </Card>
            <Button onClick={() => { resetProductForm(); setShowProductModal(true); }} className="gap-2 shrink-0">
              <Plus className="w-4 h-4" />
              Add Product
            </Button>
          </div>

          {/* Product grid */}
          {products.length === 0 ? (
            <Card className="!p-8 text-center">
              <Package className="w-10 h-10 mx-auto text-neutral-300 dark:text-neutral-600 mb-3" />
              <p className="text-neutral-500 dark:text-neutral-400">No products yet. Add your dental products!</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {products.map((prod) => {
                const catCfg = PRODUCT_CATEGORY_CONFIG[prod.category as ProductCategory];
                const daysSincePurchase = prod.purchaseDate
                  ? Math.floor((new Date(today + 'T00:00:00').getTime() - new Date(prod.purchaseDate + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24))
                  : null;
                const needsReplacement = prod.replacementFrequencyDays && daysSincePurchase !== null && daysSincePurchase > prod.replacementFrequencyDays;
                return (
                  <Card key={prod.id} className={cn('!p-4', !prod.active && 'opacity-50')}>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-xl shrink-0">
                        {catCfg.icon}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{prod.name}</p>
                            <p className="text-xs text-neutral-400">{prod.brand}{prod.model ? ` — ${prod.model}` : ''}</p>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              onClick={() => openEditProduct(prod)}
                              disabled={isPending}
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-[#E07A3A] hover:bg-orange-50 dark:hover:bg-orange-950 transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleProductActive(prod.id, !!prod.active)}
                              disabled={isPending}
                              className={cn(
                                'p-1.5 rounded-lg transition-colors text-xs',
                                prod.active
                                  ? 'text-green-500 hover:bg-green-50 dark:hover:bg-green-950'
                                  : 'text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800',
                              )}
                              title={prod.active ? 'Archive' : 'Reactivate'}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(prod.id)}
                              disabled={isPending}
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <Badge variant="secondary" className="text-[10px]">{catCfg.label}</Badge>
                          {prod.price && (
                            <span className="text-xs text-neutral-500 flex items-center gap-0.5">
                              <DollarSign className="w-3 h-3" />
                              {formatCurrency(prod.price)}
                            </span>
                          )}
                          {prod.purchaseDate && (
                            <span className="text-xs text-neutral-400">
                              Bought {formatDate(prod.purchaseDate)}
                            </span>
                          )}
                        </div>
                        {prod.replacementFrequencyDays && daysSincePurchase !== null && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              {needsReplacement ? (
                                <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  <span className="text-xs font-medium">Replace now! ({daysSincePurchase}d / {prod.replacementFrequencyDays}d)</span>
                                </div>
                              ) : (
                                <span className="text-xs text-neutral-500">
                                  Replace in {prod.replacementFrequencyDays - daysSincePurchase}d
                                </span>
                              )}
                              <span className="text-[10px] text-neutral-400">
                                {daysSincePurchase}d / {prod.replacementFrequencyDays}d
                              </span>
                            </div>
                            <div className="h-1.5 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full transition-all',
                                  needsReplacement
                                    ? 'bg-amber-500'
                                    : (daysSincePurchase / prod.replacementFrequencyDays) > 0.8
                                      ? 'bg-yellow-400'
                                      : 'bg-green-400',
                                )}
                                style={{ width: `${Math.min(100, (daysSincePurchase / prod.replacementFrequencyDays) * 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                        {prod.notes && (
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">{prod.notes}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== GUM HEALTH TAB ==================== */}
      {tab === 'gum' && (
        <div className="space-y-4">
          {/* Trend section */}
          {gumTrend && (
            <Card className="!p-4 space-y-3">
              <p className="text-sm font-medium" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
                Trend Comparison
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-neutral-400">Latest ({formatDate(gumTrend.latest.date)})</p>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'text-lg font-bold',
                      gumTrend.latest.overallScore && gumTrend.latest.overallScore <= 2
                        ? 'text-green-600 dark:text-green-400'
                        : gumTrend.latest.overallScore === 3
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-red-600 dark:text-red-400',
                    )} style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
                      {gumTrend.latest.overallScore}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {gumTrend.latest.overallScore ? GUM_SCORE_LABELS[gumTrend.latest.overallScore]?.label : 'N/A'}
                    </span>
                  </div>
                  {gumTrend.latestSummary.totalTeeth > 0 && (
                    <div className="text-[10px] text-neutral-400 space-y-0.5">
                      <p>{gumTrend.latestSummary.totalTeeth} teeth measured</p>
                      <p>Healthy: {gumTrend.latestSummary.healthy} | Watch: {gumTrend.latestSummary.watch} | Concern: {gumTrend.latestSummary.concern}</p>
                      <p>Avg: {gumTrend.latestSummary.avgDepth.toFixed(1)}mm | Max: {gumTrend.latestSummary.maxDepth}mm</p>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-neutral-400">Previous ({formatDate(gumTrend.previous.date)})</p>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'text-lg font-bold',
                      gumTrend.previous.overallScore && gumTrend.previous.overallScore <= 2
                        ? 'text-green-600 dark:text-green-400'
                        : gumTrend.previous.overallScore === 3
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-red-600 dark:text-red-400',
                    )} style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
                      {gumTrend.previous.overallScore}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {gumTrend.previous.overallScore ? GUM_SCORE_LABELS[gumTrend.previous.overallScore]?.label : 'N/A'}
                    </span>
                  </div>
                  {gumTrend.previousSummary.totalTeeth > 0 && (
                    <div className="text-[10px] text-neutral-400 space-y-0.5">
                      <p>{gumTrend.previousSummary.totalTeeth} teeth measured</p>
                      <p>Healthy: {gumTrend.previousSummary.healthy} | Watch: {gumTrend.previousSummary.watch} | Concern: {gumTrend.previousSummary.concern}</p>
                      <p>Avg: {gumTrend.previousSummary.avgDepth.toFixed(1)}mm | Max: {gumTrend.previousSummary.maxDepth}mm</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className={cn(
                  'text-xs',
                  gumTrend.scoreLabel === 'improved'
                    ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                    : gumTrend.scoreLabel === 'worsened'
                      ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400',
                )}>
                  Score: {gumTrend.scoreLabel}
                  {gumTrend.scoreChange !== 0 && ` (${gumTrend.scoreChange > 0 ? '+' : ''}${gumTrend.scoreChange})`}
                </Badge>
              </div>
              {gumTrend.reflection && (
                <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-3">
                  <p className="text-xs font-medium text-neutral-600 dark:text-neutral-300 mb-0.5">Reflection</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{gumTrend.reflection}</p>
                </div>
              )}
              {Object.keys(gumTrend.latestM).length > 0 && (
                <ToothChart
                  measurements={gumTrend.latestM}
                  previousMeasurements={Object.keys(gumTrend.previousM).length > 0 ? gumTrend.previousM : undefined}
                  readOnly
                  compact
                />
              )}
            </Card>
          )}

          {/* Current score + Add */}
          <div className="flex items-center justify-between gap-4">
            {latestGumScore ? (
              <Card className="flex-1 !p-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold',
                    latestGumScore.overallScore && latestGumScore.overallScore <= 2
                      ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                      : latestGumScore.overallScore === 3
                        ? 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300'
                        : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
                  )} style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
                    {latestGumScore.overallScore}
                  </div>
                  <div>
                    <p className={cn('text-sm font-semibold', latestGumScore.overallScore ? GUM_SCORE_LABELS[latestGumScore.overallScore]?.color : '')}>
                      {latestGumScore.overallScore ? GUM_SCORE_LABELS[latestGumScore.overallScore]?.label : 'N/A'}
                    </p>
                    <p className="text-xs text-neutral-400">
                      Last recorded {formatDate(latestGumScore.date)}
                      {latestGumScore.bleedingOnProbing && ' • Bleeding noted'}
                    </p>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="flex-1 !p-4">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">No gum health records yet</p>
              </Card>
            )}
            <div className="flex gap-2 shrink-0">
              {gumLogs.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => { resetGumForm(); copyFromLastGumSession(); setShowGumModal(true); }}
                  className="gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy Last
                </Button>
              )}
              <Button onClick={() => { resetGumForm(); setShowGumModal(true); }} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Record
              </Button>
            </div>
          </div>

          {/* Gum score info card */}
          <Card className="!p-4">
            <p className="text-sm font-medium mb-2">Gum Health Scale</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {Object.entries(GUM_SCORE_LABELS).map(([score, cfg]) => (
                <div key={score} className="flex items-center gap-2">
                  <div className={cn(
                    'w-6 h-6 rounded flex items-center justify-center text-xs font-bold',
                    parseInt(score) <= 2 ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                      : parseInt(score) === 3 ? 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300'
                        : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
                  )}>
                    {score}
                  </div>
                  <div>
                    <span className={cn('text-xs font-medium', cfg.color)}>{cfg.label}</span>
                    <span className="text-[10px] text-neutral-400 ml-1">— {cfg.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Gum health history */}
          {gumLogs.length === 0 ? (
            <Card className="!p-8 text-center">
              <Activity className="w-10 h-10 mx-auto text-neutral-300 dark:text-neutral-600 mb-3" />
              <p className="text-neutral-500 dark:text-neutral-400">No gum health records yet. Start tracking after your next dental visit!</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {gumLogs.map((entry) => {
                const scoreCfg = entry.overallScore ? GUM_SCORE_LABELS[entry.overallScore] : null;
                const entryMeasurements = parseMeasurementsJson(entry.measurements);
                const hasParsedMeasurements = Object.keys(entryMeasurements).length > 0;
                return (
                  <Card key={entry.id} className="!p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold shrink-0',
                        entry.overallScore && entry.overallScore <= 2
                          ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                          : entry.overallScore === 3
                            ? 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300'
                            : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
                      )} style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
                        {entry.overallScore}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                            <span className="text-sm font-medium">{formatDate(entry.date)}</span>
                            {scoreCfg && (
                              <span className={cn('text-xs font-medium', scoreCfg.color)}>{scoreCfg.label}</span>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteGumLog(entry.id)}
                            disabled={isPending}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {entry.bleedingOnProbing && (
                            <Badge variant="secondary" className="text-[10px] bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300">
                              <Droplets className="w-3 h-3 mr-0.5" />
                              Bleeding on probing
                            </Badge>
                          )}
                        </div>
                        {entry.notes && (
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">{entry.notes}</p>
                        )}
                        {hasParsedMeasurements ? (
                          <div className="mt-2">
                            <ToothChart measurements={entryMeasurements} readOnly compact />
                          </div>
                        ) : entry.measurements ? (
                          <p className="text-[10px] text-neutral-400 font-mono">Measurements: {entry.measurements}</p>
                        ) : null}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== CHECKUPS TAB ==================== */}
      {tab === 'checkups' && (
        <div className="space-y-4">
          {/* Next appointment + Add */}
          <div className="flex items-center justify-between gap-4">
            {nextAppt ? (
              <Card className="flex-1 !p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Next Appointment</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{formatDate(nextAppt)}</p>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="flex-1 !p-4">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">No upcoming appointments</p>
              </Card>
            )}
            <Button onClick={() => { resetCheckupForm(); setShowCheckupModal(true); }} className="gap-2 shrink-0">
              <Plus className="w-4 h-4" />
              Add Checkup
            </Button>
          </div>

          {/* Checkup history */}
          {checkups.length === 0 ? (
            <Card className="!p-8 text-center">
              <Stethoscope className="w-10 h-10 mx-auto text-neutral-300 dark:text-neutral-600 mb-3" />
              <p className="text-neutral-500 dark:text-neutral-400">No checkups logged yet.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {checkups.map((ck) => {
                const typeCfg = CHECKUP_TYPE_CONFIG[ck.type as CheckupType];
                const outOfPocket = (ck.cost || 0) - (ck.insuranceCovered || 0);
                return (
                  <Card key={ck.id} className="!p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                          <span className="text-sm font-medium">{formatDate(ck.date)}</span>
                          <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold', typeCfg.color)}>
                            {typeCfg.label}
                          </span>
                        </div>
                        {(ck.dentistName || ck.location) && (
                          <p className="text-xs text-neutral-400">
                            {ck.dentistName && `Dr. ${ck.dentistName}`}
                            {ck.dentistName && ck.location && ' — '}
                            {ck.location}
                          </p>
                        )}
                        {ck.cost !== null && ck.cost !== undefined && (
                          <div className="flex items-center gap-2 text-xs">
                            <DollarSign className="w-3 h-3 text-neutral-400" />
                            <span>{formatCurrency(ck.cost)}</span>
                            {ck.insuranceCovered && ck.insuranceCovered > 0 && (
                              <span className="text-neutral-400">
                                (insurance: {formatCurrency(ck.insuranceCovered)} • out of pocket: {formatCurrency(outOfPocket > 0 ? outOfPocket : 0)})
                              </span>
                            )}
                          </div>
                        )}
                        {ck.nextAppointment && (
                          <p className="text-xs text-blue-500">
                            Next appt: {formatDate(ck.nextAppointment)}
                          </p>
                        )}
                        {ck.notes && (
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">{ck.notes}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteCheckup(ck.id)}
                        disabled={isPending}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== DOCUMENTS TAB ==================== */}
      {tab === 'docs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Card className="flex-1 !p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
                    {documents.length}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">documents stored</p>
                </div>
              </div>
            </Card>
            <Button onClick={() => { resetDocForm(); setShowDocModal(true); }} className="gap-2 shrink-0">
              <Upload className="w-4 h-4" />
              Upload
            </Button>
          </div>

          {documents.length === 0 ? (
            <Card className="!p-8 text-center">
              <FileText className="w-10 h-10 mx-auto text-neutral-300 dark:text-neutral-600 mb-3" />
              <p className="text-neutral-500 dark:text-neutral-400">No documents yet. Upload X-rays, invoices, or treatment plans.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {documents.map((doc) => {
                const catCfg = DOC_CATEGORY_CONFIG[doc.category || 'other'];
                const isImage = doc.fileType.startsWith('image/');
                return (
                  <Card key={doc.id} className="!p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-xl shrink-0">
                        {catCfg.icon}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium truncate">{doc.name}</p>
                            <div className="flex items-center gap-2 flex-wrap mt-0.5">
                              <Badge variant="secondary" className="text-[10px]">{catCfg.label}</Badge>
                              <span className="text-[10px] text-neutral-400">{formatDate(doc.date)}</span>
                              {doc.fileSize && (
                                <span className="text-[10px] text-neutral-400">{formatFileSize(doc.fileSize)}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => {
                                if (isImage) {
                                  const w = window.open('', '_blank');
                                  if (w) {
                                    w.document.write(`<img src="${doc.fileData}" style="max-width:100%;height:auto;" />`);
                                    w.document.title = doc.name;
                                  }
                                } else {
                                  const w = window.open('', '_blank');
                                  if (w) {
                                    w.document.write(`<iframe src="${doc.fileData}" style="width:100%;height:100%;border:none;"></iframe>`);
                                    w.document.title = doc.name;
                                  }
                                }
                              }}
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
                              title="View document"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteDocument(doc.id)}
                              disabled={isPending}
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        {doc.notes && (
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">{doc.notes}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== DENTISTS TAB ==================== */}
      {tab === 'dentists' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Card className="flex-1 !p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
                    {contacts.length}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    dental contacts{contacts.filter((c) => c.favorite).length > 0 && ` • ${contacts.filter((c) => c.favorite).length} favorites`}
                  </p>
                </div>
              </div>
            </Card>
            <Button onClick={() => { resetContactForm(); setShowContactModal(true); }} className="gap-2 shrink-0">
              <Plus className="w-4 h-4" />
              Add Contact
            </Button>
          </div>

          {contacts.length === 0 ? (
            <Card className="!p-8 text-center">
              <Users className="w-10 h-10 mx-auto text-neutral-300 dark:text-neutral-600 mb-3" />
              <p className="text-neutral-500 dark:text-neutral-400">No dental contacts yet. Add your dentist, orthodontist, or specialist.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {[...contacts].sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0)).map((contact) => {
                const typeCfg = CONTACT_TYPE_CONFIG[contact.type] || CONTACT_TYPE_CONFIG.general;
                const isExpanded = expandedContacts.has(contact.id);
                let doctors: string[] = [];
                try { doctors = contact.doctors ? JSON.parse(contact.doctors) : []; } catch { /* */ }

                // Visit history & spend for this contact
                const contactCheckups = checkups.filter(
                  (c) => c.dentistName && contact.doctors &&
                    (() => { try { return (JSON.parse(contact.doctors) as string[]).some((d: string) => c.dentistName?.toLowerCase().includes(d.toLowerCase().replace(/^dr\.?\s*/i, ''))); } catch { return false; } })()
                  || (c.location && c.location.toLowerCase().includes(contact.name.toLowerCase()))
                );
                const totalSpent = contactCheckups.reduce((sum, c) => sum + (c.cost || 0), 0);
                const totalInsurance = contactCheckups.reduce((sum, c) => sum + (c.insuranceCovered || 0), 0);

                return (
                  <Card key={contact.id} className="!p-0 overflow-hidden">
                    {/* Collapsed header — always visible, clickable */}
                    <button
                      type="button"
                      onClick={() => toggleContactExpanded(contact.id)}
                      className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleFavorite(contact.id, !!contact.favorite); }}
                        disabled={isPending}
                        className={cn(
                          'p-1 rounded-lg transition-colors shrink-0',
                          contact.favorite
                            ? 'text-amber-500'
                            : 'text-neutral-300 dark:text-neutral-600 hover:text-amber-400',
                        )}
                      >
                        <Star className={cn('w-4 h-4', contact.favorite && 'fill-current')} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
                            {contact.name}
                          </span>
                          <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold', typeCfg.color)}>
                            {typeCfg.label}
                          </span>
                        </div>
                        {contact.address && (
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">{contact.address}</span>
                          </p>
                        )}
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-neutral-400 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
                      )}
                    </button>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-neutral-100 dark:border-neutral-800 space-y-4">
                        {/* Contact info grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {contact.phone && (
                            <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-xs text-[#E07A3A] hover:underline bg-neutral-50 dark:bg-neutral-800/50 rounded-lg px-3 py-2">
                              <Phone className="w-3.5 h-3.5" />
                              {contact.phone}
                            </a>
                          )}
                          {contact.website && (
                            <a
                              href={contact.website.startsWith('http') ? contact.website : `https://${contact.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-xs text-[#E07A3A] hover:underline bg-neutral-50 dark:bg-neutral-800/50 rounded-lg px-3 py-2 truncate"
                            >
                              <Globe className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{contact.website}</span>
                              <ExternalLink className="w-3 h-3 shrink-0 ml-auto" />
                            </a>
                          )}
                        </div>

                        {/* Doctors */}
                        {doctors.length > 0 && (
                          <div>
                            <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold mb-1">Doctors</p>
                            <div className="flex gap-1.5 flex-wrap">
                              {doctors.map((d, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  <Stethoscope className="w-3 h-3 mr-1" />{d}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Insurance */}
                        {contact.insurance && (
                          <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>{contact.insurance}</span>
                          </div>
                        )}

                        {/* Financial summary */}
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-2.5 text-center">
                            <p className="text-lg font-bold" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
                              {contactCheckups.length}
                            </p>
                            <p className="text-[10px] text-neutral-500">Visits</p>
                          </div>
                          <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-2.5 text-center">
                            <p className="text-lg font-bold text-red-500" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
                              {formatCurrency(totalSpent)}
                            </p>
                            <p className="text-[10px] text-neutral-500">Total Billed</p>
                          </div>
                          <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-2.5 text-center">
                            <p className="text-lg font-bold text-emerald-500" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
                              {formatCurrency(totalInsurance)}
                            </p>
                            <p className="text-[10px] text-neutral-500">Insurance</p>
                          </div>
                        </div>

                        {/* Visit history */}
                        {contactCheckups.length > 0 && (
                          <div>
                            <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold mb-1.5">Visit History</p>
                            <div className="space-y-1.5 max-h-40 overflow-y-auto">
                              {contactCheckups.map((ck) => (
                                <div key={ck.id} className="flex items-center justify-between gap-2 text-xs bg-neutral-50 dark:bg-neutral-800/50 rounded-lg px-3 py-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Calendar className="w-3 h-3 text-neutral-400 shrink-0" />
                                    <span className="text-neutral-600 dark:text-neutral-300">{formatDate(ck.date)}</span>
                                    <Badge variant="secondary" className="text-[10px] capitalize">{ck.type}</Badge>
                                  </div>
                                  {ck.cost !== null && ck.cost !== undefined && (
                                    <span className="text-neutral-500 shrink-0">{formatCurrency(ck.cost)}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Related documents */}
                        {(() => {
                          const checkupIds = new Set(contactCheckups.map((c) => c.id));
                          const contactDocs = documents.filter((d) => d.checkupId && checkupIds.has(d.checkupId));
                          // Also match docs by date overlap with checkups
                          const checkupDates = new Set(contactCheckups.map((c) => c.date));
                          const dateDocs = documents.filter((d) => !d.checkupId && checkupDates.has(d.date));
                          const allDocs = [...contactDocs, ...dateDocs];
                          if (allDocs.length === 0) return null;
                          return (
                            <div>
                              <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold mb-1.5">Documents</p>
                              <div className="space-y-1.5">
                                {allDocs.map((doc) => {
                                  const catCfg = DOC_CATEGORY_CONFIG[doc.category || 'other'] || DOC_CATEGORY_CONFIG.other;
                                  return (
                                    <button
                                      key={doc.id}
                                      type="button"
                                      onClick={() => {
                                        if (doc.fileData.startsWith('data:application/pdf')) {
                                          window.open(doc.fileData, '_blank');
                                        } else {
                                          setViewDocData(doc.fileData);
                                        }
                                      }}
                                      className="w-full flex items-center justify-between gap-2 text-xs bg-neutral-50 dark:bg-neutral-800/50 rounded-lg px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 transition-colors text-left"
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span>{catCfg.icon}</span>
                                        <span className="text-neutral-600 dark:text-neutral-300 truncate">{doc.name}</span>
                                        <Badge variant="secondary" className="text-[10px] shrink-0">{catCfg.label}</Badge>
                                      </div>
                                      <span className="text-neutral-400 shrink-0">{formatDate(doc.date)}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Last visited */}
                        {contact.lastVisited && (
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                            Last visited: {formatDate(contact.lastVisited)}
                          </p>
                        )}

                        {/* Notes */}
                        {contact.notes && (
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 italic bg-neutral-50 dark:bg-neutral-800/50 rounded-lg px-3 py-2">
                            {contact.notes}
                          </p>
                        )}

                        {/* Delete button */}
                        <div className="flex justify-end pt-1">
                          <button
                            onClick={() => handleDeleteContact(contact.id)}
                            disabled={isPending}
                            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Remove Contact
                          </button>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== DETAILED LOG MODAL ==================== */}
      <Dialog open={showLogModal} onOpenChange={setShowLogModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
              Log Dental Activity
            </DialogTitle>
            <DialogDescription>Record a detailed dental care activity</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Activity selector */}
            <div>
              <label className="text-sm font-medium mb-1 block">Activity</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(ACTIVITY_CONFIG) as [ActivityType, typeof ACTIVITY_CONFIG[ActivityType]][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setLogActivity(key)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border',
                      logActivity === key
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                        : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400',
                    )}
                  >
                    <span>{cfg.icon}</span>
                    <span>{cfg.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Time */}
            <div>
              <label className="text-sm font-medium mb-1 block">Time</label>
              <Input type="time" value={logTime} onChange={(e) => setLogTime(e.target.value)} />
            </div>

            {/* Duration */}
            <div>
              <label className="text-sm font-medium mb-1 block">Duration (seconds)</label>
              <Input
                type="number"
                placeholder="120"
                value={logDuration}
                onChange={(e) => setLogDuration(e.target.value)}
              />
              <p className="text-[10px] text-neutral-400 mt-1">Dentists recommend 120s (2 min) for brushing</p>
            </div>

            {/* Product */}
            {activeProducts.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-1 block">Product used</label>
                <select
                  value={logProductId || ''}
                  onChange={(e) => setLogProductId(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
                >
                  <option value="">None</option>
                  {activeProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <Textarea
                placeholder="Any notes..."
                value={logNotes}
                onChange={(e) => setLogNotes(e.target.value)}
                rows={2}
              />
            </div>

            <Button onClick={handleSaveLog} disabled={isPending} className="w-full">
              {isPending ? 'Saving...' : 'Save Entry'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ==================== ADD/EDIT PRODUCT MODAL ==================== */}
      <Dialog open={showProductModal} onOpenChange={setShowProductModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
              {editingProductId ? 'Edit Product' : 'Add Dental Product'}
            </DialogTitle>
            <DialogDescription>{editingProductId ? 'Update product details' : 'Track your dental care products and costs'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Name *</label>
              <Input
                placeholder="Oral-B iO Series 15..."
                value={prodName}
                onChange={(e) => setProdName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Brand *</label>
              <Input
                placeholder="Oral-B, Waterpik, Crest..."
                value={prodBrand}
                onChange={(e) => setProdBrand(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Category</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(PRODUCT_CATEGORY_CONFIG) as [ProductCategory, typeof PRODUCT_CATEGORY_CONFIG[ProductCategory]][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setProdCategory(key)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border',
                      prodCategory === key
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                        : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400',
                    )}
                  >
                    <span>{cfg.icon}</span>
                    <span>{cfg.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Model</label>
              <Input
                placeholder="iO Series 15..."
                value={prodModel}
                onChange={(e) => setProdModel(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Price ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="89.99"
                  value={prodPrice}
                  onChange={(e) => setProdPrice(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Purchase Date</label>
                <Input
                  type="date"
                  value={prodPurchaseDate}
                  onChange={(e) => setProdPurchaseDate(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Replace every (days)</label>
              <Input
                type="number"
                placeholder="90 (for brush heads)"
                value={prodReplacementDays}
                onChange={(e) => setProdReplacementDays(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <Textarea
                placeholder="Any notes about this product..."
                value={prodNotes}
                onChange={(e) => setProdNotes(e.target.value)}
                rows={2}
              />
            </div>
            <Button onClick={handleSaveProduct} disabled={isPending} className="w-full">
              {isPending ? 'Saving...' : editingProductId ? 'Update Product' : 'Save Product'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ==================== ADD CHECKUP MODAL ==================== */}
      <Dialog open={showCheckupModal} onOpenChange={setShowCheckupModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
              Log Dental Checkup
            </DialogTitle>
            <DialogDescription>Record a dental visit</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Date</label>
              <Input type="date" value={ckDate} onChange={(e) => setCkDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Type</label>
              <div className="flex gap-2 flex-wrap">
                {(Object.entries(CHECKUP_TYPE_CONFIG) as [CheckupType, typeof CHECKUP_TYPE_CONFIG[CheckupType]][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCkType(key)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium transition-colors border',
                      ckType === key
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                        : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400',
                    )}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Dentist Name</label>
                <Input
                  placeholder="Dr. Smith..."
                  value={ckDentist}
                  onChange={(e) => setCkDentist(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Location</label>
                <Input
                  placeholder="Downtown Dental..."
                  value={ckLocation}
                  onChange={(e) => setCkLocation(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Cost ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="150.00"
                  value={ckCost}
                  onChange={(e) => setCkCost(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Insurance Covered ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="120.00"
                  value={ckInsurance}
                  onChange={(e) => setCkInsurance(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Next Appointment</label>
              <Input type="date" value={ckNextAppt} onChange={(e) => setCkNextAppt(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <Textarea
                placeholder="What the dentist said, any concerns..."
                value={ckNotes}
                onChange={(e) => setCkNotes(e.target.value)}
                rows={3}
              />
            </div>
            <Button onClick={handleSaveCheckup} disabled={isPending} className="w-full">
              {isPending ? 'Saving...' : 'Save Checkup'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ==================== ADD GUM HEALTH MODAL ==================== */}
      <Dialog open={showGumModal} onOpenChange={setShowGumModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="pb-0">
            <DialogTitle style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
              Log Gum Health
            </DialogTitle>
            <DialogDescription className="sr-only">Record your gum health assessment</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {/* Date + Bleeding — same row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Date</label>
                <Input type="date" value={gumDate} onChange={(e) => setGumDate(e.target.value)} className="h-8 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Bleeding on Probing?</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setGumBleeding(false)}
                    className={cn(
                      'flex-1 h-8 rounded-lg text-xs font-medium transition-colors border',
                      !gumBleeding
                        ? 'border-green-500 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400',
                    )}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => setGumBleeding(true)}
                    className={cn(
                      'flex-1 h-8 rounded-lg text-xs font-medium transition-colors border',
                      gumBleeding
                        ? 'border-red-500 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400',
                    )}
                  >
                    Yes
                  </button>
                </div>
              </div>
            </div>

            {/* Overall score — compact inline */}
            <div>
              <label className="text-xs font-medium mb-1 block">Overall Score *</label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((score) => {
                  const cfg = GUM_SCORE_LABELS[score];
                  return (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setGumScore(score)}
                      className={cn(
                        'flex-1 py-1.5 rounded-lg text-center transition-colors border',
                        gumScore === score
                          ? score <= 2
                            ? 'border-green-500 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300'
                            : score === 3
                              ? 'border-amber-500 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                              : 'border-red-500 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300'
                          : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400',
                      )}
                    >
                      <p className="text-sm font-bold" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>{score}</p>
                      <p className="text-[9px] leading-tight">{cfg.label}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pocket depth measurements — compact tooth chart */}
            <div>
              <label className="text-xs font-medium mb-1 block">Pocket Depths</label>
              <ToothChart
                measurements={gumToothMeasurements}
                onChange={setGumToothMeasurements}
                compact
              />
              <p className="text-[10px] text-neutral-400 mt-1">Tap a tooth to enter depths. 1-3mm healthy, 4mm watch, 5mm+ concern</p>
            </div>

            {/* Notes + Save — same row */}
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="text-xs font-medium mb-1 block">Notes</label>
                <Input
                  placeholder="Dentist notes, bleeding areas..."
                  value={gumNotes}
                  onChange={(e) => setGumNotes(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <Button onClick={handleSaveGumLog} disabled={isPending} className="h-8 px-6 shrink-0">
                {isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ==================== UPLOAD DOCUMENT MODAL ==================== */}
      <Dialog open={showDocModal} onOpenChange={setShowDocModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
              Upload Document
            </DialogTitle>
            <DialogDescription>Upload X-rays, invoices, treatment plans, and more</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* File select button */}
            <div>
              <label className="text-sm font-medium mb-1 block">File *</label>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full gap-2"
              >
                <Upload className="w-4 h-4" />
                {docFileData ? `Selected (${formatFileSize(docFileSize)})` : 'Choose PDF or Image'}
              </Button>
              {docFileData && docFileType.startsWith('image/') && (
                <div className="mt-2 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={docFileData} alt="Preview" className="max-h-32 mx-auto object-contain" />
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Name *</label>
              <Input
                placeholder="X-ray results, Treatment plan..."
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Category</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(DOC_CATEGORY_CONFIG).map(([key, cfg]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setDocCategory(key)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border',
                      docCategory === key
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                        : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400',
                    )}
                  >
                    <span>{cfg.icon}</span>
                    <span>{cfg.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Date</label>
              <Input type="date" value={docDate} onChange={(e) => setDocDate(e.target.value)} />
            </div>

            {checkups.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-1 block">Link to Checkup (optional)</label>
                <select
                  value={docCheckupId || ''}
                  onChange={(e) => setDocCheckupId(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
                >
                  <option value="">None</option>
                  {checkups.map((ck) => (
                    <option key={ck.id} value={ck.id}>
                      {formatDate(ck.date)} — {CHECKUP_TYPE_CONFIG[ck.type as CheckupType]?.label || ck.type}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <Textarea
                placeholder="Any notes about this document..."
                value={docNotes}
                onChange={(e) => setDocNotes(e.target.value)}
                rows={2}
              />
            </div>

            <Button onClick={handleSaveDocument} disabled={isPending} className="w-full">
              {isPending ? 'Saving...' : 'Save Document'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ==================== ADD CONTACT MODAL ==================== */}
      <Dialog open={showContactModal} onOpenChange={setShowContactModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
              Add Dental Contact
            </DialogTitle>
            <DialogDescription>Save a dentist, specialist, or dental office</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Practice / Office Name *</label>
              <Input
                placeholder="Downtown Dental Care..."
                value={ctName}
                onChange={(e) => setCtName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Type</label>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(CONTACT_TYPE_CONFIG).map(([key, cfg]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCtType(key)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium transition-colors border',
                      ctType === key
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                        : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400',
                    )}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Address</label>
              <Input
                placeholder="123 Main St, Suite 200..."
                value={ctAddress}
                onChange={(e) => setCtAddress(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Phone</label>
                <Input
                  placeholder="(555) 123-4567"
                  value={ctPhone}
                  onChange={(e) => setCtPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Website</label>
                <Input
                  placeholder="www.example.com"
                  value={ctWebsite}
                  onChange={(e) => setCtWebsite(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Doctors</label>
              <Input
                placeholder="Dr. Smith, Dr. Jones..."
                value={ctDoctors}
                onChange={(e) => setCtDoctors(e.target.value)}
              />
              <p className="text-[10px] text-neutral-400 mt-1">Comma-separated list of doctors at this practice</p>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Insurance Accepted</label>
              <Input
                placeholder="Delta Dental, Cigna..."
                value={ctInsurance}
                onChange={(e) => setCtInsurance(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Last Visited</label>
              <Input
                type="date"
                value={ctLastVisited}
                onChange={(e) => setCtLastVisited(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <Textarea
                placeholder="Any notes about this practice..."
                value={ctNotes}
                onChange={(e) => setCtNotes(e.target.value)}
                rows={2}
              />
            </div>

            <Button onClick={handleSaveContact} disabled={isPending} className="w-full">
              {isPending ? 'Saving...' : 'Save Contact'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document viewer */}
      <Dialog open={!!viewDocData} onOpenChange={() => setViewDocData(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>Document</DialogTitle>
            <DialogDescription>Full size view</DialogDescription>
          </DialogHeader>
          {viewDocData && <img src={viewDocData} alt="Document" className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
