// Erweitert den Express Request-Typ
declare namespace Express {
  export interface Request {
    userId?: string
  }
}
