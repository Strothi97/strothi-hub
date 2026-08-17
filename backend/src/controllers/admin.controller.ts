import { Request, Response } from 'express'
import { Role } from '@prisma/client'
import { prisma } from '../db'
import * as inviteService from '../services/invite.service'
import { sendMail } from '../services/mailer.service'
import { render } from '../services/templateEngine'
import { AppError } from '../utils/appError'

export const listUsers = async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
      toolAccess: { select: { toolKey: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  const pendingByUser = await Promise.all(
    users.map((user) => inviteService.hasPendingInvite(user.id)),
  )

  res.json({
    users: users.map((user, index) => ({
      ...user,
      toolAccess: user.toolAccess.map((access) => access.toolKey),
      pendingInvite: pendingByUser[index],
    })),
  })
}

async function sendInviteEmail(user: { email: string; name: string }, token: string) {
  const inviteUrl = `${process.env.CORS_ORIGIN || 'http://localhost:3000'}/einladung/${token}`
  const html = await render('invite', { name: user.name, inviteUrl })
  await sendMail({ to: user.email, subject: "Einladung zu Strothi's Hub", html })
}

export const inviteUser = async (req: Request, res: Response) => {
  try {
    const { email, name } = req.body
    const { user, token } = await inviteService.createInvite({ email, name })

    let emailSent = true
    try {
      await sendInviteEmail(user, token)
    } catch (error) {
      console.error('Einladungs-E-Mail konnte nicht gesendet werden:', error)
      emailSent = false
    }

    return res.status(201).json({ user, emailSent })
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ message: error.message })
    }
    return res.status(500).json({ message: 'Serverfehler beim Einladen des Nutzers' })
  }
}

export const resendInvite = async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: { email: true, name: true },
  })
  if (!user) return res.status(404).json({ message: 'Nutzer nicht gefunden' })

  const token = await inviteService.createTokenForUser(req.params.id)

  let emailSent = true
  try {
    await sendInviteEmail(user, token)
  } catch (error) {
    console.error('Einladungs-E-Mail konnte nicht gesendet werden:', error)
    emailSent = false
  }

  return res.json({ emailSent })
}

export const updateUser = async (req: Request, res: Response) => {
  const { id } = req.params
  const { role, isActive } = req.body as { role?: Role; isActive?: boolean }

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(role !== undefined && { role }),
      ...(isActive !== undefined && { isActive }),
    },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  })

  res.json({ user })
}

export const setToolAccess = async (req: Request, res: Response) => {
  const { id } = req.params
  const { toolKeys } = req.body as { toolKeys: string[] }

  await prisma.$transaction([
    prisma.userToolAccess.deleteMany({ where: { userId: id } }),
    prisma.userToolAccess.createMany({
      data: toolKeys.map((toolKey) => ({ userId: id, toolKey })),
    }),
  ])

  const toolAccess = await prisma.userToolAccess.findMany({
    where: { userId: id },
    select: { toolKey: true },
  })

  res.json({ toolAccess: toolAccess.map((access) => access.toolKey) })
}
