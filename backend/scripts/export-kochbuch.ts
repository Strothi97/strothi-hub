// Exportiert alle Kochbuch-Rezepte (inkl. Bewertungen) aus der Datenbank,
// gegen die dieses Skript gerade läuft (DATABASE_URL aus der .env), als
// JSON-Datei — zum Übernehmen ins Produktivsystem (siehe import-kochbuch.ts).
//
// Nutzer werden per E-Mail statt interner ID referenziert, damit der Export
// unabhängig von unterschiedlichen internen IDs zwischen lokaler DB und
// Produktiv-DB funktioniert.
//
// WICHTIG: Bilder (Titel-/Schrittfotos) sind hier NICHT enthalten — die
// Dateien unter backend/uploads/kochbuch/ müssen zusätzlich manuell (z.B.
// per Plesk-Dateimanager) unverändert an denselben relativen Pfad auf dem
// Produktivserver kopiert werden. Die gespeicherten photoUrl-Strings
// verweisen weiter auf die alten (lokalen) Ordnernamen — das funktioniert
// trotzdem, weil /uploads rein dateibasiert ausgeliefert wird, unabhängig
// von der jeweiligen internen Nutzer-ID.
//
// Aufruf: npm run kochbuch:export  (schreibt kochbuch-export.json ins Repo-Root)

import fs from 'fs/promises'
import path from 'path'
import { prisma } from '../src/db'

async function main() {
  const recipes = await prisma.recipe.findMany({
    include: {
      user: { select: { email: true } },
      ratings: { include: { user: { select: { email: true } } } },
    },
    orderBy: { title: 'asc' },
  })

  const exportData = {
    exportedAt: new Date().toISOString(),
    recipes: recipes.map((r) => ({
      title: r.title,
      subtitle: r.subtitle,
      source: r.source,
      tags: r.tags,
      allergens: r.allergens,
      prepTimeMinMinutes: r.prepTimeMinMinutes,
      prepTimeMaxMinutes: r.prepTimeMaxMinutes,
      kcal: r.kcal,
      photoUrl: r.photoUrl,
      servingSizes: r.servingSizes,
      pantryStaples: r.pantryStaples,
      ingredients: r.ingredients,
      steps: r.steps,
      note: r.note,
      creatorEmail: r.user.email,
      ratings: r.ratings.map((rt) => ({ userEmail: rt.user.email, value: rt.value })),
    })),
  }

  const outPath = path.join(__dirname, '..', 'kochbuch-export.json')
  await fs.writeFile(outPath, JSON.stringify(exportData, null, 2), 'utf-8')
  console.log(`✅ ${exportData.recipes.length} Rezept(e) exportiert nach ${outPath}`)
  console.log('   Denk dran: backend/uploads/kochbuch/ zusätzlich manuell mitkopieren (Bilder).')
}

main()
  .catch((error) => {
    console.error('Export fehlgeschlagen:', error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
