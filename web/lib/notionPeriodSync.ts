import { notionApiJsonHeaders } from "./notionRelations";

/**
 * Encuentra o crea una página en una base de datos de Notion buscando por el título.
 * Útil para bases de datos de "Meses" o "Años".
 */
export async function findOrCreateNotionPageByTitle(params: {
  token: string;
  databaseId: string;
  titlePropName: string;
  titleValue: string;
  extraProps?: Record<string, unknown>;
  relationFilter?: { property: string; id: string };
}): Promise<string> {
  const { token, databaseId, titlePropName, titleValue, extraProps, relationFilter } = params;

  console.log(`[Notion Period] Buscando "${titleValue}" en DB ${databaseId}${relationFilter ? ` vinculada a ${relationFilter.id}` : ""}...`);

  // 1. Construir Filtro
  const filter: any = {
    property: titlePropName,
    title: { equals: titleValue },
  };

  const finalFilter = relationFilter 
    ? { and: [filter, { property: relationFilter.property, relation: { contains: relationFilter.id } }] }
    : filter;

  // 2. Buscar si ya existe
  const queryRes = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: "POST",
    headers: notionApiJsonHeaders(token),
    body: JSON.stringify({
      filter: finalFilter,
      page_size: 1,
    }),
  });

  const queryData = await queryRes.json();
  if (queryRes.ok && queryData.results?.length > 0) {
    const existingId = queryData.results[0].id;
    console.log(`[Notion Period] Encontrado existente: ${existingId}`);
    return existingId;
  }

  if (!queryRes.ok) {
    console.error(`[Notion Period] Error en búsqueda de "${titleValue}":`, queryData);
    throw new Error(`Fallo al buscar "${titleValue}" en Notion.`);
  }

  // 2. Si no existe, crearla
  console.log(`[Notion Period] No encontrado. Creando nuevo registro para "${titleValue}"...`);
  const createRes = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: notionApiJsonHeaders(token),
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties: {
        [titlePropName]: {
          title: [{ text: { content: titleValue } }],
        },
        ...(extraProps || {}),
      },
    }),
  });

  const createData = await createRes.json();
  if (!createRes.ok) {
    console.error(`[Notion Period] Error CREANDO "${titleValue}":`, createData);
    throw new Error(`No se pudo crear el registro para "${titleValue}" en Notion.`);
  }

  console.log(`[Notion Period] Creado exitosamente: ${createData.id}`);
  return createData.id;
}

export async function resolveProjectPeriodRelations(params: {
  token: string;
  startDateIso: string;
}): Promise<{ monthId?: string; yearId?: string }> {
  const { token, startDateIso } = params;
  console.log(`[Notion Period] Resolviendo para fecha: ${startDateIso}`);
  
  const date = new Date(startDateIso);
  if (isNaN(date.getTime())) {
    console.warn(`[Notion Period] Fecha inválida: ${startDateIso}`);
    return {};
  }

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  const monthName = monthNames[date.getUTCMonth()];
  const yearStr = date.getUTCFullYear().toString();

  const monthDbId = process.env.NOTION_MONTHS_DB_ID;
  const yearDbId = process.env.NOTION_YEARS_DB_ID;

  if (!monthDbId || !yearDbId) {
    console.warn("[Notion Period] Faltan IDs de bases de datos en ENV (NOTION_MONTHS_DB_ID / NOTION_YEARS_DB_ID)");
    return {};
  }

  // 1. Resolver Año primero
  const yearId = await findOrCreateNotionPageByTitle({
    token,
    databaseId: yearDbId,
    titlePropName: "Año",
    titleValue: yearStr,
  });

  // 2. Resolver Mes (específico para ese Año)
  // Intentamos buscarlo primero por el nombre del mes ("Mayo") vinculado a ese año
  // Si no existe, creamos uno nuevo llamado "Mayo 2026"
  const monthId = await findOrCreateNotionPageByTitle({
    token,
    databaseId: monthDbId,
    titlePropName: "Mes",
    titleValue: `${monthName} ${yearStr}`,
    relationFilter: { property: "años", id: yearId },
    extraProps: {
      "años": { relation: [{ id: yearId }] },
    },
  });

  return { monthId, yearId };
}
