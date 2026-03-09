import { Request, Response, NextFunction } from 'express'

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
