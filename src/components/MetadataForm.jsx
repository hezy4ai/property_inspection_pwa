import React from 'react';
import { Building2, Hash, UserCheck, Calendar } from 'lucide-react';
import { getWatDateString } from '../utils/date.js';

export default function MetadataForm({ metadata, onChange }) {
  const handleChange = (field, value) => {
    onChange({ ...metadata, [field]: value });
  };

  return (
    <div className="bg-app-card rounded-2xl border border-app-border p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-4 border-b border-app-border pb-3">
        <Building2 className="w-4 h-4 text-app-brand-primary" />
        <h2 className="text-xs font-bold tracking-wide text-app-text-primary uppercase">Property & Inspector Details</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-semibold text-app-text-secondary mb-1.5 ml-1">
            Estate / Project Name <span className="text-app-status-critical">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              required
              placeholder="e.g. Perla Residences"
              value={metadata.estate_name || ''}
              onChange={(e) => handleChange('estate_name', e.target.value)}
              className="w-full bg-white border border-app-border rounded-xl py-2.5 px-3 pl-8 text-sm text-app-text-primary placeholder:text-app-text-secondary/60 focus:outline-none focus:border-app-brand-primary focus:ring-1 focus:ring-app-brand-primary transition-all"
            />
            <Building2 className="absolute left-2.5 top-3 w-4 h-4 text-app-text-secondary/60" />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-app-text-secondary mb-1.5 ml-1">
            Unit / Door Number <span className="text-app-status-critical">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-app-text-secondary/60">
              <Hash className="w-4 h-4" />
            </div>
            <input
              type="text"
              required
              placeholder="e.g. Block B - Apt 402"
              value={metadata.unit_number || ''}
              onChange={(e) => handleChange('unit_number', e.target.value)}
              className="w-full bg-white border border-app-border focus:border-app-brand-primary focus:ring-1 focus:ring-app-brand-primary rounded-xl pl-9 pr-3 py-2.5 text-sm text-app-text-primary placeholder:text-app-text-secondary/60 outline-none transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-app-text-secondary mb-1.5 ml-1">
            Inspector Name <span className="text-app-status-critical">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-app-text-secondary/60">
              <UserCheck className="w-4 h-4" />
            </div>
            <input
              type="text"
              required
              placeholder="e.g. Alex Mercer"
              value={metadata.inspector_name || ''}
              onChange={(e) => handleChange('inspector_name', e.target.value)}
              className="w-full bg-white border border-app-border focus:border-app-brand-primary focus:ring-1 focus:ring-app-brand-primary rounded-xl pl-9 pr-3 py-2.5 text-sm text-app-text-primary placeholder:text-app-text-secondary/60 outline-none transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-app-text-secondary mb-1.5 ml-1">
            Inspection Date
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-app-text-secondary/60">
              <Calendar className="w-4 h-4" />
            </div>
            <input
              type="date"
              value={metadata.inspection_date || getWatDateString()}
              onChange={(e) => handleChange('inspection_date', e.target.value)}
              className="w-full bg-white border border-app-border focus:border-app-brand-primary focus:ring-1 focus:ring-app-brand-primary rounded-xl pl-9 pr-3 py-2.5 text-sm text-app-text-primary outline-none transition-all [color-scheme:light]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
