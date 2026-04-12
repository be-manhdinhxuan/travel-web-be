import { BookingStatus, PaymentStatus } from '~/constants/enums'
import databaseServices from './database.services'

// helper tính khoảng thời gian
const getPeriodRange = (period: string) => {
  const now = new Date()
  const current = { from: new Date(), to: new Date(now) }
  const previous = { from: new Date(), to: new Date() }

  if (period === 'today') {
    current.from = new Date(now.setHours(0, 0, 0, 0))
    previous.from = new Date(current.from)
    previous.from.setDate(previous.from.getDate() - 1)
    previous.to = new Date(current.from)
    previous.to.setMilliseconds(-1)
  } else if (period === 'week') {
    current.from = new Date(now)
    current.from.setDate(now.getDate() - 7)
    previous.from = new Date(current.from)
    previous.from.setDate(previous.from.getDate() - 7)
    previous.to = new Date(current.from)
    previous.to.setMilliseconds(-1)
  } else if (period === 'month') {
    current.from = new Date(now.getFullYear(), now.getMonth(), 1)
    previous.from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    previous.to = new Date(current.from)
    previous.to.setMilliseconds(-1)
  } else if (period === 'year') {
    current.from = new Date(now.getFullYear(), 0, 1)
    previous.from = new Date(now.getFullYear() - 1, 0, 1)
    previous.to = new Date(current.from)
    previous.to.setMilliseconds(-1)
  }

  return { current, previous }
}

function fillMissingDates(data: any[], days: number) {
  const map = new Map(data.map((item) => [item.date, item]))

  const result: any[] = []
  const today = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)

    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`

    const existing = map.get(dateStr)

    result.push({
      date: dateStr,
      revenue: existing?.revenue || 0,
      refunds: existing?.refunds || 0,
      refund_pending: existing?.refund_pending || 0,
      bookings: existing?.bookings || 0,
      cancelled: existing?.cancelled || 0,
      net_revenue: existing?.net_revenue || 0
    })
  }

  return result
}

function fillMissingMonths(data: any[], year: number) {
  const map = new Map(data.map((item) => [item.date, item]))

  const result: any[] = []

  for (let m = 1; m <= 12; m++) {
    const monthStr = String(m).padStart(2, '0')
    const dateStr = `${year}-${monthStr}`

    const existing = map.get(dateStr)

    result.push({
      date: dateStr,
      revenue: existing?.revenue || 0,
      refunds: existing?.refunds || 0,
      refund_pending: existing?.refund_pending || 0,
      bookings: existing?.bookings || 0,
      cancelled: existing?.cancelled || 0,
      net_revenue: existing?.net_revenue || 0
    })
  }

  return result
}

function fillMissingYears(data: any[]) {
  const map = new Map(data.map((item) => [item.date, item]))

  const result: any[] = []
  const currentYear = new Date().getFullYear()

  const fromYear = currentYear - 4

  for (let y = fromYear; y <= currentYear; y++) {
    const yearStr = String(y)

    const existing = map.get(yearStr)

    result.push({
      date: yearStr,
      revenue: existing?.revenue || 0,
      refunds: existing?.refunds || 0,
      refund_pending: existing?.refund_pending || 0,
      bookings: existing?.bookings || 0,
      cancelled: existing?.cancelled || 0,
      net_revenue: existing?.net_revenue || 0
    })
  }

  return result
}

class StatsService {
  async getOverviewStats(period: string) {
    const { from, to } = getPeriodRange(period).current

    const [revenue, refund, bookings, cancelled, new_users] = await Promise.all([
      // revenue
      databaseServices.payments
        .aggregate([
          {
            $match: {
              status: PaymentStatus.Success,
              paid_at: { $gte: from, $lte: to }
            }
          },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ])
        .toArray()
        .then((r) => r[0]?.total || 0),

      // refund
      databaseServices.payments
        .aggregate([
          {
            $match: {
              status: PaymentStatus.Refunded,
              updated_at: { $gte: from, $lte: to }
            }
          },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ])
        .toArray()
        .then((r) => r[0]?.total || 0),

      // bookings success
      databaseServices.bookings.countDocuments({
        created_at: { $gte: from, $lte: to },
        status: { $in: [BookingStatus.Confirmed, BookingStatus.Completed] }
      }),

      // cancelled
      databaseServices.bookings.countDocuments({
        updated_at: { $gte: from, $lte: to },
        status: BookingStatus.Cancelled
      }),

      // users
      databaseServices.users.countDocuments({
        created_at: { $gte: from, $lte: to }
      })
    ])

    // calc
    const total = bookings + cancelled
    const cancel_rate = total === 0 ? 0 : (cancelled / total) * 100

    const net_revenue = revenue - refund

    return {
      revenue,
      refund,
      net_revenue,
      bookings,
      new_users,
      cancel_rate: Number(cancel_rate.toFixed(2))
    }
  }

  async getRevenueStats(period: string, year?: number) {
    const now = new Date()
    const currentYear = year || now.getFullYear()

    // Config dynamic for each period
    const buildConfig = () => {
      let matchRange: any
      let paymentGroupId: any
      let bookingGroupId: any

      if (period === 'today' || period === 'week') {
        const start = new Date()
        if (period === 'today') {
          start.setHours(0, 0, 0, 0)
        } else {
          start.setDate(now.getDate() - 6)
          start.setHours(0, 0, 0, 0)
        }

        matchRange = { $gte: start, $lte: now }

        paymentGroupId = {
          $dateToString: {
            format: '%Y-%m-%d',
            date: {
              $cond: [{ $eq: ['$status', PaymentStatus.Success] }, '$paid_at', '$updated_at']
            }
          }
        }

        bookingGroupId = {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$updated_at'
          }
        }
      }

      if (period === 'month') {
        matchRange = {
          $gte: new Date(currentYear, 0, 1),
          $lte: new Date(currentYear, 11, 31, 23, 59, 59)
        }

        paymentGroupId = {
          $month: {
            $cond: [{ $eq: ['$status', PaymentStatus.Success] }, '$paid_at', '$updated_at']
          }
        }

        bookingGroupId = { $month: '$updated_at' }
      }

      if (period === 'year') {
        const fromYear = currentYear - 4

        matchRange = {
          $gte: new Date(fromYear, 0, 1),
          $lte: now
        }

        paymentGroupId = {
          $year: {
            $cond: [{ $eq: ['$status', PaymentStatus.Success] }, '$paid_at', '$updated_at']
          }
        }

        bookingGroupId = { $year: '$updated_at' }
      }

      return { matchRange, paymentGroupId, bookingGroupId }
    }

    const { matchRange, paymentGroupId, bookingGroupId } = buildConfig()

    // AGGREGATE PAYMENTS
    const paymentsRaw = await databaseServices.payments
      .aggregate([
        {
          $match: {
            status: {
              $in: [PaymentStatus.Success, PaymentStatus.Refunded, PaymentStatus.Refunded_Pending]
            },
            $or: [{ paid_at: matchRange }, { updated_at: matchRange }]
          }
        },
        {
          $group: {
            _id: paymentGroupId,

            revenue: {
              $sum: {
                $cond: [{ $eq: ['$status', PaymentStatus.Success] }, '$amount', 0]
              }
            },

            refunds: {
              $sum: {
                $cond: [{ $eq: ['$status', PaymentStatus.Refunded] }, '$amount', 0]
              }
            },

            refund_pending: {
              $sum: {
                $cond: [{ $eq: ['$status', PaymentStatus.Refunded_Pending] }, '$amount', 0]
              }
            },

            bookings: {
              $sum: {
                $cond: [{ $eq: ['$status', PaymentStatus.Success] }, 1, 0]
              }
            }
          }
        }
      ])
      .toArray()

    // AGGREGATE CANCELLED BOOKINGS
    const cancelledRaw = await databaseServices.bookings
      .aggregate([
        {
          $match: {
            status: BookingStatus.Cancelled,
            updated_at: matchRange
          }
        },
        {
          $group: {
            _id: bookingGroupId,
            cancelled: { $sum: 1 }
          }
        }
      ])
      .toArray()

    // FORMAT MAP KEY
    const formatKey = (id: any) => {
      if (period === 'month') {
        return `${currentYear}-${String(id).padStart(2, '0')}`
      }
      if (period === 'year') {
        return String(id)
      }
      return String(id)
    }

    const paymentMap = new Map(paymentsRaw.map((i) => [formatKey(i._id), i]))

    const cancelledMap = new Map(cancelledRaw.map((i) => [formatKey(i._id), i.cancelled]))

    // MERGE DATA
    const allKeys = new Set([...paymentMap.keys(), ...cancelledMap.keys()])

    const merged = Array.from(allKeys)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      .map((date) => {
        const p = paymentMap.get(date)

        return {
          date,
          revenue: p?.revenue || 0,
          refunds: p?.refunds || 0,
          refund_pending: p?.refund_pending || 0,
          bookings: p?.bookings || 0,
          cancelled: cancelledMap.get(date) || 0,
          net_revenue: (p?.revenue || 0) - (p?.refunds || 0)
        }
      })

    // FILL MISSING DATES
    if (period === 'week') {
      return { chart_data: fillMissingDates(merged, 7) }
    }

    if (period === 'month') {
      return { chart_data: fillMissingMonths(merged, currentYear) }
    }

    if (period === 'year') {
      return { chart_data: fillMissingYears(merged) }
    }

    return { chart_data: merged }
  }

  async getTopToursStats(period: string, limit: number) {
    const now = new Date()

    // Build dynamic from date based on period
    const buildFromDate = () => {
      if (period === 'week') {
        const d = new Date(now)
        d.setDate(now.getDate() - 6)
        d.setHours(0, 0, 0, 0)
        return d
      }

      if (period === 'month') {
        return new Date(now.getFullYear(), now.getMonth(), 1)
      }

      if (period === 'year') {
        return new Date(now.getFullYear(), 0, 1)
      }

      return new Date(0)
    }

    const from = buildFromDate()

    // AGGREGATE TOURS
    const toursRaw = await databaseServices.bookings
      .aggregate([
        {
          $match: {
            status: { $in: [BookingStatus.Confirmed, BookingStatus.Completed] },
            created_at: { $gte: from, $lte: now }
          }
        },

        {
          $group: {
            _id: '$tour_snapshot.tour_id',
            name: { $first: '$tour_snapshot.tour_name' },
            booking_count: { $sum: 1 },
            revenue: { $sum: '$final_price' }
          }
        }
      ])
      .toArray()

    // Calc total revenue for percent calculation
    const totalRevenue = toursRaw.reduce((sum, t) => sum + t.revenue, 0)

    // Sort, limit and map result
    const result = toursRaw
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit)
      .map((t) => ({
        tour_id: t._id,
        name: t.name,
        booking_count: t.booking_count,
        revenue: t.revenue,

        percent: totalRevenue === 0 ? 0 : Number(((t.revenue / totalRevenue) * 100).toFixed(2))
      }))

    return { tours: result }
  }
}

const statsService = new StatsService()

export default statsService
