import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()
const email = 'zz-tabtest@local.test'
const password = 'Test1234!'

async function main() {
  const hashed = await bcrypt.hash(password, 12)
  const user = await prisma.user.upsert({
    where: { email },
    update: { password: hashed },
    create: { email, password: hashed, name: 'ZZ Tabtest' },
  })
  await prisma.userToolAccess.upsert({
    where: { userId_toolKey: { userId: user.id, toolKey: 'haushaltsbuch' } },
    update: {},
    create: { userId: user.id, toolKey: 'haushaltsbuch' },
  })
  await prisma.haushaltBuchung.deleteMany({ where: { userId: user.id } })
  await prisma.haushaltKategorie.deleteMany({ where: { userId: user.id } })
  await prisma.haushaltHaendler.deleteMany({ where: { userId: user.id } })
  await prisma.haushaltKategorie.create({ data: { userId: user.id, name: 'Versicherungen', typ: 'AUSGABE', sortOrder: 0 } })
  await prisma.haushaltKategorie.create({ data: { userId: user.id, name: 'Essen', typ: 'AUSGABE', sortOrder: 1 } })
  console.log(JSON.stringify({ email, password }))
}
main().finally(() => prisma.$disconnect())
