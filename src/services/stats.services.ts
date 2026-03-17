import { PaymentStatus } from '~/constants/enums'
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

// helper tính % tăng giảm
const calcGrowth = (current: number, previous: number) => {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

class StatsService {
  async getOverviewStats(period: string) {
    const { current, previous } = getPeriodRange(period)

    // doanh thu — chỉ tính booking confirmed/completed
    const [current_revenue, previous_revenue, current_bookings, previous_bookings, current_users, previous_users] =
      await Promise.all([
        // doanh thu kỳ hiện tại
        databaseServices.payments
          .aggregate([
            {
              $match: {
                status: PaymentStatus.Success,
                paid_at: { $gte: current.from, $lte: current.to }
              }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ])
          .toArray()
          .then((r) => r[0]?.total || 0),

        // doanh thu kỳ trước
        databaseServices.payments
          .aggregate([
            {
              $match: {
                status: PaymentStatus.Success,
                paid_at: { $gte: previous.from, $lte: previous.to }
              }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ])
          .toArray()
          .then((r) => r[0]?.total || 0),

        // booking kỳ hiện tại
        databaseServices.bookings.countDocuments({
          created_at: { $gte: current.from, $lte: current.to }
        }),

        // booking kỳ trước
        databaseServices.bookings.countDocuments({
          created_at: { $gte: previous.from, $lte: previous.to }
        }),

        // user mới kỳ hiện tại
        databaseServices.users.countDocuments({
          created_at: { $gte: current.from, $lte: current.to }
        }),

        // user mới kỳ trước
        databaseServices.users.countDocuments({
          created_at: { $gte: previous.from, $lte: previous.to }
        })
      ])

    return {
      total_revenue: current_revenue,
      total_bookings: current_bookings,
      new_users: current_users,
      comparison_with_previous: {
        revenue_growth: calcGrowth(current_revenue, previous_revenue),
        bookings_growth: calcGrowth(current_bookings, previous_bookings),
        users_growth: calcGrowth(current_users, previous_users)
      }
    }
  }
}

const statsService = new StatsService()

export default statsService
