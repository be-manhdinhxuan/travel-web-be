import { Request, Response, NextFunction } from 'express'
import { pick } from 'lodash'
type FilterKeys<T> = Array<keyof T>

export const checkAllowedFields = (allowed: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const fields = Object.keys(req.body)

    const invalid = fields.filter((field) => !allowed.includes(field))

    if (invalid.length > 0) {
      return res.status(400).json({
        message: `Invalid fields: ${invalid.join(', ')}`
      })
    }

    next()
  }
}

export const filterMiddleware =
  <T>(filterKeys: FilterKeys<T>) =>
  (req: Request, res: Response, next: NextFunction) => {
    req.body = pick(req.body, filterKeys)
    next()
  }
