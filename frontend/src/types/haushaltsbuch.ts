// Typen für das Tool "Haushaltsbuch"

export type KategorieTyp = 'EINNAHME' | 'AUSGABE'

export interface Kasse {
  startbetrag: number
  startdatum: string
}

export interface Kategorie {
  id: string
  name: string
  typ: KategorieTyp
  parentId: string | null
  pfad: string
  inStatistik: boolean
  effektivInStatistik: boolean
  sortOrder: number
  usageCount: number
}

export interface Buchung {
  id: string
  datum: string
  betrag: number
  typ: KategorieTyp
  kategorieId: string
  kategorieName: string
  kategoriePfad: string
  effektivInStatistik: boolean
  haendler: string | null
  notiz: string | null
}

export interface BuchungInput {
  datum: string
  betrag: number
  kategorieId: string
  haendler: string | null
  notiz: string | null
}

export interface KategorieSumme {
  id: string
  name: string
  typ: KategorieTyp
  pfad: string
  summe: number
}

export interface MonatsUebersicht {
  jahr: number
  monat: number
  einnahmen: number
  ausgaben: number
  bilanz: number
  vormonatBilanz: number
  kategorien: KategorieSumme[]
  verschiebungen: KategorieSumme[]
  kasse: number | null
}

export interface JahresMonat {
  monat: number
  einnahmen: number
  ausgaben: number
  bilanz: number
  kasse: number | null
}

export interface Haendler {
  id: string
  name: string
  usageCount: number
}

export interface HaendlerVorschlag {
  kategorieId: string
  betrag: number
  notiz: string | null
}

export interface Gesamt {
  einnahmen: number
  ausgaben: number
}
