import { Request, Response } from 'express'
import { Role } from '@prisma/client'
import { prisma } from '../db'
import { createUser } from '../services/auth.service'
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

  res.json({
    users: users.map((user) => ({
      ...user,
      toolAccess: user.toolAccess.map((access) => access.toolKey),
    })),
  })
}

export const createUserByAdmin = async (req: Request, res: Response) => {
  try {
    const { email, password, name, role } = req.body
    const user = await createUser({ email, password, name, role })
    return res.status(201).json({ user })
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ message: error.message })
    }
    return res.status(500).json({ message: 'Serverfehler beim Anlegen des Nutzers' })
  }
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
