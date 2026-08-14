import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../db'
import { generateToken } from '../services/auth.service'

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
