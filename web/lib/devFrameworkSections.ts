export type DevTabId =
  | "why"
  | "agents"
  | "protocol"
  | "nfr"
  | "scale"
  | "example";

export interface DevFrameworkTab {
  id: DevTabId;
  label: string;
  short: string;
  icon: string;
  blocks: Array<
    | { kind: "title"; text: string }
    | { kind: "subtitle"; text: string }
    | { kind: "callout"; tone: "sky" | "amber"; title?: string; text: string }
    | { kind: "paragraph"; text: string }
    | { kind: "list"; items: string[] }
  >;
}

export const devFrameworkTabs: DevFrameworkTab[] = [
  {
    id: "why",
    label: "El por qué",
    short: "Propósito",
    icon: "⚡",
    blocks: [
      { kind: "title", text: "El por qué" },
      {
        kind: "subtitle",
        text: "Por qué este framework existe: el problema real que resuelve.",
      },
      {
        kind: "callout",
        tone: "sky",
        text: "Construimos proyectos en producción antes de definir quién era responsable de la seguridad.",
      },
      {
        kind: "paragraph",
        text: "El equipo encontró proyectos activos en Supabase con Row Level Security (RLS) deshabilitado. El riesgo era real porque nadie tenía asignado, desde el inicio, el rol explícito de endurecer la capa de datos.",
      },
      {
        kind: "callout",
        tone: "amber",
        title: "El principio central",
        text: "Los NFR (requisitos no funcionales) se definen antes de la primera línea de código, no después del primer incidente de seguridad.",
      },
      {
        kind: "paragraph",
        text: "Este framework existe para evitar ese patrón: asignar agentes (Web, App, Base de datos) y entregables verificables antes de escribir código.",
      },
    ],
  },
  {
    id: "agents",
    label: "Los 6 agentes",
    short: "Agentes",
    icon: "👥",
    blocks: [
      { kind: "title", text: "Los 6 agentes" },
      {
        kind: "subtitle",
        text: "Roles con alcance, responsabilidades y límites explícitos para cada proyecto web ITAI.",
      },
      {
        kind: "list",
        items: [
          "PM: prioriza, negocia alcance y asegura trazabilidad de decisiones.",
          "Security Agent: modela amenazas, controles mínimos y revisión de superficie de ataque.",
          "Database Agent: modelo de datos, migraciones, RLS/políticas y observabilidad de consultas.",
          "Developer: implementa verticalmente con tipos estrictos y contratos de API claros.",
          "QA Engineer: pruebas funcionales, regresión y criterios de salida por feature.",
          "DevOps Agent: pipelines, secretos, entornos y recuperación ante desastres operativos.",
        ],
      },
      {
        kind: "paragraph",
        text: "Cada agente entrega artefactos revisables. Si un rol falta en la conversación, el protocolo pre-código lo vuelve visible antes de comprometer fechas.",
      },
    ],
  },
  {
    id: "protocol",
    label: "Protocolo pre-código",
    short: "Protocolo",
    icon: "🔐",
    blocks: [
      { kind: "title", text: "Protocolo pre-código" },
      {
        kind: "subtitle",
        text: "Flujo de cinco pasos con responsable y salida mínima por paso.",
      },
      {
        kind: "list",
        items: [
          "1. Charter de producto (PM): problema, usuarios, métricas de éxito y no-objetivos.",
          "2. Modelo de amenazas liviano (Security): activos, trust boundaries y controles mínimos.",
          "3. Esquema + políticas de acceso (Database): tablas, RLS y casos borde de autorización.",
          "4. Contratos de API y UI states (Developer + PM): errores, vacíos y loading.",
          "5. Plan de pruebas y datos semilla (QA): casos críticos y umbrales de regresión.",
        ],
      },
      {
        kind: "paragraph",
        text: "Sin estos cinco pasos completados, el tablero marca el proyecto como “sin iniciar” aunque exista código experimental.",
      },
    ],
  },
  {
    id: "nfr",
    label: "NFR por capa",
    short: "NFR",
    icon: "🧱",
    blocks: [
      { kind: "title", text: "NFR por capa" },
      {
        kind: "subtitle",
        text: "Checklists interactivos para Capa Web, Capa App y Capa Database (marcado en sesión en la app de referencia).",
      },
      {
        kind: "list",
        items: [
          "Capa Web: accesibilidad, rendimiento percibido, seguridad de contenido y telemetría mínima.",
          "Capa App: validación de entrada, manejo de errores, límites de tasa y trazas correlacionadas.",
          "Capa Database: RLS, índices, backups probados y migraciones reversibles.",
        ],
      },
      {
        kind: "paragraph",
        text: "En esta versión de ejemplo, los NFR se documentan en el repositorio; la UI avanzada con checkboxes persistentes puede conectarse a Supabase cuando lo decidas.",
      },
    ],
  },
  {
    id: "scale",
    label: "Quick start vs scale up",
    short: "Escala",
    icon: "⚖️",
    blocks: [
      { kind: "title", text: "Quick start vs scale up" },
      {
        kind: "subtitle",
        text: "El mismo producto puede arrancar en modo ligero y endurecerse sin reescribir la historia entera.",
      },
      {
        kind: "list",
        items: [
          "Quick start: un solo entorno, feature flags simples, monitoreo básico y deuda explícita en el tablero.",
          "Scale up: ambientes separados, revisiones de seguridad periódicas, pruebas automatizadas en CI y SLOs.",
        ],
      },
      {
        kind: "paragraph",
        text: "La decisión no es ideológica: se deriva del riesgo y del costo de fallo. El panel de ExpertizOne muestra dónde hay riesgo concentrado para priorizar el salto de modo.",
      },
    ],
  },
  {
    id: "example",
    label: "Esta app: el ejemplo",
    short: "Ejemplo",
    icon: "✏️",
    blocks: [
      { kind: "title", text: "Esta app: el ejemplo" },
      {
        kind: "subtitle",
        text: "Portafolio vivo que conecta Next.js (App Router) con una API Node/Express y datos JSON versionados.",
      },
      {
        kind: "paragraph",
        text: "El tablero Kanban refleja fases reales (sin iniciar, en progreso, completado) y salud operativa (activo, pausado, en riesgo). El scorecard resume carga por persona y proyectos que requieren atención.",
      },
      {
        kind: "callout",
        tone: "sky",
        text: "Sustituye el archivo de proyectos por tu base de datos o Supabase cuando quieras continuidad multiusuario con RLS.",
      },
    ],
  },
];
