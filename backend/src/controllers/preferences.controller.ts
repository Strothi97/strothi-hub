import { Request, Response } from 'express'
import { prisma } from '../db'

function toToolOrder(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((entry): entry is string => typeof entry === 'string')
  return []
}

export const getDashboardPreferences = async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { hideComingSoonTools: true, toolOrder: true },
  })

  return res.json({
    hideComingSoonTools: user?.hideComingSoonTools ?? false,
    toolOrder: toToolOrder(user?.toolOrder),
  })
}

export const updateDashboardPreferences = async (req: Request, res: Response) => {
  const { hideComingSoonTools, toolOrder } = req.body as {
    hideComingSoonTools?: boolean
    toolOrder?: string[]
  }

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: {
      ...(hideComingSoonTools !== undefined && { hideComingSoonTools }),
      ...(toolOrder !== undefined && { toolOrder }),
    },
    select: { hideComingSoonTools: true, toolOrder: true },
  })

  return res.json({
    hideComingSoonTools: user.hideComingSoonTools,
    toolOrder: toToolOrder(user.toolOrder),
  })
}
