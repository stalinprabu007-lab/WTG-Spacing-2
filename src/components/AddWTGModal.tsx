import React, { useState } from 'react';
import { WTGModel } from '../types/wtg';
import { X, PlusCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (model: WTGModel) => void;
}

export const AddWTGModal: React.FC<Props> = ({ isOpen, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [rd, setRd] = useState('160');
  const [hh, setHh] = useState('140');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a WTG make/model name.');
      return;
    }
    const numRd = parseFloat(rd);
    const numHh = parseFloat(hh);
    if (isNaN(numRd) || numRd <= 0) {
      setError('Please enter a valid positive rotor diameter.');
      return;
    }
    if (isNaN(numHh) || numHh <= 0) {
      setError('Please enter a valid positive hub height.');
      return;
    }

    const newModel: WTGModel = {
      id: `custom_${Date.now()}`,
      name: name.trim(),
      rd: numRd,
      hh: numHh,
      isCustom: true,
    };

    onAdd(newModel);
    setName('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-[#10273d] border border-[#1f517a] w-full max-w-md rounded shadow-2xl overflow-hidden">
        <div className="bg-[#143d5c] px-4 py-3 flex items-center justify-between border-b border-[#1f517a]">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <PlusCircle className="w-4 h-4 text-cyan-400" />
            Add Custom WTG Make / Model
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-2 rounded bg-red-950/70 border border-red-700 text-red-200 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              WTG Make / Model Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Vestas_V150-4.2MW"
              className="w-full bg-[#0a1826] border border-[#1b3d5c] rounded px-3 py-1.5 text-white text-xs focus:outline-none focus:border-cyan-400"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Rotor Diameter (m)
              </label>
              <input
                type="number"
                step="0.1"
                value={rd}
                onChange={(e) => setRd(e.target.value)}
                placeholder="160"
                className="w-full bg-[#0a1826] border border-[#1b3d5c] rounded px-3 py-1.5 text-white text-xs focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Hub Height (m)
              </label>
              <input
                type="number"
                step="0.1"
                value={hh}
                onChange={(e) => setHh(e.target.value)}
                placeholder="140"
                className="w-full bg-[#0a1826] border border-[#1b3d5c] rounded px-3 py-1.5 text-white text-xs focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1b3d5c]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-[#0e273d] border border-[#1b3d5c] rounded cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold bg-[#0288d1] hover:bg-[#039be5] text-white rounded transition-colors shadow-sm cursor-pointer"
            >
              Add WTG Model
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
