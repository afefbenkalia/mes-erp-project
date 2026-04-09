import React from "react";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";

const EditMachineModal = ({ open, form, setForm, onSave, onClose }) => {
  if (!open) return null;

  const inputClass =
    "mb-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-xl rounded-xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-900/10">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">Modifier la machine</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100"
            aria-label="Fermer"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Nom *"
          className={inputClass}
        />
        <input
          value={form.reference}
          onChange={(e) => setForm({ ...form, reference: e.target.value })}
          placeholder="Référence *"
          className={inputClass}
        />
        <input
          value={form.machine_type}
          onChange={(e) => setForm({ ...form, machine_type: e.target.value })}
          placeholder="Type"
          className={inputClass}
        />
        <input
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
          placeholder="Localisation"
          className={inputClass}
        />
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Description"
          className={`${inputClass} min-h-[96px] resize-y`}
        />

        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={onSave}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
          >
            <CheckIcon className="h-4 w-4" />
            Enregistrer
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <XMarkIcon className="h-4 w-4" />
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditMachineModal;

