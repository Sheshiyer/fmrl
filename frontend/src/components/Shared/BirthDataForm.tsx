import { useState, useCallback } from 'react';
import { MapPin, Clock, Calendar, User, Save } from 'lucide-react';
import type { BirthData } from '../../types/selemene';

interface BirthDataFormProps {
  initialData?: BirthData | null;
  onSubmit: (data: BirthData) => void;
  compact?: boolean;
}

export function BirthDataForm({ initialData, onSubmit, compact = false }: BirthDataFormProps) {
  const [date, setDate] = useState(initialData?.date ?? '');
  const [time, setTime] = useState(initialData?.time ?? '');
  const [latitude, setLatitude] = useState(initialData?.latitude?.toString() ?? '');
  const [longitude, setLongitude] = useState(initialData?.longitude?.toString() ?? '');
  const [timezone, setTimezone] = useState(initialData?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [name, setName] = useState(initialData?.name ?? '');

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !latitude || !longitude) return;
    onSubmit({
      date,
      time: time || undefined,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      timezone,
      name: name || undefined,
    });
  }, [date, time, latitude, longitude, timezone, name, onSubmit]);

  const inputClass = 'w-full bg-pip-dark border border-pip-border rounded-lg px-3 py-2 text-sm text-pip-text-primary placeholder:text-pip-text-muted focus:border-pip-gold focus:outline-none transition-colors';
  const labelClass = 'text-[10px] uppercase tracking-wider text-pip-text-muted font-medium mb-1';

  return (
    <form onSubmit={handleSubmit} className={`${compact ? 'space-y-3' : 'space-y-4'}`}>
      <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'} gap-3`}>
        {/* Name (optional) */}
        <div className={compact ? 'col-span-2' : 'sm:col-span-2'}>
          <label className={labelClass}>
            <User className="w-3 h-3 inline mr-1" />Name (optional)
          </label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Full name" className={inputClass} />
        </div>

        {/* Date */}
        <div>
          <label className={labelClass}>
            <Calendar className="w-3 h-3 inline mr-1" />Birth Date *
          </label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} required className={inputClass} />
        </div>

        {/* Time */}
        <div>
          <label className={labelClass}>
            <Clock className="w-3 h-3 inline mr-1" />Birth Time
          </label>
          <input type="time" value={time} onChange={e => setTime(e.target.value)} className={inputClass} />
        </div>

        {/* Latitude */}
        <div>
          <label className={labelClass}>
            <MapPin className="w-3 h-3 inline mr-1" />Latitude *
          </label>
          <input type="number" step="any" value={latitude} onChange={e => setLatitude(e.target.value)} placeholder="e.g. 12.9716" required className={inputClass} />
        </div>

        {/* Longitude */}
        <div>
          <label className={labelClass}>
            <MapPin className="w-3 h-3 inline mr-1" />Longitude *
          </label>
          <input type="number" step="any" value={longitude} onChange={e => setLongitude(e.target.value)} placeholder="e.g. 77.5946" required className={inputClass} />
        </div>

        {/* Timezone */}
        <div className={compact ? 'col-span-2' : 'sm:col-span-2'}>
          <label className={labelClass}>Timezone</label>
          <input type="text" value={timezone} onChange={e => setTimezone(e.target.value)} placeholder="Asia/Kolkata" className={inputClass} />
        </div>
      </div>

      <button type="submit" className="mystic-btn w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-pip-gold/20 border border-pip-gold/40 text-pip-gold hover:bg-pip-gold/30 transition-colors text-sm font-medium">
        <Save className="w-4 h-4" />
        Save Birth Data
      </button>
    </form>
  );
}
