import { nowVNDate } from '~/utils/time'

export const generateBookingCode = async () => {
  const date = nowVNDate()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.random().toString(36).substring(2, 7).toUpperCase()
  return `TL-${dateStr}-${random}`
}
