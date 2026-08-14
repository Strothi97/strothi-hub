import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { Role } from '@prisma/client'
import { prisma } from '../db'
import { AppError } from '../utils/appError'

const userPublicSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  createdAt: true,
} as const

export const createUser = async (data: { email: string; password: string; name: string; role?: Role }) => {
  const existingUser = await prisma.user.findUnique({ where: { email: data.email } })
  if (existingUser) {
    throw new AppError('E-Mail bereits vergeben', 400)
  }

  const hashedPassword = await bcrypt.hash(data.password, 12)

  return prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      name: data.name,
      role: data.role ?? Role.USER,
    },
    select: userPublicSelect,
  })
}

export const generateToken = (userId: string) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET as string, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  } as jwt.SignOptions)
}
