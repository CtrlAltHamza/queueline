"use client";

import { useState } from "react";
import { Service } from "@/lib/mock-data";
import { X, Plus, Edit } from "lucide-react";

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (service: Partial<Service>) => void;
  initialService?: Service | null;
}

export function ServiceModal({ isOpen, onClose, onSave, initialService }: ServiceModalProps) {
  const [name, setName] = useState(initialService?.name || "");
  const [description, setDescription] = useState(initialService?.description || "");
  const [durationMin, setDurationMin] = useState(initialService?.duration_min || 30);
  const [priceDollars, setPriceDollars] = useState(
    initialService ? (initialService.price_cents / 100).toFixed(0) : "50"
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: initialService?.id,
      name,
      description,
      duration_min: Number(durationMin),
      price_cents: Math.round(Number(priceDollars) * 100),
      is_active: true,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-lg">
            {initialService ? "Edit Service" : "Add New Service"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Service Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Deluxe Facial"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the service"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Duration (minutes)
              </label>
              <input
                type="number"
                min={5}
                max={480}
                required
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Price (USD)
              </label>
              <input
                type="number"
                min={0}
                required
                value={priceDollars}
                onChange={(e) => setPriceDollars(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 transition"
            >
              Save Service
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
