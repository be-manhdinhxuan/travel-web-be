import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

export const TZ = 'Asia/Ho_Chi_Minh'

// Dayjs object (cho logic cần chain)
export const nowVN = () => dayjs().tz(TZ)

// Date object (cho MongoDB)
export const nowVNDate = () => dayjs().tz(TZ).toDate()

export const toVNDate = (date?: string | Date) => dayjs(date).tz(TZ).toDate()

export const startOfDayVN = (date?: string | Date) => dayjs(date).tz(TZ).startOf('day').toDate()

export const endOfDayVN = (date?: string | Date) => dayjs(date).tz(TZ).endOf('day').toDate()
