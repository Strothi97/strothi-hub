import { Request, Response } from 'express'
import { prisma } from '../db'
import { TOOLS } from '../config/tools'

export const listTools = async (req: Request, res: Response) => {
  const isAdmin = req.user!.role === 'ADMIN'

  const grantedKeys = isAdmin
    ? null
    : new Set(
        (
          await prisma.userToolAccess.findMany({
            where: { userId: req.user!.id },
            select: { toolKey: true },
          })
        ).map((access) => access.toolKey),
      )

  const tools = TOOLS.map((tool) => ({
    ...tool,
    hasAccess: isAdmin || (grantedKeys?.has(tool.key) ?? false),
  }))

  res.json({ tools })
}
