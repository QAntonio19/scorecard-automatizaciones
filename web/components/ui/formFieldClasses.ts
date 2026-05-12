/** Base compartida: inputs, textareas y trigger de selects custom (IT / proyectos). */
export const formFieldControlClass =
  "w-full rounded-xl border border-slate-200/95 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition " +
  "placeholder:text-slate-400 hover:border-slate-300 hover:shadow " +
  "focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20";

/** Botón-trigger alineado con el mismo look que el antiguo <select>. */
export const formFieldSelectTriggerClass =
  `${formFieldControlClass} min-h-[44px] cursor-pointer py-2.5 pr-11 pl-3.5 font-medium text-slate-800 text-left`;
