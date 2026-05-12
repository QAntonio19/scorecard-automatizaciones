/** Opciones sólo desde env/build (SSR). Para UI reactiva use `useItProjectResponsableOptions`. */

import { buildItProjectPmOptionsFromEnv } from "@/lib/itProjectResponsablesLocal";

export const IT_PROJECT_PM_SELECT_OPTIONS: readonly string[] = Object.freeze(buildItProjectPmOptionsFromEnv());
