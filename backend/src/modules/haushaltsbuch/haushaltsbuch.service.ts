import { Prisma, HaushaltKategorieTyp } from '@prisma/client'
import { prisma } from '../../db'
import { AppError } from '../../utils/appError'

// Haushaltsbuch ist privat pro Nutzer — jede Funktion filtert nach userId.
// Es gibt eine Haushaltskasse (Startbetrag) und Kategorien. Jede Kategorie hat
// einen Schalter "inStatistik": ist er aus, sind die Buchungen Verschiebungen
// (z.B. Sparbuch), die nicht in Einnahmen/Ausgaben zählen, aber die Kasse ändern.
// Beträge als Decimal in der DB, als number im DTO. Datum = reiner Kalendertag.

export type KategorieTyp = HaushaltKategorieTyp

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`)
}

function toNumber(value: Prisma.Decimal | number | string): number {
  return Number(value)
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function monthRange(jahr: number, monat: number): { von: Date; bis: Date } {
  return {
    von: new Date(Date.UTC(jahr, monat - 1, 1)),
    bis: new Date(Date.UTC(jahr, monat, 1)),
  }
}

function tagDavor(datum: Date): Date {
  return new Date(datum.getTime() - 24 * 60 * 60 * 1000)
}

// ── Haushaltskasse ──────────────────────────────────────

export interface KasseDTO {
  startbetrag: number
  startdatum: string
}

export async function getKasse(userId: string): Promise<KasseDTO | null> {
  const row = await prisma.haushaltKasse.findUnique({ where: { userId } })
  return row ? { startbetrag: toNumber(row.startbetrag), startdatum: toDateOnly(row.startdatum) } : null
}

export async function setKasse(userId: string, input: KasseDTO): Promise<KasseDTO> {
  const row = await prisma.haushaltKasse.upsert({
    where: { userId },
    create: { userId, startbetrag: input.startbetrag, startdatum: parseDateOnly(input.startdatum) },
    update: { startbetrag: input.startbetrag, startdatum: parseDateOnly(input.startdatum) },
  })
  return { startbetrag: toNumber(row.startbetrag), startdatum: toDateOnly(row.startdatum) }
}

// ── Kategorien ──────────────────────────────────────────

export interface KategorieDTO {
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

// Vollständiger Pfad ("Ausgehen › Kino › Bar") und ob die Kategorie wirklich zählt:
// zählt nur, wenn sie selbst und alle Oberkategorien zählen.
async function kategorieInfos(userId: string) {
  const alle = await prisma.haushaltKategorie.findMany({
    where: { userId },
    select: { id: true, name: true, parentId: true, inStatistik: true },
  })
  const nach = new Map(alle.map((k) => [k.id, k]))
  const infos = new Map<string, { pfad: string; effektivInStatistik: boolean }>()
  for (const k of alle) {
    const teile: string[] = []
    let effektiv = true
    let aktuell: (typeof alle)[number] | undefined = k
    const besucht = new Set<string>()
    while (aktuell && !besucht.has(aktuell.id) && teile.length < 50) {
      besucht.add(aktuell.id)
      teile.unshift(aktuell.name)
      if (!aktuell.inStatistik) effektiv = false
      aktuell = aktuell.parentId ? nach.get(aktuell.parentId) : undefined
    }
    infos.set(k.id, { pfad: teile.join(' › '), effektivInStatistik: effektiv })
  }
  return infos
}

export async function listKategorien(userId: string): Promise<KategorieDTO[]> {
  const [rows, buchungen, infos] = await Promise.all([
    prisma.haushaltKategorie.findMany({
      where: { userId },
      orderBy: [{ typ: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    }),
    prisma.haushaltBuchung.groupBy({ by: ['kategorieId'], where: { userId }, _count: { _all: true } }),
    kategorieInfos(userId),
  ])
  const usage = new Map(buchungen.map((g) => [g.kategorieId, g._count._all]))
  return rows.map((k) => {
    const info = infos.get(k.id)
    return {
      id: k.id,
      name: k.name,
      typ: k.typ,
      parentId: k.parentId,
      pfad: info?.pfad ?? k.name,
      inStatistik: k.inStatistik,
      effektivInStatistik: info?.effektivInStatistik ?? k.inStatistik,
      sortOrder: k.sortOrder,
      usageCount: usage.get(k.id) ?? 0,
    }
  })
}

export interface KategorieInput {
  name: string
  typ: KategorieTyp
  parentId?: string | null
  inStatistik?: boolean
}

export async function createKategorie(userId: string, input: KategorieInput): Promise<void> {
  if (input.parentId) {
    const parent = await prisma.haushaltKategorie.findFirst({ where: { id: input.parentId, userId } })
    if (!parent) throw new AppError('Die Oberkategorie existiert nicht.', 400)
    if (parent.typ !== input.typ) throw new AppError('Unterkategorie muss denselben Typ wie die Oberkategorie haben.', 400)
  }
  const last = await prisma.haushaltKategorie.findFirst({
    where: { userId, typ: input.typ, parentId: input.parentId ?? null },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  })
  await prisma.haushaltKategorie.create({
    data: {
      userId,
      name: input.name,
      typ: input.typ,
      parentId: input.parentId ?? null,
      inStatistik: input.inStatistik ?? true,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  })
}

export async function updateKategorie(
  userId: string,
  id: string,
  input: { name?: string; inStatistik?: boolean },
): Promise<boolean> {
  const existing = await prisma.haushaltKategorie.findFirst({ where: { id, userId } })
  if (!existing) return false

  if (input.inStatistik !== undefined) {
    // Der Schalter gilt für die ganze Gruppe: Unterkategorien ziehen mit.
    const alle = await prisma.haushaltKategorie.findMany({ where: { userId }, select: { id: true, parentId: true } })
    const gruppe = new Set<string>([id])
    let gewachsen = true
    while (gewachsen) {
      gewachsen = false
      for (const k of alle) {
        if (k.parentId && gruppe.has(k.parentId) && !gruppe.has(k.id)) {
          gruppe.add(k.id)
          gewachsen = true
        }
      }
    }
    await prisma.haushaltKategorie.updateMany({
      where: { userId, id: { in: [...gruppe] } },
      data: { inStatistik: input.inStatistik },
    })
  }
  if (input.name !== undefined) {
    await prisma.haushaltKategorie.update({ where: { id }, data: { name: input.name } })
  }
  return true
}

// Reihenfolge innerhalb einer Ebene: ids in der gewünschten Reihenfolge. Alle müssen
// zum Nutzer gehören und dieselbe Oberkategorie und denselben Typ haben.
export async function sortiereKategorien(userId: string, ids: string[]): Promise<void> {
  const kategorien = await prisma.haushaltKategorie.findMany({ where: { userId, id: { in: ids } }, select: { id: true, parentId: true, typ: true } })
  if (kategorien.length !== ids.length) throw new AppError('Mindestens eine Kategorie existiert nicht.', 400)
  const erste = kategorien[0]
  if (kategorien.some((k) => k.parentId !== erste.parentId || k.typ !== erste.typ)) {
    throw new AppError('Nur Kategorien derselben Ebene können sortiert werden.', 400)
  }
  await prisma.$transaction(ids.map((id, index) => prisma.haushaltKategorie.update({ where: { id }, data: { sortOrder: index } })))
}

export async function deleteKategorie(userId: string, id: string): Promise<boolean> {
  const existing = await prisma.haushaltKategorie.findFirst({ where: { id, userId } })
  if (!existing) return false
  const [buchungen, kinder] = await Promise.all([
    prisma.haushaltBuchung.count({ where: { userId, kategorieId: id } }),
    prisma.haushaltKategorie.count({ where: { userId, parentId: id } }),
  ])
  if (buchungen > 0) throw new AppError(`Diese Kategorie hat noch ${buchungen} Buchung${buchungen === 1 ? '' : 'en'} — bitte dort zuerst ändern.`, 409)
  if (kinder > 0) throw new AppError('Diese Kategorie hat noch Unterkategorien — bitte zuerst entfernen.', 409)
  await prisma.haushaltKategorie.delete({ where: { id } })
  return true
}

// ── Buchungen ───────────────────────────────────────────

export interface BuchungDTO {
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

const BUCHUNG_INCLUDE = { kategorie: { select: { name: true, typ: true } }, haendler: { select: { name: true } } } as const

type BuchungRow = Prisma.HaushaltBuchungGetPayload<{ include: typeof BUCHUNG_INCLUDE }>

function toBuchungDTO(row: BuchungRow, info?: { pfad: string; effektivInStatistik: boolean }): BuchungDTO {
  return {
    id: row.id,
    datum: toDateOnly(row.datum),
    betrag: toNumber(row.betrag),
    typ: row.kategorie.typ,
    kategorieId: row.kategorieId,
    kategorieName: row.kategorie.name,
    kategoriePfad: info?.pfad ?? row.kategorie.name,
    effektivInStatistik: info?.effektivInStatistik ?? true,
    haendler: row.haendler?.name ?? null,
    notiz: row.notiz,
  }
}

export interface BuchungFilter {
  von?: string
  bis?: string
  kategorieId?: string
  suche?: string
}

export async function listBuchungen(userId: string, filter: BuchungFilter): Promise<BuchungDTO[]> {
  const [rows, infos] = await Promise.all([
    prisma.haushaltBuchung.findMany({
      where: {
        userId,
        ...(filter.von && filter.bis && { datum: { gte: parseDateOnly(filter.von), lte: parseDateOnly(filter.bis) } }),
        ...(filter.kategorieId && { kategorieId: filter.kategorieId }),
      },
      include: BUCHUNG_INCLUDE,
      orderBy: [{ datum: 'desc' }, { createdAt: 'desc' }],
    }),
    kategorieInfos(userId),
  ])
  let result = rows.map((r) => toBuchungDTO(r, infos.get(r.kategorieId)))
  const needle = filter.suche?.trim().toLowerCase()
  if (needle) {
    result = result.filter((b) => `${b.haendler ?? ''} ${b.notiz ?? ''} ${b.kategoriePfad}`.toLowerCase().includes(needle))
  }
  return result
}

async function assertBuchungInput(userId: string, input: BuchungInput): Promise<void> {
  if (!(input.betrag > 0)) throw new AppError('Der Betrag muss größer als 0 sein.', 400)
  const kategorie = await prisma.haushaltKategorie.findFirst({ where: { id: input.kategorieId, userId } })
  if (!kategorie) throw new AppError('Die Kategorie existiert nicht.', 400)
}

// Händlername → gespeicherter Eintrag. Ohne Groß-/Kleinschreibung, damit "Edeka" und
// "edeka" nicht zwei Händler werden. Unbekannte Namen werden hier angelegt.
async function haendlerIdFuer(userId: string, name: string | null): Promise<string | null> {
  const bereinigt = name?.trim() || null
  if (!bereinigt) return null
  const vorhanden = await prisma.haushaltHaendler.findFirst({ where: { userId, name: { equals: bereinigt } } })
  if (vorhanden) return vorhanden.id
  const neu = await prisma.haushaltHaendler.create({ data: { userId, name: bereinigt } })
  return neu.id
}

async function toBuchungData(userId: string, input: BuchungInput) {
  return {
    datum: parseDateOnly(input.datum),
    betrag: input.betrag,
    kategorieId: input.kategorieId,
    haendlerId: await haendlerIdFuer(userId, input.haendler),
    notiz: input.notiz?.trim() || null,
  }
}

export async function createBuchung(userId: string, input: BuchungInput): Promise<void> {
  await assertBuchungInput(userId, input)
  await prisma.haushaltBuchung.create({ data: { userId, ...(await toBuchungData(userId, input)) } })
}

// Alle prüfen, dann in einer Transaktion schreiben — entweder alles oder nichts.
export async function createBuchungen(userId: string, inputs: BuchungInput[]): Promise<number> {
  for (const input of inputs) await assertBuchungInput(userId, input)
  const daten = []
  for (const input of inputs) daten.push(await toBuchungData(userId, input))
  await prisma.$transaction(daten.map((d) => prisma.haushaltBuchung.create({ data: { userId, ...d } })))
  return inputs.length
}

export async function updateBuchung(userId: string, id: string, input: BuchungInput): Promise<boolean> {
  const existing = await prisma.haushaltBuchung.findFirst({ where: { id, userId } })
  if (!existing) return false
  await assertBuchungInput(userId, input)
  await prisma.haushaltBuchung.update({ where: { id }, data: await toBuchungData(userId, input) })
  return true
}

export async function deleteBuchung(userId: string, id: string): Promise<boolean> {
  const existing = await prisma.haushaltBuchung.findFirst({ where: { id, userId } })
  if (!existing) return false
  await prisma.haushaltBuchung.delete({ where: { id } })
  return true
}

// ── Auswertungen ────────────────────────────────────────

// Kassenstand zum Stichtag: Startbetrag plus alle Buchungen seit dem Startdatum.
// Einnahmen erhöhen, Ausgaben senken — unabhängig von der Statistik-Einstellung.
export async function kassenstand(userId: string, stichtag: Date): Promise<number | null> {
  const kasse = await prisma.haushaltKasse.findUnique({ where: { userId } })
  if (!kasse) return null
  const startdatum = kasse.startdatum
  const buchungen = await prisma.haushaltBuchung.findMany({
    where: { userId, datum: { gte: startdatum, lte: stichtag } },
    select: { betrag: true, kategorie: { select: { typ: true } } },
  })
  let stand = toNumber(kasse.startbetrag)
  for (const b of buchungen) {
    stand += b.kategorie.typ === 'EINNAHME' ? toNumber(b.betrag) : -toNumber(b.betrag)
  }
  return round2(stand)
}

// Summen eines Monats, getrennt nach Statistik (zählt) und Verschiebungen (zählt nicht).
async function monatsSummen(userId: string, jahr: number, monat: number) {
  const { von, bis } = monthRange(jahr, monat)
  const [rows, infos] = await Promise.all([
    prisma.haushaltBuchung.findMany({
      where: { userId, datum: { gte: von, lt: bis } },
      select: { betrag: true, kategorieId: true, kategorie: { select: { name: true, typ: true } } },
    }),
    kategorieInfos(userId),
  ])
  let einnahmen = 0
  let ausgaben = 0
  const kategorien = new Map<string, { id: string; name: string; typ: KategorieTyp; pfad: string; summe: number }>()
  const verschiebungen = new Map<string, { id: string; name: string; typ: KategorieTyp; pfad: string; summe: number }>()
  for (const r of rows) {
    const betrag = toNumber(r.betrag)
    const info = infos.get(r.kategorieId)
    const ziel = info?.effektivInStatistik ? kategorien : verschiebungen
    if (info?.effektivInStatistik) {
      if (r.kategorie.typ === 'EINNAHME') einnahmen += betrag
      else ausgaben += betrag
    }
    const eintrag = ziel.get(r.kategorieId) ?? { id: r.kategorieId, name: r.kategorie.name, typ: r.kategorie.typ, pfad: info?.pfad ?? r.kategorie.name, summe: 0 }
    eintrag.summe += betrag
    ziel.set(r.kategorieId, eintrag)
  }
  const rund = (liste: Map<string, { id: string; name: string; typ: KategorieTyp; pfad: string; summe: number }>) =>
    [...liste.values()].map((e) => ({ ...e, summe: round2(e.summe) })).sort((a, b) => b.summe - a.summe)
  return {
    einnahmen: round2(einnahmen),
    ausgaben: round2(ausgaben),
    bilanz: round2(einnahmen - ausgaben),
    kategorien: rund(kategorien),
    verschiebungen: rund(verschiebungen),
  }
}

export async function monatsUebersicht(userId: string, jahr: number, monat: number) {
  const aktuell = await monatsSummen(userId, jahr, monat)
  const vormonat = monat === 1 ? await monatsSummen(userId, jahr - 1, 12) : await monatsSummen(userId, jahr, monat - 1)
  const { bis } = monthRange(jahr, monat)
  return {
    jahr,
    monat,
    ...aktuell,
    vormonatBilanz: vormonat.bilanz,
    kasse: await kassenstand(userId, tagDavor(bis)),
  }
}

export async function jahresUebersicht(userId: string, jahr: number) {
  const monate = []
  for (let monat = 1; monat <= 12; monat++) {
    const summen = await monatsSummen(userId, jahr, monat)
    const { bis } = monthRange(jahr, monat)
    monate.push({
      monat,
      einnahmen: summen.einnahmen,
      ausgaben: summen.ausgaben,
      bilanz: summen.bilanz,
      kasse: await kassenstand(userId, tagDavor(bis)),
    })
  }
  return { jahr, monate }
}

// ── Händler ─────────────────────────────────────────────

export interface HaendlerDTO {
  id: string
  name: string
  usageCount: number
}

export async function listHaendler(userId: string): Promise<HaendlerDTO[]> {
  const [rows, gruppen] = await Promise.all([
    prisma.haushaltHaendler.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
    prisma.haushaltBuchung.groupBy({ by: ['haendlerId'], where: { userId, haendlerId: { not: null } }, _count: { _all: true } }),
  ])
  const usage = new Map(gruppen.map((g) => [g.haendlerId, g._count._all]))
  return rows.map((h) => ({ id: h.id, name: h.name, usageCount: usage.get(h.id) ?? 0 }))
}

async function assertHaendlerNameFrei(userId: string, name: string, ausId?: string): Promise<void> {
  const treffer = await prisma.haushaltHaendler.findFirst({ where: { userId, name: { equals: name } } })
  if (treffer && treffer.id !== ausId) throw new AppError(`Den Händler "${treffer.name}" gibt es schon.`, 409)
}

export async function createHaendler(userId: string, name: string): Promise<void> {
  await assertHaendlerNameFrei(userId, name)
  await prisma.haushaltHaendler.create({ data: { userId, name } })
}

export async function updateHaendler(userId: string, id: string, name: string): Promise<boolean> {
  const existing = await prisma.haushaltHaendler.findFirst({ where: { id, userId } })
  if (!existing) return false
  await assertHaendlerNameFrei(userId, name, id)
  await prisma.haushaltHaendler.update({ where: { id }, data: { name } })
  return true
}

export async function deleteHaendler(userId: string, id: string): Promise<boolean> {
  const existing = await prisma.haushaltHaendler.findFirst({ where: { id, userId } })
  if (!existing) return false
  const anzahl = await prisma.haushaltBuchung.count({ where: { userId, haendlerId: id } })
  if (anzahl > 0) throw new AppError(`Dieser Händler wird noch in ${anzahl} Buchung${anzahl === 1 ? '' : 'en'} verwendet.`, 409)
  await prisma.haushaltHaendler.delete({ where: { id } })
  return true
}

// ── Gesamtsumme über alle Zeiten (nur Kategorien mit Statistik) ──

export async function gesamtUebersicht(userId: string) {
  const [rows, infos] = await Promise.all([
    prisma.haushaltBuchung.findMany({ where: { userId }, select: { betrag: true, kategorieId: true, kategorie: { select: { typ: true } } } }),
    kategorieInfos(userId),
  ])
  let einnahmen = 0
  let ausgaben = 0
  for (const r of rows) {
    if (infos.get(r.kategorieId)?.effektivInStatistik === false) continue
    if (r.kategorie.typ === 'EINNAHME') einnahmen += toNumber(r.betrag)
    else ausgaben += toNumber(r.betrag)
  }
  return { einnahmen: round2(einnahmen), ausgaben: round2(ausgaben) }
}
