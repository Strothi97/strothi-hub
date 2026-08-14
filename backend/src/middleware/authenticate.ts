import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../db'

interface JwtPayload {
  userId: string
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Kein Token angegeben' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    })

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Token ungültig oder abgelaufen' })
    }

    req.user = { id: user.id, email: user.email, name: user.name, role: user.role }
    return next()
  } catch {
    return res.status(401).json({ message: 'Token ungültig oder abgelaufen' })
  }
}
