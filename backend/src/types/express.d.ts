import { Role } from '@prisma/client'

// Erweitert den Express Request-Typ
declare global {
  namespace Express {
    export interface Request {
      user?: {
        id: string
        email: string
        name: string
        role: Role
      }
    }
  }
}

export {}
