import { Request, Response, NextFunction } from 'express'
import { prisma } from '../db'

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Nur für Administratoren' })
  }
  return next()
}

export const requireTool = (toolKey: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Kein Token angegeben' })
    }

    if (req.user.role === 'ADMIN') {
      return next()
    }

    const access = await prisma.userToolAccess.findUnique({
      where: { userId_toolKey: { userId: req.user.id, toolKey } },
    })

    if (!access) {
      return res.status(403).json({ message: 'Kein Zugriff auf dieses Tool' })
    }

    return next()
  }
}
