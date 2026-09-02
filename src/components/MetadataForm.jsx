import React from 'react';
import { Building2, Hash, UserCheck, Calendar } from 'lucide-react';

export default function MetadataForm({ metadata, onChange }) {
  const handleChange = (field, value) => {
    onChange({ ...metadata, [field]: value });
  };

  return (
    <div className="bg-slate-800/80 backdrop-blur border border-slate-700/80 rounded-2xl p-4 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
        <Building2 className="w-4 h-4 text-sky-400" />
        Property & Inspector Details
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Estate / Project Name <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              required
              placeholder="e.g. Parkview Residences"
              value={metadata.estate_name || ''}
              onChange={(e) => handleChange('estate_name', e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Unit / Door Number <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Hash className="w-4 h-4" />
            </div>
            <input
              type="text"
              required
              placeholder="e.g. Block B - Apt 402"
              value={metadata.unit_number || ''}
              onChange={(e) => handleChange('unit_number', e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Inspector Name <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <UserCheck className="w-4 h-4" />
            </div>
            <input
              type="text"
              required
              placeholder="e.g. Alex Mercer"
              value={metadata.inspector_name || ''}
              onChange={(e) => handleChange('inspector_name', e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Inspection Date
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Calendar className="w-4 h-4" />
            </div>
            <input
              type="date"
              value={metadata.inspection_date || new Date().toISOString().split('T')[0]}
              onChange={(e) => handleChange('inspection_date', e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white outline-none transition-all"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
