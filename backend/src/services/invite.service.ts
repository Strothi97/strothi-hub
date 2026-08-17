import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '../db'
import { AppError } from '../utils/appError'

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000

const userPublicSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  createdAt: true,
} as const

export async function createInvite(data: { email: string; name: string }) {
  const existingUser = await prisma.user.findUnique({ where: { email: data.email } })
  if (existingUser) {
    throw new AppError('E-Mail bereits vergeben', 400)
  }

  // Zufälliges, nie ausgegebenes Passwort — der eingeladene Nutzer setzt
  // sein eigenes über den Einladungslink.
  const unusablePassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12)

  const user = await prisma.user.create({
    data: { email: data.email, name: data.name, password: unusablePassword },
    select: userPublicSelect,
  })

  const token = await createTokenForUser(user.id)

  return { user, token }
}

export async function createTokenForUser(userId: string) {
  await prisma.inviteToken.deleteMany({ where: { userId, usedAt: null } })

  const token = crypto.randomBytes(32).toString('hex')
  await prisma.inviteToken.create({
    data: { userId, token, expiresAt: new Date(Date.now() + INVITE_TTL_MS) },
  })
  return token
}

export async function getValidInvite(token: string) {
  const invite = await prisma.inviteToken.findUnique({
    where: { token },
    include: { user: { select: { name: true, email: true } } },
  })
  if (!invite || invite.usedAt || invite.expiresAt < new Date()) return null
  return invite
}

export async function acceptInvite(token: string, password: string) {
  const invite = await getValidInvite(token)
  if (!invite) return false

  const hashedPassword = await bcrypt.hash(password, 12)

  await prisma.$transaction([
    prisma.user.update({ where: { id: invite.userId }, data: { password: hashedPassword } }),
    prisma.inviteToken.update({ where: { id: invite.id }, data: { usedAt: new Date() } }),
  ])

  return true
}

export async function hasPendingInvite(userId: string) {
  const invite = await prisma.inviteToken.findFirst({
    where: { userId, usedAt: null, expiresAt: { gt: new Date() } },
  })
  return !!invite
}
