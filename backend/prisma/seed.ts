import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Datenbank wird befüllt...')

  const email = process.env.ADMIN_EMAIL || 'admin@strothi.de'
  const password = process.env.ADMIN_PASSWORD || 'bitte-aendern'
  const name = process.env.ADMIN_NAME || 'Admin'

  const hashedPassword = await bcrypt.hash(password, 12)
  await prisma.user.upsert({
    where: { email },
    update: { password: hashedPassword, name, role: Role.ADMIN, isActive: true },
    create: {
      email,
      password: hashedPassword,
      name,
      role: Role.ADMIN,
    },
  })

  console.log(`✅ Seed abgeschlossen! Admin-Login: ${email}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
