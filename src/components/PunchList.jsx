import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Mic, 
  MicOff, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  AlertTriangle, 
  Layers
} from 'lucide-react';
import { createSpeechRecognizer, isSpeechRecognitionSupported } from '../services/speech.js';
import CameraCapture from './CameraCapture.jsx';

const DEFAULT_AREAS = [
  'Living Room',
  'Master Bedroom',
  'Bedroom 2',
  'Kitchen',
  'Master Bathroom',
  'Guest Bathroom',
  'Balcony / Terrace',
  'Entrance / Hallway'
];

export default function PunchList({ deficiencies = [], onChange, activeDefect, onActiveDefectChange, photoMap = {}, onAddPhoto, onDeletePhoto }) {
  const [selectedArea, setSelectedArea] = useState('Living Room');
  const [customArea, setCustomArea] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('MODERATE');
  const [draftPhotos, setDraftPhotos] = useState([]);
  
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognizerRef = useRef(null);
  const initialTextRef = useRef('');
  const hasLoadedDraft = useRef(false);

  useEffect(() => {
    setSpeechSupported(isSpeechRecognitionSupported());
  }, []);

  // Hydrate from db active defect exactly once
  useEffect(() => {
    if (activeDefect && !hasLoadedDraft.current) {
      setSelectedArea(activeDefect.selectedArea || 'Living Room');
      setCustomArea(activeDefect.customArea || '');
      setDescription(activeDefect.description || '');
      setSeverity(activeDefect.severity || 'MODERATE');
      setDraftPhotos(activeDefect.draftPhotos || []);
      hasLoadedDraft.current = true;
    }
  }, [activeDefect]);

  // Sync back to App.jsx for auto-save
  useEffect(() => {
    if (onActiveDefectChange) {
      onActiveDefectChange({
        selectedArea,
        customArea,
        description,
        severity,
        draftPhotos
      });
    }
  }, [selectedArea, customArea, description, severity, draftPhotos, onActiveDefectChange]);

  const toggleVoiceDictation = () => {
    if (!speechSupported) {
      alert('Voice dictation is not supported on this browser. Please type defect description manually.');
      return;
    }

    if (isRecording) {
      if (recognizerRef.current) {
        recognizerRef.current.stop();
      }
      setIsRecording(false);
    } else {
      initialTextRef.current = description.trim();
      try {
        const recognizer = createSpeechRecognizer({
          onResult: (cleanTranscript) => {
            if (cleanTranscript) {
              setDescription((prev) => (prev ? `${prev.trim()} ${cleanTranscript}` : cleanTranscript));
            }
          },
          onError: (err) => {
            console.warn('Voice recognition error:', err);
            setIsRecording(false);
          },
          onEnd: () => {
            setIsRecording(false);
          }
        });

        if (recognizer) {
          recognizerRef.current = recognizer;
          recognizer.start();
          setIsRecording(true);
        }
      } catch (err) {
        console.error('Failed to start speech recognizer:', err);
        setIsRecording(false);
      }
    }
  };

  const handleAddDeficiency = () => {
    if (!description.trim()) return;

    const areaToUse = selectedArea === 'Custom' ? (customArea.trim() || 'General') : selectedArea;
    const newDeficiencyId = `def_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    const photoIds = [];
    draftPhotos.forEach((photo) => {
      onAddPhoto({ ...photo, deficiency_id: newDeficiencyId });
      photoIds.push(photo.id);
    });

    const newItem = {
      id: newDeficiencyId,
      item_number: deficiencies.length + 1,
      area: areaToUse,
      description: description.trim(),
      severity,
      photo_ids: photoIds,
      created_at: new Date().toISOString()
    };

    const updated = [...deficiencies, newItem].map((item, idx) => ({
      ...item,
      item_number: idx + 1
    }));

    onChange(updated);
    setDescription('');
    setDraftPhotos([]);
    if (isRecording && recognizerRef.current) {
      recognizerRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleDeleteItem = (index) => {
    const updated = deficiencies
      .filter((_, idx) => idx !== index)
      .map((item, idx) => ({ ...item, item_number: idx + 1 }));
    onChange(updated);
  };

  const handleMoveItem = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= deficiencies.length) return;

    const updated = [...deficiencies];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    const reindexed = updated.map((item, idx) => ({ ...item, item_number: idx + 1 }));
    onChange(reindexed);
  };

  const handleDescriptionChange = (index, newDesc) => {
    const updated = [...deficiencies];
    updated[index] = { ...updated[index], description: newDesc };
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="bg-app-card rounded-2xl border border-app-border p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-app-text-secondary flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-app-brand-primary" />
            Log Deficiency #{deficiencies.length + 1}
          </h2>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white text-app-text-secondary border border-app-border">
            {deficiencies.length} items logged
          </span>
        </div>

        <div>
          <label className="block text-xs font-medium text-app-text-secondary mb-1.5">
            Area / Room Tag
          </label>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
            {DEFAULT_AREAS.map((area) => (
              <button
                key={area}
                type="button"
                onClick={() => setSelectedArea(area)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  selectedArea === area
                    ? 'bg-app-brand-primary text-white shadow-sm shadow-app-brand-primary/20'
                    : 'bg-white text-app-text-secondary hover:bg-slate-50 border border-app-border'
                }`}
              >
                {area}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSelectedArea('Custom')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedArea === 'Custom'
                  ? 'bg-app-brand-primary text-white shadow-sm shadow-app-brand-primary/20'
                  : 'bg-white text-app-text-secondary hover:bg-slate-50 border border-app-border'
              }`}
            >
              + Custom
            </button>
          </div>

          {selectedArea === 'Custom' && (
            <input
              type="text"
              placeholder="Enter custom room name (e.g. Utility Room)"
              value={customArea}
              onChange={(e) => setCustomArea(e.target.value)}
              className="mt-2 w-full bg-white border border-app-border rounded-xl px-3 py-2 text-xs text-app-text-primary placeholder:text-app-text-secondary/60 outline-none focus:border-app-brand-primary focus:ring-1 focus:ring-app-brand-primary"
            />
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <span className="text-xs text-app-text-secondary">Severity:</span>
          {['MINOR', 'MODERATE', 'CRITICAL'].map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setSeverity(lvl)}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide border transition-all ${
                severity === lvl
                  ? lvl === 'CRITICAL'
                    ? 'bg-app-status-critical border-app-status-critical text-white'
                    : lvl === 'MODERATE'
                    ? 'bg-app-status-moderate border-app-status-moderate text-white'
                    : 'bg-app-status-minor border-app-status-minor text-white'
                  : lvl === 'CRITICAL'
                  ? 'bg-white border-app-status-critical text-app-status-critical'
                  : lvl === 'MODERATE'
                  ? 'bg-white border-app-status-moderate text-app-status-moderate'
                  : 'bg-white border-app-status-minor text-app-status-minor'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-medium text-app-text-secondary">
              Defect Observation Description
            </label>
            {speechSupported && (
              <button
                type="button"
                onClick={toggleVoiceDictation}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                  isRecording
                    ? 'bg-app-status-critical text-white animate-pulse shadow-md shadow-app-status-critical/30'
                    : 'bg-white border border-app-border hover:bg-slate-50 text-app-text-secondary'
                }`}
              >
                {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-app-brand-primary" />}
                <span className={!isRecording ? 'text-app-brand-primary' : ''}>{isRecording ? 'Listening...' : 'Voice Dictate'}</span>
              </button>
            )}
          </div>

          <textarea
            rows={3}
            placeholder="Dictate with mic or type observation (e.g., Hairline paint cracks along south ceiling cornice)..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-white border border-app-border focus:border-app-brand-primary focus:ring-1 focus:ring-app-brand-primary rounded-xl p-3 text-sm text-app-text-primary placeholder:text-app-text-secondary/60 outline-none resize-none transition-all"
          />
        </div>

        <CameraCapture
          photos={draftPhotos}
          onAddPhoto={(photo) => setDraftPhotos((prev) => [...prev, photo])}
          onDeletePhoto={(photoId) => setDraftPhotos((prev) => prev.filter((p) => p.id !== photoId))}
        />

        <button
          type="button"
          onClick={handleAddDeficiency}
          disabled={!description.trim()}
          className="w-full flex items-center justify-center gap-2 bg-app-brand-primary hover:bg-app-brand-primary/90 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none text-white font-semibold py-3 px-4 rounded-xl shadow-md shadow-app-brand-primary/20 text-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Defect to Punch-List</span>
        </button>
      </div>

      {deficiencies.length > 0 ? (
        <div className="space-y-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-app-text-secondary px-1">
            Logged Punch-List Items ({deficiencies.length})
          </h3>

          {deficiencies.map((item, index) => (
            <div
              key={item.id || index}
              className="bg-white border border-app-border rounded-xl p-3 shadow-sm space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-app-status-minor/10 text-app-text-primary font-bold text-xs flex items-center justify-center border border-app-status-minor/20">
                    #{item.item_number}
                  </span>
                  <span className="text-xs font-semibold text-app-text-primary px-2 py-0.5 rounded bg-white border border-app-border">
                    {item.area}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      item.severity === 'CRITICAL'
                        ? 'bg-app-status-critical/10 text-app-status-critical border border-app-status-critical/20'
                        : item.severity === 'MODERATE'
                        ? 'bg-app-status-moderate/10 text-app-status-moderate border border-app-status-moderate/20'
                        : 'bg-app-status-minor/10 text-app-status-minor border border-app-status-minor/20'
                    }`}
                  >
                    {item.severity}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleMoveItem(index, -1)}
                    disabled={index === 0}
                    className="p-1 rounded text-app-text-secondary hover:text-app-brand-primary disabled:opacity-20"
                    title="Move Up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveItem(index, 1)}
                    disabled={index === deficiencies.length - 1}
                    className="p-1 rounded text-app-text-secondary hover:text-app-brand-primary disabled:opacity-20"
                    title="Move Down"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(index)}
                    className="p-1 rounded text-app-status-critical/70 hover:text-app-status-critical ml-1"
                    title="Delete Item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <textarea
                rows={2}
                value={item.description}
                onChange={(e) => handleDescriptionChange(index, e.target.value)}
                className="w-full bg-white border border-app-border focus:border-app-brand-primary rounded-lg p-2 text-xs text-app-text-primary outline-none resize-none transition-all"
              />

              {item.photo_ids && item.photo_ids.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto pt-1">
                  {item.photo_ids.map((photoId) => {
                    const photo = photoMap[photoId];
                    if (!photo) return null;
                    return (
                      <img
                        key={photoId}
                        src={photo.previewUrl}
                        alt="Defect"
                        className="w-12 h-12 rounded-lg object-cover border border-app-border"
                      />
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white/50 border border-dashed border-app-border rounded-2xl p-6 text-center space-y-2">
          <AlertTriangle className="w-6 h-6 text-app-text-secondary/60 mx-auto" />
          <p className="text-xs text-app-text-secondary">No punch-list defects logged yet.</p>
          <p className="text-[11px] text-app-text-secondary/80">
            Select a room tag, dictate or type your observation, and attach high-res photos above.
          </p>
        </div>
      )}
    </div>
  );
}
