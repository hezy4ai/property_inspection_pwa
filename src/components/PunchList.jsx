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

export default function PunchList({ deficiencies = [], onChange, photoMap = {}, onAddPhoto, onDeletePhoto }) {
  const [selectedArea, setSelectedArea] = useState('Living Room');
  const [customArea, setCustomArea] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('MODERATE');
  const [draftPhotos, setDraftPhotos] = useState([]);
  
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognizerRef = useRef(null);
  const initialTextRef = useRef('');

  useEffect(() => {
    setSpeechSupported(isSpeechRecognitionSupported());
  }, []);

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
          onResult: ({ full }) => {
            const base = initialTextRef.current;
            if (base && full) {
              setDescription(`${base} ${full}`);
            } else if (full) {
              setDescription(full);
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
      <div className="bg-slate-800/90 backdrop-blur border border-slate-700/80 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-sky-400" />
            Log Deficiency #{deficiencies.length + 1}
          </h2>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-300">
            {deficiencies.length} items logged
          </span>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
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
                    ? 'bg-sky-600 text-white shadow-sm shadow-sky-500/20'
                    : 'bg-slate-900/80 text-slate-300 hover:bg-slate-700 border border-slate-700/60'
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
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-900/80 text-slate-300 hover:bg-slate-700 border border-slate-700/60'
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
              className="mt-2 w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-sky-500"
            />
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <span className="text-xs text-slate-400">Severity:</span>
          {['MINOR', 'MODERATE', 'CRITICAL'].map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setSeverity(lvl)}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide transition-all ${
                severity === lvl
                  ? lvl === 'CRITICAL'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : lvl === 'MODERATE'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  : 'bg-slate-900/60 text-slate-400 border border-slate-800'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-medium text-slate-300">
              Defect Observation Description
            </label>
            {speechSupported && (
              <button
                type="button"
                onClick={toggleVoiceDictation}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                  isRecording
                    ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                }`}
              >
                {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-sky-400" />}
                <span>{isRecording ? 'Listening...' : 'Voice Dictate'}</span>
              </button>
            )}
          </div>

          <textarea
            rows={3}
            placeholder="Dictate with mic or type observation (e.g., Hairline paint cracks along south ceiling cornice)..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-slate-900/90 border border-slate-700 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl p-3 text-sm text-white placeholder-slate-500 outline-none resize-none transition-all"
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
          className="w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none text-white font-semibold py-3 px-4 rounded-xl shadow-md shadow-sky-600/20 text-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Defect to Punch-List</span>
        </button>
      </div>

      {deficiencies.length > 0 ? (
        <div className="space-y-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">
            Logged Punch-List Items ({deficiencies.length})
          </h3>

          {deficiencies.map((item, index) => (
            <div
              key={item.id || index}
              className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 shadow-sm space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-sky-500/20 text-sky-400 font-bold text-xs flex items-center justify-center border border-sky-500/30">
                    #{item.item_number}
                  </span>
                  <span className="text-xs font-semibold text-white px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700">
                    {item.area}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      item.severity === 'CRITICAL'
                        ? 'bg-rose-500/20 text-rose-300'
                        : item.severity === 'MODERATE'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-sky-500/20 text-sky-300'
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
                    className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20"
                    title="Move Up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveItem(index, 1)}
                    disabled={index === deficiencies.length - 1}
                    className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20"
                    title="Move Down"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(index)}
                    className="p-1 rounded text-rose-400 hover:text-rose-300 ml-1"
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
                className="w-full bg-slate-900/60 border border-slate-700/60 focus:border-sky-500 rounded-lg p-2 text-xs text-slate-200 outline-none resize-none transition-all"
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
                        className="w-12 h-12 rounded-lg object-cover border border-slate-700"
                      />
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="border border-dashed border-slate-700 rounded-2xl p-6 text-center space-y-2">
          <AlertTriangle className="w-6 h-6 text-slate-500 mx-auto" />
          <p className="text-xs text-slate-400">No punch-list defects logged yet.</p>
          <p className="text-[11px] text-slate-500">
            Select a room tag, dictate or type your observation, and attach high-res photos above.
          </p>
        </div>
      )}
    </div>
  );
}
