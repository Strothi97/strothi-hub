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
    name: 'Farsi lernen',
    description: 'Vokabeln, Grammatik und Übungen für Farsi',
    icon: '🗣️',
    path: '/farsi',
    comingSoon: true,
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
    comingSoon: true,
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
    name: 'HomeOffice-Nachweis',
    description: 'Home-Office- und Bürotage dokumentieren',
    icon: '🏠',
    path: '/homeoffice',
    comingSoon: true,
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
    comingSoon: true,
  },
]

export const getTool = (key: string) => TOOLS.find((tool) => tool.key === key)
