'use client';

import React, { useState, useTransition, useMemo, useRef } from 'react';
import { compressImage } from '@/lib/compress-image';
import { Card, CardContent } from '@/components/ui/card';
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
  DollarSign,
  MapPin,
  Camera,
  Eye,
  Heart,
  Stethoscope,
  Syringe,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Shield,
  Dog,
  PawPrint,
  Weight,
  Cake,
  Award,
  Pencil,
  Phone,
  Scissors,
  BookOpen,
  Zap,
  Upload,
  FileText,
} from 'lucide-react';
import { addDog, updateDog, deleteDog, addVetVisit, updateVetVisit, deleteVetVisit, deleteBloodwork, addVetContact, toggleVetContactFavorite, deleteVetContact } from '@/db/queries/vet';
import { formatDate, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Dog as DogType, VetVisit, Bloodwork, VetContact } from '@/db/schema';

// --- Types & Constants ---

interface Props {
  dogs: DogType[];
  visits: VetVisit[];
  bloodwork: Bloodwork[];
  today: string;
  vetContacts: VetContact[];
}

type ContactType = 'vet' | 'groomer' | 'specialist' | 'emergency';

const CONTACT_TYPE_CONFIG: Record<ContactType, { label: string; icon: React.ReactNode; color: string }> = {
  vet: { label: 'Vet', icon: <Stethoscope className="w-3 h-3" />, color: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' },
  groomer: { label: 'Groomer', icon: <Scissors className="w-3 h-3" />, color: 'bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300' },
  specialist: { label: 'Specialist', icon: <BookOpen className="w-3 h-3" />, color: 'bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300' },
  emergency: { label: 'Emergency', icon: <Zap className="w-3 h-3" />, color: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' },
};

interface BloodworkResult {
  value: string | number | null;
  unit: string | null;
  range: string | null;
  flag: string | null;
}

type VisitType = 'checkup' | 'vaccination' | 'dental' | 'procedure' | 'emergency' | 'grooming' | 'other';

const VISIT_TYPE_CONFIG: Record<VisitType, { label: string; icon: string; color: string }> = {
  checkup: { label: 'Checkup', icon: '🩺', color: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' },
  vaccination: { label: 'Vaccination', icon: '💉', color: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' },
  dental: { label: 'Dental', icon: '🦷', color: 'bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300' },
  procedure: { label: 'Procedure', icon: '🏥', color: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300' },
  emergency: { label: 'Emergency', icon: '🚨', color: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' },
  grooming: { label: 'Grooming', icon: '✂️', color: 'bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300' },
  other: { label: 'Other', icon: '📋', color: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300' },
};

function getAge(dob: string, today: string): string {
  const birth = new Date(dob + 'T00:00:00');
  const now = new Date(today + 'T00:00:00');
  const years = now.getFullYear() - birth.getFullYear();
  const months = now.getMonth() - birth.getMonth();
  const adjustedYears = months < 0 ? years - 1 : years;
  const adjustedMonths = months < 0 ? months + 12 : months;
  if (adjustedYears === 0) return `${adjustedMonths}mo`;
  if (adjustedMonths === 0) return `${adjustedYears}yr`;
  return `${adjustedYears}yr ${adjustedMonths}mo`;
}

function PhotoUpload({ onSelect, photo }: { onSelect: (url: string) => void; photo: string | null }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { toast.error('Photo must be under 2MB'); return; }
        const base64 = await compressImage(file);
        onSelect(base64);
      }} />
      <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.click()} className="gap-2">
        <Camera className="w-4 h-4" />{photo ? 'Change Photo' : 'Upload Photo'}
      </Button>
      {photo && <img src={photo} alt="Preview" className="mt-2 w-16 h-16 rounded-lg object-cover border border-neutral-200 dark:border-neutral-700" />}
    </div>
  );
}

// --- Main Component ---

export function VetClient({ dogs, visits, bloodwork: bloodworkData, today, vetContacts }: Props) {
  const [isPending, startTransition] = useTransition();
  const [selectedDogId, setSelectedDogId] = useState<number | 'all'>('all');
  const [expandedDog, setExpandedDog] = useState<number | null>(null);

  // Dog modal
  const [showDogModal, setShowDogModal] = useState(false);
  const [dogName, setDogName] = useState('');
  const [dogBreed, setDogBreed] = useState('');
  const [dogDob, setDogDob] = useState('');
  const [dogWeight, setDogWeight] = useState('');
  const [dogSpayed, setDogSpayed] = useState(false);
  const [dogSpayDate, setDogSpayDate] = useState('');
  const [dogAkc, setDogAkc] = useState('');
  const [dogMicrochip, setDogMicrochip] = useState('');
  const [dogPhoto, setDogPhoto] = useState<string | null>(null);
  const [dogNotes, setDogNotes] = useState('');

  // Visit modal
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [visitDogId, setVisitDogId] = useState<number>(dogs[0]?.id || 0);
  const [visitDate, setVisitDate] = useState(today);
  const [visitVet, setVisitVet] = useState('');
  const [visitLocation, setVisitLocation] = useState('');
  const [visitType, setVisitType] = useState<VisitType>('checkup');
  const [visitProcedures, setVisitProcedures] = useState('');
  const [visitTeeth, setVisitTeeth] = useState('');
  const [visitCost, setVisitCost] = useState('');
  const [visitInsurance, setVisitInsurance] = useState('');
  const [visitMeds, setVisitMeds] = useState('');
  const [visitRecs, setVisitRecs] = useState('');
  const [visitNextAppt, setVisitNextAppt] = useState('');
  const [visitNotes, setVisitNotes] = useState('');
  const [visitReceipt, setVisitReceipt] = useState('');
  const [visitReceiptType, setVisitReceiptType] = useState('');
  const [visitLineItems, setVisitLineItems] = useState<Array<{ description: string; amount: number }>>([]);

  const receiptInputRef = useRef<HTMLInputElement>(null);

  // Photo viewer
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);

  // Receipt viewer
  const [viewReceipt, setViewReceipt] = useState<{ data: string; visitLabel: string } | null>(null);

  // Receipt upload for existing visits
  const visitReceiptInputRef = useRef<HTMLInputElement>(null);
  const [uploadReceiptVisitId, setUploadReceiptVisitId] = useState<number | null>(null);

  const handleUploadReceiptToVisit = (visitId: number) => {
    setUploadReceiptVisitId(visitId);
    setTimeout(() => visitReceiptInputRef.current?.click(), 0);
  };

  const handleReceiptFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadReceiptVisitId) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large (max 5MB)');
      return;
    }
    const base64 = file.type.startsWith('image/')
      ? await compressImage(file)
      : await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
    startTransition(async () => {
      await updateVetVisit(uploadReceiptVisitId!, { receipt: base64 });
      toast.success('Receipt uploaded!');
      setUploadReceiptVisitId(null);
    });
    e.target.value = '';
  };

  // Contact modal
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactType, setContactType] = useState<ContactType>('vet');
  const [contactAddress, setContactAddress] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactWebsite, setContactWebsite] = useState('');
  const [contactDoctors, setContactDoctors] = useState('');
  const [contactNotes, setContactNotes] = useState('');
  const [contactLastVisited, setContactLastVisited] = useState('');

  const filteredVisits = useMemo(() =>
    selectedDogId === 'all' ? visits : visits.filter((v) => v.dogId === selectedDogId),
    [visits, selectedDogId],
  );

  const totalVetSpend = visits.reduce((sum, v) => sum + (v.cost || 0), 0);
  const totalTeethExtracted = visits.reduce((sum, v) => sum + (v.teethExtracted || 0), 0);

  const resetDogForm = () => {
    setDogName(''); setDogBreed(''); setDogDob(''); setDogWeight('');
    setDogSpayed(false); setDogSpayDate(''); setDogAkc(''); setDogMicrochip('');
    setDogPhoto(null); setDogNotes('');
  };

  const resetVisitForm = () => {
    setVisitDogId(dogs[0]?.id || 0); setVisitDate(today); setVisitVet(''); setVisitLocation('');
    setVisitType('checkup'); setVisitProcedures(''); setVisitTeeth(''); setVisitCost('');
    setVisitInsurance(''); setVisitMeds(''); setVisitRecs(''); setVisitNextAppt(''); setVisitNotes('');
    setVisitReceipt(''); setVisitReceiptType(''); setVisitLineItems([]);
  };

  const handleSaveDog = () => {
    if (!dogName.trim()) { toast.error('Name is required'); return; }
    startTransition(async () => {
      await addDog({
        name: dogName.trim(),
        breed: dogBreed.trim() || undefined,
        dob: dogDob || undefined,
        weight: dogWeight ? parseFloat(dogWeight) : undefined,
        spayed: dogSpayed,
        spayDate: dogSpayDate || undefined,
        akcCert: dogAkc.trim() || undefined,
        microchipId: dogMicrochip.trim() || undefined,
        photo: dogPhoto || undefined,
        notes: dogNotes.trim() || undefined,
      });
      toast.success(`${dogName} added!`);
      setShowDogModal(false);
      resetDogForm();
    });
  };

  const handleDeleteDog = (id: number, name: string) => {
    let cancelled = false;
    const savedDogId = selectedDogId;
    if (selectedDogId === id) setSelectedDogId('all');
    const timer = setTimeout(() => {
      if (!cancelled) startTransition(async () => { await deleteDog(id); });
    }, 5000);
    toast(`${name} removed`, {
      duration: 5000,
      action: { label: 'Undo', onClick: () => { cancelled = true; clearTimeout(timer); if (savedDogId === id) setSelectedDogId(id); } },
    });
  };

  const handleSaveVisit = () => {
    if (!visitDogId) { toast.error('Select a dog'); return; }
    startTransition(async () => {
      const procedures = visitProcedures.trim()
        ? JSON.stringify(visitProcedures.split(',').map((p) => p.trim()).filter(Boolean))
        : undefined;
      const medications = visitMeds.trim()
        ? JSON.stringify(visitMeds.split(',').map((m) => m.trim()).filter(Boolean))
        : undefined;
      await addVetVisit({
        dogId: visitDogId,
        date: visitDate,
        vetName: visitVet.trim() || undefined,
        location: visitLocation.trim() || undefined,
        type: visitType,
        procedures,
        teethExtracted: visitTeeth ? parseInt(visitTeeth) : undefined,
        cost: visitCost ? parseFloat(visitCost) : undefined,
        insuranceCovered: visitInsurance ? parseFloat(visitInsurance) : undefined,
        receipt: visitReceipt || undefined,
        lineItems: visitLineItems.length > 0 ? JSON.stringify(visitLineItems) : undefined,
        medications,
        recommendations: visitRecs.trim() || undefined,
        nextAppointment: visitNextAppt || undefined,
        notes: visitNotes.trim() || undefined,
      });
      toast.success('Vet visit logged!');
      setShowVisitModal(false);
      resetVisitForm();
    });
  };

  const handleDeleteVisit = (id: number) => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) startTransition(async () => { await deleteVetVisit(id); });
    }, 5000);
    toast('Visit deleted', {
      duration: 5000,
      action: { label: 'Undo', onClick: () => { cancelled = true; clearTimeout(timer); } },
    });
  };

  const resetContactForm = () => {
    setContactName(''); setContactType('vet'); setContactAddress('');
    setContactPhone(''); setContactWebsite(''); setContactDoctors(''); setContactNotes('');
    setContactLastVisited('');
  };

  const handleSaveContact = () => {
    if (!contactName.trim()) { toast.error('Name is required'); return; }
    startTransition(async () => {
      const doctorsJson = contactDoctors.trim()
        ? JSON.stringify(contactDoctors.split(',').map((d) => d.trim()).filter(Boolean))
        : undefined;
      await addVetContact({
        name: contactName.trim(),
        type: contactType,
        address: contactAddress.trim() || undefined,
        phone: contactPhone.trim() || undefined,
        website: contactWebsite.trim() || undefined,
        doctors: doctorsJson,
        notes: contactNotes.trim() || undefined,
        lastVisited: contactLastVisited || undefined,
      });
      toast.success(`${contactName.trim()} added!`);
      setShowContactModal(false);
      resetContactForm();
    });
  };

  const handleToggleFavorite = (id: number, current: boolean) => {
    startTransition(async () => {
      await toggleVetContactFavorite(id, !current);
    });
  };

  const handleDeleteContact = (id: number, name: string) => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) startTransition(async () => { await deleteVetContact(id); });
    }, 5000);
    toast(`${name} removed`, {
      duration: 5000,
      action: { label: 'Undo', onClick: () => { cancelled = true; clearTimeout(timer); } },
    });
  };

  const nextAppts = visits.filter((v) => v.nextAppointment && v.nextAppointment >= today);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
            Vet & Dogs
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {dogs.length} dog{dogs.length !== 1 ? 's' : ''} &bull; {formatCurrency(totalVetSpend)} total vet spend
          </p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button variant="outline" onClick={() => { resetDogForm(); setShowDogModal(true); }} className="gap-2">
            <PawPrint className="w-4 h-4" /> Add Dog
          </Button>
          <Button variant="outline" onClick={() => { resetContactForm(); setShowContactModal(true); }} className="gap-2">
            <BookOpen className="w-4 h-4" /> Add Contact
          </Button>
          <Button onClick={() => { resetVisitForm(); setShowVisitModal(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Add Visit
          </Button>
        </div>
      </div>

      {/* Dog profiles */}
      {dogs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {dogs.map((dog) => {
            const dogVisits = visits.filter((v) => v.dogId === dog.id);
            const dogSpend = dogVisits.reduce((s, v) => s + (v.cost || 0), 0);
            const dogTeeth = dogVisits.reduce((s, v) => s + (v.teethExtracted || 0), 0);
            const isExpanded = expandedDog === dog.id;
            return (
              <Card
                key={dog.id}
                className={cn('!p-0 overflow-hidden cursor-pointer transition-all', selectedDogId === dog.id && 'ring-2 ring-[#E07A3A]')}
                onClick={() => setSelectedDogId(selectedDogId === dog.id ? 'all' : dog.id)}
              >
                {/* Photo + name overlay */}
                <div className="relative">
                  {dog.photo ? (
                    <button onClick={(e) => { e.stopPropagation(); setViewPhoto(dog.photo); }} className="w-full group block">
                      <img src={dog.photo} alt={dog.name} className="w-full aspect-square object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  ) : (
                    <div className="w-full aspect-square bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-950 dark:to-orange-950 flex items-center justify-center">
                      <PawPrint className="w-12 h-12 text-amber-300 dark:text-amber-700" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                    </div>
                  )}
                  {/* Name + expand overlaid on bottom of photo */}
                  <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-2 flex items-end justify-between">
                    <div>
                      <h3 className="font-bold text-base text-white drop-shadow-md" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>{dog.name}</h3>
                      <div className="flex items-center gap-1.5">
                        {dog.breed && <p className="text-[10px] text-white/80 drop-shadow">{dog.breed}</p>}
                        {dog.sex && (
                          <span className="text-[9px] text-white/80 font-medium">
                            {dog.sex === 'male' ? '♂' : '♀'}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setExpandedDog(isExpanded ? null : dog.id); }}
                      className="p-1 rounded bg-black/20 hover:bg-black/40 transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-white" /> : <ChevronDown className="w-3.5 h-3.5 text-white" />}
                    </button>
                  </div>
                </div>

                <div className="px-2.5 py-2 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap text-[10px] text-neutral-500 dark:text-neutral-400">
                    {dog.dob && (
                      <span className="flex items-center gap-0.5">
                        <Cake className="w-3 h-3" /> {getAge(dog.dob, today)}
                      </span>
                    )}
                    {dog.weight && (
                      <span className="flex items-center gap-0.5">
                        <Weight className="w-3 h-3" /> {dog.weight} lbs
                      </span>
                    )}
                    {dog.spayed ? (
                      <Badge variant="secondary" className="text-[8px] px-1 py-0">
                        {dog.sex === 'male' ? 'Neutered' : 'Spayed'}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[8px] px-1 py-0 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300">
                        Not {dog.sex === 'male' ? 'Neutered' : 'Spayed'}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[10px]">
                    <span className="text-neutral-500">{dogVisits.length} visits</span>
                    <span className="text-neutral-500">{formatCurrency(dogSpend)}</span>
                    {dogTeeth > 0 && <span className="text-amber-500">🦷 {dogTeeth} extracted</span>}
                  </div>

                  {isExpanded && (() => {
                    const rabiesOverdue = dog.rabiesVaccineDue && dog.rabiesVaccineDue < today;
                    return (
                    <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700 space-y-1.5 text-xs">
                      {dog.dob && <p><span className="text-neutral-400">DOB:</span> {formatDate(dog.dob)}</p>}
                      {/* Rabies Vaccine Info */}
                      {dog.rabiesVaccineDate ? (
                        <div className={cn('p-2 rounded-lg', rabiesOverdue ? 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800' : 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800')}>
                          <div className="flex items-center gap-1 font-semibold mb-1">
                            <Syringe className="w-3 h-3" />
                            Rabies Vaccine
                            {rabiesOverdue && <span className="text-red-600 dark:text-red-400 ml-1">⚠️ OVERDUE</span>}
                          </div>
                          <p>Last: {formatDate(dog.rabiesVaccineDate)}</p>
                          {dog.rabiesVaccineDue && <p>Due: <span className={rabiesOverdue ? 'text-red-600 dark:text-red-400 font-semibold' : ''}>{formatDate(dog.rabiesVaccineDue)}</span></p>}
                          {dog.rabiesVetName && <p>Vet: {dog.rabiesVetName}</p>}
                          {dog.rabiesVetContact && <p>Contact: {dog.rabiesVetContact}</p>}
                          {dog.rabiesLotNumber && <p>Lot #: {dog.rabiesLotNumber}</p>}
                        </div>
                      ) : (
                        <p className="text-amber-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> No rabies vaccine on file</p>
                      )}
                      {dog.akcCert && (
                        <p className="flex items-center gap-1"><Award className="w-3 h-3 text-amber-500" /> AKC: {dog.akcCert}</p>
                      )}
                      {dog.microchipId && (
                        <p className="flex items-center gap-1"><Shield className="w-3 h-3 text-blue-500" /> Chip: {dog.microchipId}</p>
                      )}
                      {dog.notes && <p className="text-neutral-500">{dog.notes}</p>}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteDog(dog.id, dog.name); }}
                        disabled={isPending}
                        className="text-red-500 hover:underline text-[10px]"
                      >
                        Remove {dog.name}
                      </button>
                    </div>
                    );
                  })()}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {dogs.length === 0 && (
        <Card className="!p-8 text-center">
          <PawPrint className="w-10 h-10 mx-auto text-neutral-300 dark:text-neutral-600 mb-3" />
          <p className="text-neutral-500 dark:text-neutral-400">No dogs added yet. Add your fur babies!</p>
        </Card>
      )}

      {/* Dog filter pills */}
      {dogs.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedDogId('all')}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
              selectedDogId === 'all'
                ? 'bg-[#E07A3A]/10 text-[#E07A3A]'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700',
            )}
          >
            All Dogs
          </button>
          {dogs.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelectedDogId(d.id)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                selectedDogId === d.id
                  ? 'bg-[#E07A3A]/10 text-[#E07A3A]'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700',
              )}
            >
              {d.name}
            </button>
          ))}
        </div>
      )}

      {/* Rabies overdue alerts */}
      {dogs.filter((d) => d.rabiesVaccineDue && d.rabiesVaccineDue < today).length > 0 && (
        <Card className="!p-4 border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
          <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-2 flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" /> Rabies Vaccine Overdue
          </p>
          {dogs.filter((d) => d.rabiesVaccineDue && d.rabiesVaccineDue < today).map((d) => (
            <div key={d.id} className="text-xs text-red-600 dark:text-red-400">
              <span className="font-medium">{d.name}</span> — due {formatDate(d.rabiesVaccineDue!)}
              {d.rabiesVetName && ` (last by ${d.rabiesVetName})`}
            </div>
          ))}
        </Card>
      )}

      {/* Next appointments */}
      {nextAppts.length > 0 && (
        <Card className="!p-4 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
          <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">📅 Upcoming Appointments</p>
          {nextAppts.map((v) => {
            const dog = dogs.find((d) => d.id === v.dogId);
            return (
              <div key={v.id} className="text-xs text-blue-600 dark:text-blue-400">
                <span className="font-medium">{dog?.name}</span> — {formatDate(v.nextAppointment!)}
                {v.location && ` at ${v.location}`}
              </div>
            );
          })}
        </Card>
      )}

      {/* ==================== VET & GROOMER DIRECTORY ==================== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-neutral-500 uppercase tracking-wider">Vet &amp; Groomer Directory</p>
          <button
            onClick={() => { resetContactForm(); setShowContactModal(true); }}
            className="flex items-center gap-1 text-xs text-[#E07A3A] hover:underline font-medium"
          >
            <Plus className="w-3 h-3" /> Add Contact
          </button>
        </div>
        {vetContacts.length === 0 ? (
          <Card className="!p-6 text-center">
            <BookOpen className="w-8 h-8 mx-auto text-neutral-300 dark:text-neutral-600 mb-2" />
            <p className="text-neutral-500 text-sm">No contacts yet. Add vets and groomers.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {vetContacts.map((contact) => {
              const typeCfg = CONTACT_TYPE_CONFIG[contact.type as ContactType];
              const doctors: string[] = contact.doctors ? (() => { try { return JSON.parse(contact.doctors); } catch { return []; } })() : [];
              return (
                <Card key={contact.id} className="!p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 flex-1 min-w-0">
                      {/* Type badge + name row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold', typeCfg.color)}>
                          {typeCfg.icon}{typeCfg.label}
                        </span>
                        <span className="text-sm font-bold leading-tight" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
                          {contact.name}
                        </span>
                      </div>

                      {/* Address */}
                      {contact.address && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-start gap-1">
                          <MapPin className="w-3 h-3 mt-0.5 shrink-0 text-neutral-400" />
                          <span>{contact.address}</span>
                        </p>
                      )}

                      {/* Doctors */}
                      {doctors.length > 0 && (
                        <p className="text-xs text-neutral-600 dark:text-neutral-300">
                          {doctors.join(' • ')}
                        </p>
                      )}

                      {/* Phone */}
                      {contact.phone && (
                        <a
                          href={`tel:${contact.phone}`}
                          className="text-xs text-[#E07A3A] flex items-center gap-1 hover:underline"
                        >
                          <Phone className="w-3 h-3" />{contact.phone}
                        </a>
                      )}

                      {/* Last visited */}
                      {contact.lastVisited && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-neutral-400" />
                          Last visit: {formatDate(contact.lastVisited)}
                        </p>
                      )}

                      {/* Notes */}
                      {contact.notes && (
                        <p className="text-xs text-neutral-400 italic">{contact.notes}</p>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleToggleFavorite(contact.id, !!contact.favorite)}
                        disabled={isPending}
                        className={cn('p-1.5 rounded-lg transition-colors', contact.favorite ? 'text-[#E07A3A]' : 'text-neutral-300 dark:text-neutral-600 hover:text-[#E07A3A]')}
                        title={contact.favorite ? 'Unfavorite' : 'Favorite'}
                      >
                        <Heart className={cn('w-4 h-4', contact.favorite && 'fill-current')} />
                      </button>
                      <button
                        onClick={() => handleDeleteContact(contact.id, contact.name)}
                        disabled={isPending}
                        className="p-1.5 rounded-lg text-neutral-300 dark:text-neutral-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Visit history */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-neutral-500 uppercase tracking-wider">Visit History</p>
        {filteredVisits.length === 0 ? (
          <Card className="!p-6 text-center">
            <Stethoscope className="w-8 h-8 mx-auto text-neutral-300 dark:text-neutral-600 mb-2" />
            <p className="text-neutral-500 text-sm">No vet visits recorded yet.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredVisits.map((v) => {
              const dog = dogs.find((d) => d.id === v.dogId);
              const typeCfg = VISIT_TYPE_CONFIG[v.type as VisitType];
              const procedures: string[] = v.procedures ? (() => { try { return JSON.parse(v.procedures); } catch { return []; } })() : [];
              const meds: string[] = v.medications ? (() => { try { return JSON.parse(v.medications); } catch { return []; } })() : [];
              const outOfPocket = (v.cost || 0) - (v.insuranceCovered || 0);
              return (
                <Card key={v.id} className="!p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
                          {dog?.name || 'Unknown'}
                        </span>
                        <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold', typeCfg.color)}>
                          {typeCfg.icon} {typeCfg.label}
                        </span>
                        <span className="text-xs text-neutral-400 flex items-center gap-0.5">
                          <Calendar className="w-3 h-3" /> {formatDate(v.date)}
                        </span>
                      </div>

                      {(v.vetName || v.location) && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {v.vetName && `Dr. ${v.vetName}`}
                          {v.vetName && v.location && ' — '}
                          {v.location && <><MapPin className="w-3 h-3 inline" /> {v.location}</>}
                        </p>
                      )}

                      {procedures.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {procedures.map((p, i) => (
                            <Badge key={i} variant="secondary" className="text-[10px]">{p}</Badge>
                          ))}
                        </div>
                      )}

                      {v.teethExtracted && v.teethExtracted > 0 && (
                        <p className="text-xs text-amber-600 dark:text-amber-400">🦷 {v.teethExtracted} teeth extracted</p>
                      )}

                      {v.cost !== null && v.cost !== undefined && (
                        <div className="flex items-center gap-1 text-xs">
                          <DollarSign className="w-3 h-3 text-neutral-400" />
                          <span>{formatCurrency(v.cost)}</span>
                          {v.insuranceCovered && v.insuranceCovered > 0 && (
                            <span className="text-neutral-400">(ins: {formatCurrency(v.insuranceCovered)} • OOP: {formatCurrency(outOfPocket > 0 ? outOfPocket : 0)})</span>
                          )}
                        </div>
                      )}

                      {v.lineItems && (() => {
                        try {
                          const items: Array<{ description: string; amount: number }> = JSON.parse(v.lineItems);
                          if (items.length === 0) return null;
                          return (
                            <div className="text-xs space-y-0.5 pl-4 border-l-2 border-neutral-200 dark:border-neutral-700">
                              {items.map((li, i) => (
                                <div key={i} className="flex justify-between gap-2">
                                  <span className="text-neutral-500">{li.description}</span>
                                  <span className="font-medium">{formatCurrency(li.amount)}</span>
                                </div>
                              ))}
                            </div>
                          );
                        } catch { return null; }
                      })()}

                      {meds.length > 0 && (
                        <p className="text-xs text-neutral-500">💊 Meds: {meds.join(', ')}</p>
                      )}

                      {v.recommendations && (
                        <p className="text-xs text-indigo-600 dark:text-indigo-400">💡 {v.recommendations}</p>
                      )}

                      {v.nextAppointment && (
                        <p className="text-xs text-blue-500">📅 Next: {formatDate(v.nextAppointment)}</p>
                      )}

                      {v.notes && (
                        <p className="text-xs text-neutral-400 italic">{v.notes}</p>
                      )}

                      {/* Receipt actions */}
                      <div className="flex items-center gap-3">
                        {v.receipt ? (
                          <>
                            <button
                              onClick={() => setViewReceipt({ data: v.receipt!, visitLabel: `${dog?.name || 'Visit'} — ${formatDate(v.date)} (${typeCfg.label})` })}
                              className="text-xs text-[#E07A3A] hover:underline flex items-center gap-1"
                            >
                              <FileText className="w-3 h-3" /> View Receipt
                            </button>
                            <button
                              onClick={() => handleUploadReceiptToVisit(v.id)}
                              className="text-xs text-neutral-400 hover:text-[#E07A3A] hover:underline flex items-center gap-1"
                            >
                              <Pencil className="w-3 h-3" /> Replace
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleUploadReceiptToVisit(v.id)}
                            className="text-xs text-neutral-400 hover:text-[#E07A3A] hover:underline flex items-center gap-1"
                          >
                            <Upload className="w-3 h-3" /> Add Receipt / Invoice
                          </button>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteVisit(v.id)}
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

      {/* ==================== BLOODWORK SECTION ==================== */}
      {bloodworkData.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-neutral-500 uppercase tracking-wider">Bloodwork & Lab Results</p>
          {(() => {
            const filteredBW = selectedDogId === 'all' ? bloodworkData : bloodworkData.filter((b) => b.dogId === selectedDogId);
            if (filteredBW.length === 0) return (
              <Card className="!p-6 text-center">
                <p className="text-neutral-500 text-sm">No bloodwork for selected dog.</p>
              </Card>
            );
            return (
              <div className="space-y-3">
                {filteredBW.map((bw) => {
                  const dog = dogs.find((d) => d.id === bw.dogId);
                  let results: Record<string, BloodworkResult> = {};
                  try { results = bw.results ? JSON.parse(bw.results) : {}; } catch { /* */ }
                  const flagged = Object.entries(results).filter(([, r]) => r.flag);
                  const normal = Object.entries(results).filter(([, r]) => !r.flag);
                  return (
                    <Card key={bw.id} className="!p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
                              {dog?.name || 'Unknown'}
                            </span>
                            <Badge variant="secondary" className="text-[10px]">🧪 {bw.testName}</Badge>
                            <span className="text-xs text-neutral-400 flex items-center gap-0.5">
                              <Calendar className="w-3 h-3" /> {formatDate(bw.date)}
                            </span>
                          </div>
                          {bw.vetName && <p className="text-xs text-neutral-500">{bw.vetName}{bw.orderId ? ` • Order #${bw.orderId}` : ''}</p>}

                          {/* Flagged results */}
                          {flagged.length > 0 && (
                            <div className="space-y-1">
                              {flagged.map(([marker, r]) => (
                                <div key={marker} className="flex items-center gap-2 text-xs">
                                  <span className={cn(
                                    'px-1.5 py-0.5 rounded text-[10px] font-bold',
                                    r.flag === 'H' ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' :
                                    r.flag === 'L' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' :
                                    'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300'
                                  )}>
                                    {r.flag}
                                  </span>
                                  <span className="font-medium">{marker}:</span>
                                  <span>{r.value !== null ? r.value : '—'}{r.unit ? ` ${r.unit}` : ''}</span>
                                  {r.range && <span className="text-neutral-400">(ref: {r.range})</span>}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Normal results (collapsed) */}
                          {normal.length > 0 && (
                            <details className="text-xs">
                              <summary className="cursor-pointer text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
                                {normal.length} normal result{normal.length !== 1 ? 's' : ''}
                              </summary>
                              <div className="mt-1 space-y-0.5 pl-2 border-l-2 border-green-200 dark:border-green-800">
                                {normal.map(([marker, r]) => (
                                  <div key={marker} className="flex items-center gap-2">
                                    <span className="text-green-600 dark:text-green-400">✓</span>
                                    <span className="font-medium">{marker}:</span>
                                    <span>{r.value !== null ? r.value : '—'}{r.unit ? ` ${r.unit}` : ''}</span>
                                    {r.range && <span className="text-neutral-400">(ref: {r.range})</span>}
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}

                          {bw.notes && <p className="text-xs text-neutral-400 italic">{bw.notes}</p>}
                        </div>
                        <button
                          onClick={() => {
                            let cancelled = false;
                            const timer = setTimeout(() => { if (!cancelled) startTransition(async () => { await deleteBloodwork(bw.id); }); }, 5000);
                            toast('Bloodwork deleted', { duration: 5000, action: { label: 'Undo', onClick: () => { cancelled = true; clearTimeout(timer); } } });
                          }}
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
            );
          })()}
        </div>
      )}

      {/* ==================== ADD DOG MODAL ==================== */}
      <Dialog open={showDogModal} onOpenChange={setShowDogModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>Add Dog</DialogTitle>
            <DialogDescription>Add your fur baby&apos;s details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <label className="text-sm font-medium mb-1 block">Name *</label>
              <Input placeholder="Rocky, Cookie, Blu..." value={dogName} onChange={(e) => setDogName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Breed</label>
              <Input placeholder="Golden Retriever, Poodle mix..." value={dogBreed} onChange={(e) => setDogBreed(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Date of Birth</label>
                <Input type="date" value={dogDob} onChange={(e) => setDogDob(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Weight (lbs)</label>
                <Input type="number" step="0.1" placeholder="45" value={dogWeight} onChange={(e) => setDogWeight(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Photo</label>
              <PhotoUpload photo={dogPhoto} onSelect={setDogPhoto} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Spayed/Neutered?</label>
              <div className="flex gap-3">
                <button type="button" onClick={() => setDogSpayed(false)}
                  className={cn('flex-1 py-2 rounded-lg text-sm font-medium border transition-colors',
                    !dogSpayed ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                      : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400')}>
                  No
                </button>
                <button type="button" onClick={() => setDogSpayed(true)}
                  className={cn('flex-1 py-2 rounded-lg text-sm font-medium border transition-colors',
                    dogSpayed ? 'border-green-500 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300'
                      : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400')}>
                  Yes
                </button>
              </div>
            </div>
            {dogSpayed && (
              <div>
                <label className="text-sm font-medium mb-1 block">Spay/Neuter Date</label>
                <Input type="date" value={dogSpayDate} onChange={(e) => setDogSpayDate(e.target.value)} />
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-1 block">AKC Registration</label>
              <Input placeholder="Registration number or cert info..." value={dogAkc} onChange={(e) => setDogAkc(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Microchip ID</label>
              <Input placeholder="Microchip number..." value={dogMicrochip} onChange={(e) => setDogMicrochip(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <Textarea placeholder="Allergies, temperament, special needs..." value={dogNotes} onChange={(e) => setDogNotes(e.target.value)} rows={3} />
            </div>
            <Button onClick={handleSaveDog} disabled={isPending} className="w-full">
              {isPending ? 'Saving...' : 'Save Dog'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ==================== ADD VISIT MODAL ==================== */}
      <Dialog open={showVisitModal} onOpenChange={setShowVisitModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>Log Vet Visit</DialogTitle>
            <DialogDescription>Record vet visit details, costs, and recommendations</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {/* Dog selector */}
            <div>
              <label className="text-sm font-medium mb-1 block">Dog *</label>
              <div className="flex gap-2 flex-wrap">
                {dogs.map((d) => (
                  <button key={d.id} type="button" onClick={() => setVisitDogId(d.id)}
                    className={cn('px-3 py-2 rounded-lg text-sm font-medium border transition-colors',
                      visitDogId === d.id
                        ? 'border-[#E07A3A] bg-[#E07A3A]/10 text-[#E07A3A]'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800')}>
                    🐕 {d.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Date</label>
              <Input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Visit Type</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(VISIT_TYPE_CONFIG) as [VisitType, typeof VISIT_TYPE_CONFIG[VisitType]][]).map(([key, cfg]) => (
                  <button key={key} type="button" onClick={() => setVisitType(key)}
                    className={cn('flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors',
                      visitType === key
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800')}>
                    <span>{cfg.icon}</span><span>{cfg.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Vet Name</label>
                <Input placeholder="Dr. Smith..." value={visitVet} onChange={(e) => setVisitVet(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Location</label>
                <Input placeholder="Happy Paws Clinic..." value={visitLocation} onChange={(e) => setVisitLocation(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Procedures</label>
              <Input placeholder="Blood work, X-ray, dental cleaning (comma-separated)" value={visitProcedures} onChange={(e) => setVisitProcedures(e.target.value)} />
            </div>
            {visitType === 'dental' && (
              <div>
                <label className="text-sm font-medium mb-1 block">Teeth Extracted</label>
                <Input type="number" min="0" placeholder="0" value={visitTeeth} onChange={(e) => setVisitTeeth(e.target.value)} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Cost ($)</label>
                <Input type="number" step="0.01" min="0" placeholder="350.00" value={visitCost} onChange={(e) => setVisitCost(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Insurance Covered ($)</label>
                <Input type="number" step="0.01" min="0" placeholder="200.00" value={visitInsurance} onChange={(e) => setVisitInsurance(e.target.value)} />
              </div>
            </div>

            {/* Itemized Charges */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">Itemized Charges</label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setVisitLineItems([...visitLineItems, { description: '', amount: 0 }])}
                >
                  <Plus className="w-3 h-3 mr-1" /> Add Line
                </Button>
              </div>
              {visitLineItems.length > 0 && (
                <div className="space-y-2">
                  {visitLineItems.map((item, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Input
                        placeholder="Description (e.g. Blood work)"
                        value={item.description}
                        onChange={(e) => {
                          const next = [...visitLineItems];
                          next[i] = { ...next[i], description: e.target.value };
                          setVisitLineItems(next);
                        }}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={item.amount || ''}
                        onChange={(e) => {
                          const next = [...visitLineItems];
                          next[i] = { ...next[i], amount: parseFloat(e.target.value) || 0 };
                          setVisitLineItems(next);
                        }}
                        className="w-24"
                      />
                      <button
                        type="button"
                        onClick={() => setVisitLineItems(visitLineItems.filter((_, j) => j !== i))}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <div className="flex justify-between text-xs pt-1 border-t border-neutral-200 dark:border-neutral-700">
                    <span className="text-neutral-500">Line items total</span>
                    <span className="font-semibold">${visitLineItems.reduce((sum, li) => sum + li.amount, 0).toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Receipt Upload */}
            <div>
              <label className="text-sm font-medium mb-1 block">Receipt</label>
              <input
                ref={receiptInputRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setVisitReceiptType(file.type);
                  const base64 = file.type.startsWith('image/')
                    ? await compressImage(file)
                    : await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result as string);
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                      });
                  setVisitReceipt(base64);
                }}
              />
              {visitReceipt ? (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">Receipt attached</Badge>
                  <button type="button" onClick={() => { setVisitReceipt(''); if (receiptInputRef.current) receiptInputRef.current.value = ''; }} className="text-xs text-red-500 hover:underline">Remove</button>
                </div>
              ) : (
                <Button type="button" variant="outline" size="sm" onClick={() => receiptInputRef.current?.click()} className="gap-2">
                  <Upload className="w-3.5 h-3.5" /> Attach Receipt
                </Button>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Medications Prescribed</label>
              <Input placeholder="Antibiotics, pain meds (comma-separated)" value={visitMeds} onChange={(e) => setVisitMeds(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Vet Recommendations</label>
              <Textarea placeholder="What the vet recommended, follow-up care..." value={visitRecs} onChange={(e) => setVisitRecs(e.target.value)} rows={2} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Next Appointment</label>
              <Input type="date" value={visitNextAppt} onChange={(e) => setVisitNextAppt(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <Textarea placeholder="Any other details..." value={visitNotes} onChange={(e) => setVisitNotes(e.target.value)} rows={2} />
            </div>
            <Button onClick={handleSaveVisit} disabled={isPending} className="w-full">
              {isPending ? 'Saving...' : 'Save Visit'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ==================== ADD CONTACT MODAL ==================== */}
      <Dialog open={showContactModal} onOpenChange={setShowContactModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>Add Contact</DialogTitle>
            <DialogDescription>Add a vet, groomer, or specialist to your directory</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <label className="text-sm font-medium mb-1 block">Name *</label>
              <Input placeholder="Happy Paws Clinic..." value={contactName} onChange={(e) => setContactName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Type</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(CONTACT_TYPE_CONFIG) as [ContactType, typeof CONTACT_TYPE_CONFIG[ContactType]][]).map(([key, cfg]) => (
                  <button key={key} type="button" onClick={() => setContactType(key)}
                    className={cn('flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors',
                      contactType === key
                        ? 'border-[#E07A3A] bg-[#E07A3A]/10 text-[#E07A3A]'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800')}>
                    {cfg.icon}<span>{cfg.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Address</label>
              <Input placeholder="123 Main St, City, State ZIP" value={contactAddress} onChange={(e) => setContactAddress(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Phone</label>
              <Input placeholder="(555) 123-4567" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Website</label>
              <Input placeholder="https://..." value={contactWebsite} onChange={(e) => setContactWebsite(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Doctors (comma-separated)</label>
              <Input placeholder="Dr. Smith DVM, Dr. Jones DVM" value={contactDoctors} onChange={(e) => setContactDoctors(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Last Visited</label>
              <Input type="date" value={contactLastVisited} onChange={(e) => setContactLastVisited(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <Textarea placeholder="Hours, specialties, parking info..." value={contactNotes} onChange={(e) => setContactNotes(e.target.value)} rows={2} />
            </div>
            <Button onClick={handleSaveContact} disabled={isPending} className="w-full">
              {isPending ? 'Saving...' : 'Save Contact'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo viewer */}
      <Dialog open={!!viewPhoto} onOpenChange={() => setViewPhoto(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>Photo</DialogTitle>
            <DialogDescription>Full size view</DialogDescription>
          </DialogHeader>
          {viewPhoto && <img src={viewPhoto} alt="Full size" className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>

      {/* Hidden receipt upload input for existing visits */}
      <input
        ref={visitReceiptInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleReceiptFileSelected}
      />

      {/* Receipt / Invoice viewer */}
      <Dialog open={!!viewReceipt} onOpenChange={() => setViewReceipt(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>Receipt / Invoice</DialogTitle>
            <DialogDescription>{viewReceipt?.visitLabel}</DialogDescription>
          </DialogHeader>
          {viewReceipt && (
            <div className="space-y-3">
              {viewReceipt.data.startsWith('data:application/pdf') ? (
                <iframe
                  src={viewReceipt.data}
                  className="w-full h-[70vh] rounded-lg border border-neutral-200 dark:border-neutral-700"
                  title="Receipt PDF"
                />
              ) : (
                <img src={viewReceipt.data} alt="Receipt" className="w-full rounded-lg" />
              )}
              <div className="flex justify-end">
                <a
                  href={viewReceipt.data}
                  download={`receipt-${viewReceipt.visitLabel.replace(/[^a-zA-Z0-9]/g, '_')}`}
                  className="text-xs text-[#E07A3A] hover:underline flex items-center gap-1"
                >
                  <Upload className="w-3 h-3 rotate-180" /> Download
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
