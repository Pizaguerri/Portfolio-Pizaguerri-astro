
export interface CV {
  exposicions: string[];
  publicacions_i_col·laboracions: string[];
  premis: string[];
}

type CVData = Partial<CV>;

type EntryWithCV = {
  data: {
    cv?: CVData;
  };
};

// Extraer el último año de cuatro cifras encontrado
function extractYear(value: string): number | null {
  const matches = [...value.matchAll(/\b(?:18|19|20|21)\d{2}\b/g)];

  if (matches.length === 0) return null;

  return Number(matches[matches.length - 1][0]);
}

// Combinar el CV automático de las entradas con el CV manual
export function buildCV(
  entries: readonly EntryWithCV[],
  manualCV?: CVData
): CV {
  const fullCV: CV = {
    exposicions: [],
    publicacions_i_col·laboracions: [],
    premis: [],
  };

  const keys = Object.keys(fullCV) as (keyof CV)[];

  // Recopilar información de las entradas recibidas
  for (const entry of entries) {
    const cv = entry.data.cv;

    if (!cv) continue;

    for (const key of keys) {
      fullCV[key].push(...(cv[key] ?? []));
    }
  }

  // Incorporar información del CV manual
  if (manualCV) {
    for (const key of keys) {
      fullCV[key].push(...(manualCV[key] ?? []));
    }
  }

  // Eliminar duplicados y ordenar cronológicamente
  for (const key of keys) {
    const uniqueItems = [
      ...new Set(
        fullCV[key]
          .map((item) => item.trim())
          .filter(Boolean)
      ),
    ];

    fullCV[key] = uniqueItems.sort((a, b) => {
      const yearA = extractYear(a);
      const yearB = extractYear(b);

      // Las entradas sin año aparecen al final
      if (yearA === null && yearB !== null) return 1;
      if (yearA !== null && yearB === null) return -1;

      // Año más reciente primero
      if (yearA !== null && yearB !== null && yearA !== yearB) {
        return yearB - yearA;
      }

      // Desempate alfabético
      return a.localeCompare(b, 'ca');
    });
  }

  return fullCV;
}
