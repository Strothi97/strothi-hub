// Liest kochbuch-export.json (siehe export-kochbuch.ts) und legt die
// enthaltenen Rezepte in der Datenbank an, gegen die dieses Skript gerade
// läuft (DATABASE_URL aus der .env) — zum Übernehmen ins Produktivsystem.
//
// Nutzer werden per E-Mail aufgelöst (nicht per ID, die zwischen lokaler DB
// und Produktiv-DB unterschiedlich ist) — fehlt ein Nutzer mit passender
// E-Mail im Zielsystem, bricht der Import für dieses Rezept mit einer
// klaren Fehlermeldung ab, statt zu raten.
//
// Wiederholt ausführbar: ein Rezept mit exakt gleichem Titel + Ersteller-
// E-Mail wird übersprungen statt dupliziert.
//
// WICHTIG: Vor dem Ausführen müssen die Bilddateien aus
// backend/uploads/kochbuch/ bereits manuell an denselben relativen Pfad auf
// dem Zielsystem kopiert sein (siehe export-kochbuch.ts) — dieses Skript
// kopiert keine Dateien, nur Datenbank-Zeilen.
//
// Aufruf: npm run kochbuch:import  (liest kochbuch-export.json aus dem Repo-Root)

import fs from 'fs/promises'
import path from 'path'
import { Prisma } from '@prisma/client'
import { prisma } from '../src/db'

interface ExportedRating {
  userEmail: string
  value: number
}

interface ExportedRecipe {
  title: string
  subtitle: string | null
  source: string | null
  tags: unknown
  allergens: unknown
  prepTimeMinMinutes: number | null
  prepTimeMaxMinutes: number | null
  kcal: number | null
  photoUrl: string | null
  servingSizes: unknown
  pantryStaples: unknown
  ingredients: unknown
  steps: unknown
  note: string | null
  creatorEmail: string
  ratings: ExportedRating[]
}

async function main() {
  const inPath = path.join(__dirname, '..', 'kochbuch-export.json')
  const raw = await fs.readFile(inPath, 'utf-8')
  const data: { recipes: ExportedRecipe[] } = JSON.parse(raw)

  // Alle beteiligten E-Mails vorab auflösen, damit ein fehlender Nutzer
  // sofort auffällt statt mitten im Import.
  const emails = new Set<string>()
  for (const recipe of data.recipes) {
    emails.add(recipe.creatorEmail)
    for (const rating of recipe.ratings) emails.add(rating.userEmail)
  }
  const users = await prisma.user.findMany({ where: { email: { in: [...emails] } } })
  const userByEmail = new Map(users.map((u) => [u.email, u]))

  const missing = [...emails].filter((email) => !userByEmail.has(email))
  if (missing.length > 0) {
    console.error(
      `❌ Diese Nutzer existieren im Zielsystem nicht: ${missing.join(', ')}\n` +
        '   Lege sie zuerst an (gleiche E-Mail-Adresse) und starte den Import erneut.',
    )
    process.exitCode = 1
    return
  }

  let imported = 0
  let skipped = 0

  for (const recipe of data.recipes) {
    const creator = userByEmail.get(recipe.creatorEmail)!

    const existing = await prisma.recipe.findFirst({ where: { title: recipe.title, userId: creator.id } })
    if (existing) {
      console.log(`⏭️  Übersprungen (existiert schon): "${recipe.title}"`)
      skipped++
      continue
    }

    const created = await prisma.recipe.create({
      data: {
        userId: creator.id,
        title: recipe.title,
        subtitle: recipe.subtitle,
        source: recipe.source,
        tags: recipe.tags as Prisma.InputJsonValue,
        allergens: recipe.allergens as Prisma.InputJsonValue,
        prepTimeMinMinutes: recipe.prepTimeMinMinutes,
        prepTimeMaxMinutes: recipe.prepTimeMaxMinutes,
        kcal: recipe.kcal,
        photoUrl: recipe.photoUrl,
        servingSizes: recipe.servingSizes as Prisma.InputJsonValue,
        pantryStaples: recipe.pantryStaples as Prisma.InputJsonValue,
        ingredients: recipe.ingredients as Prisma.InputJsonValue,
        steps: recipe.steps as Prisma.InputJsonValue,
        note: recipe.note,
      },
    })

    for (const rating of recipe.ratings) {
      const ratingUser = userByEmail.get(rating.userEmail)!
      await prisma.recipeRating.create({
        data: { recipeId: created.id, userId: ratingUser.id, value: rating.value },
      })
    }

    console.log(`✅ Importiert: "${recipe.title}"`)
    imported++
  }

  console.log(`\nFertig: ${imported} importiert, ${skipped} übersprungen.`)
}

main()
  .catch((error) => {
    console.error('Import fehlgeschlagen:', error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
