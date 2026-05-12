"use client";

import { useEffect, useState } from "react";
import {
  IT_PROJECT_RESPONSABLES_CHANGED_EVENT,
  buildItProjectPmOptionsFromEnv,
  getEffectiveResponsableNames,
} from "@/lib/itProjectResponsablesLocal";

function envBaselineSnapshot(): string[] {
  return [...buildItProjectPmOptionsFromEnv()];
}

/**
 * Lista de responsables editables (env + localStorage).
 * El estado inicial coincide con el servidor (solo env) para evitar errores de hidratación;
 * tras montar en el cliente se aplica lo guardado en el navegador.
 */
export function useItProjectResponsableOptions(): readonly string[] {
  const [names, setNames] = useState<string[]>(envBaselineSnapshot);

  useEffect(() => {
    const refresh = () => setNames(getEffectiveResponsableNames());
    refresh();
    window.addEventListener(IT_PROJECT_RESPONSABLES_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(IT_PROJECT_RESPONSABLES_CHANGED_EVENT, refresh);
  }, []);

  return names;
}
