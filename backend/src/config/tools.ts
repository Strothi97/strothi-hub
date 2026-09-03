// Zentrale Registry aller Hub-Tools. Neues Tool = neuer Eintrag hier
// (plus die eigentliche Implementierung in src/modules bzw. Frontend).
export interface ToolDefinition {
  key: string
  name: string
  description: string
  icon: string
  path: string
  comingSoon?: boolean
}

export const TOOLS: ToolDefinition[] = [
  {
    key: 'farsi',
    name: 'Farsi-Lernapp',
    description: 'Vokabeln, Grammatik und Übungen für Farsi',
    icon: '🗣️',
    path: '/farsi',
  },
  {
    key: 'haushaltsbuch',
    name: 'Haushaltsbuch',
    description: 'Einnahmen und Ausgaben im Blick behalten',
    icon: '💶',
    path: '/haushaltsbuch',
    comingSoon: true,
  },
  {
    key: 'erinnerungen',
    name: 'Erinnerungen',
    description: 'Geburtstage, Termine und wichtige Ereignisse',
    icon: '🔔',
    path: '/erinnerungen',
  },
  {
    key: 'kleingewerbe',
    name: 'Kleingewerbe',
    description: 'Einnahmen, Ausgaben und Jahresübersicht fürs Finanzamt',
    icon: '🧾',
    path: '/kleingewerbe',
    comingSoon: true,
  },
  {
    key: 'homeoffice',
    name: 'Arbeitsnachweis',
    description: 'Arbeitsorte übers Jahr dokumentieren (Büro, HomeOffice, Urlaub, ...)',
    icon: '🏠',
    path: '/homeoffice',
  },
  {
    key: 'notizen',
    name: 'Notizen',
    description: 'Schnelle Notizen für alles Mögliche',
    icon: '📝',
    path: '/notizen',
    comingSoon: true,
  },
  {
    key: 'kochbuch',
    name: 'Kochbuch',
    description: 'Sammlung der HelloFresh-Rezepte',
    icon: '🍳',
    path: '/kochbuch',
  },
]

export const getTool = (key: string) => TOOLS.find((tool) => tool.key === key)
