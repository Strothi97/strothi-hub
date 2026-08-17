import { Request, Response } from 'express'
import fs from 'fs/promises'
import path from 'path'
import bcrypt from 'bcryptjs'
import { Role } from '@prisma/client'
import { prisma } from '../db'
import { generateToken } from '../services/auth.service'
import * as inviteService from '../services/invite.service'

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Ungültige Anmeldedaten' })
    }

    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return res.status(401).json({ message: 'Ungültige Anmeldedaten' })
    }

    const token = generateToken(user.id)

    const { password: _password, ...userWithoutPassword } = user
    return res.json({ user: userWithoutPassword, token })
  } catch (error) {
    return res.status(500).json({ message: 'Serverfehler beim Login' })
  }
}

export const getMe = async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    })
    return res.json({ user })
  } catch (error) {
    return res.status(500).json({ message: 'Serverfehler' })
  }
}

export const getInvite = async (req: Request, res: Response) => {
  const invite = await inviteService.getValidInvite(req.params.token)
  if (!invite) {
    return res.status(404).json({ message: 'Link ungültig oder abgelaufen' })
  }
  return res.json({ name: invite.user.name, email: invite.user.email })
}

export const acceptInvite = async (req: Request, res: Response) => {
  const { password } = req.body as { password?: string }
  if (!password || password.length < 8) {
    return res.status(400).json({ message: 'Passwort muss mindestens 8 Zeichen lang sein' })
  }

  const accepted = await inviteService.acceptInvite(req.params.token, password)
  if (!accepted) {
    return res.status(404).json({ message: 'Link ungültig oder abgelaufen' })
  }
  return res.json({ ok: true })
}

export const changePassword = async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string }
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ message: 'Neues Passwort muss mindestens 8 Zeichen lang sein' })
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
  if (!user) return res.status(404).json({ message: 'Nutzer nicht gefunden' })

  const isValid = await bcrypt.compare(currentPassword || '', user.password)
  if (!isValid) {
    return res.status(400).json({ message: 'Aktuelles Passwort ist falsch' })
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({ where: { id: user.id }, data: { password: hashedPassword } })

  return res.json({ ok: true })
}

export const deleteMyAccount = async (req: Request, res: Response) => {
  const { password } = req.body as { password?: string }

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
  if (!user) return res.status(404).json({ message: 'Nutzer nicht gefunden' })

  const isValid = await bcrypt.compare(password || '', user.password)
  if (!isValid) {
    return res.status(400).json({ message: 'Passwort ist falsch' })
  }

  if (user.role === Role.ADMIN) {
    const adminCount = await prisma.user.count({ where: { role: Role.ADMIN } })
    if (adminCount <= 1) {
      return res.status(400).json({ message: 'Der letzte Admin-Account kann nicht gelöscht werden' })
    }
  }

  // Kaskadiert in der DB automatisch (Reminder, Person, PushSubscription, ...),
  // hochgeladene Geburtstagsfotos liegen aber als Dateien außerhalb der DB.
  const photoDir = path.join(__dirname, '..', '..', process.env.UPLOAD_DIR || 'uploads', 'erinnerungen', user.id)
  await fs.rm(photoDir, { recursive: true, force: true }).catch(() => {})

  await prisma.user.delete({ where: { id: user.id } })

  return res.json({ ok: true })
}
