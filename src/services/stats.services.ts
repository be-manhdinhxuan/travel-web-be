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

// helper tính % tăng giảm
const calcGrowth = (current: number, previous: number) => {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

class StatsService {
  async getOverviewStats(period: string) {
    const { current, previous } = getPeriodRange(period)

    const [
      current_revenue,
      previous_revenue,
      current_bookings,
      current_cancelled,
      previous_bookings,
      previous_cancelled,
      current_users,
      previous_users,
      revenueByDate,
      bookingStats
    ] = await Promise.all([
      // ===== DOANH THU =====
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

      // ===== BOOKING =====
      databaseServices.bookings.countDocuments({
        created_at: { $gte: current.from, $lte: current.to },
        status: { $in: [BookingStatus.Confirmed, BookingStatus.Completed] }
      }),

      databaseServices.bookings.countDocuments({
        created_at: { $gte: current.from, $lte: current.to },
        status: BookingStatus.Cancelled
      }),

      databaseServices.bookings.countDocuments({
        created_at: { $gte: previous.from, $lte: previous.to },
        status: { $in: [BookingStatus.Confirmed, BookingStatus.Completed] }
      }),

      databaseServices.bookings.countDocuments({
        created_at: { $gte: previous.from, $lte: previous.to },
        status: BookingStatus.Cancelled
      }),

      // ===== USERS =====
      databaseServices.users.countDocuments({
        created_at: { $gte: current.from, $lte: current.to }
      }),

      databaseServices.users.countDocuments({
        created_at: { $gte: previous.from, $lte: previous.to }
      }),

      // ===== CHART: REVENUE =====
      databaseServices.payments
        .aggregate([
          {
            $match: {
              status: PaymentStatus.Success,
              paid_at: { $gte: current.from, $lte: current.to }
            }
          },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$paid_at' }
              },
              total: { $sum: '$amount' }
            }
          },
          { $sort: { _id: 1 } }
        ])
        .toArray(),

      // ===== CHART: BOOKING =====
      databaseServices.bookings
        .aggregate([
          {
            $match: {
              created_at: { $gte: current.from, $lte: current.to }
            }
          },
          {
            $group: {
              _id: {
                date: {
                  $dateToString: { format: '%Y-%m-%d', date: '$created_at' }
                },
                status: '$status'
              },
              count: { $sum: 1 }
            }
          }
        ])
        .toArray()
    ])

    // ===== TỶ LỆ HUỶ =====
    const current_total = current_bookings + current_cancelled
    const previous_total = previous_bookings + previous_cancelled

    const current_cancellation_rate = current_total === 0 ? 0 : (current_cancelled / current_total) * 100

    const previous_cancellation_rate = previous_total === 0 ? 0 : (previous_cancelled / previous_total) * 100

    // ===== BUILD CHART DATA =====

    // labels (ngày)
    const labels = revenueByDate.map((i) => i._id)

    const revenues = revenueByDate.map((i) => i.total)

    const bookingsMap: Record<string, number> = {}
    const cancelledMap: Record<string, number> = {}

    bookingStats.forEach((i) => {
      const date = i._id.date

      if (i._id.status === BookingStatus.Cancelled) {
        cancelledMap[date] = i.count
      } else {
        bookingsMap[date] = (bookingsMap[date] || 0) + i.count
      }
    })

    const bookings = labels.map((d) => bookingsMap[d] || 0)
    const cancelled = labels.map((d) => cancelledMap[d] || 0)

    // ===== RETURN =====
    return {
      total_revenue: current_revenue,
      total_bookings: current_bookings,
      cancelled_bookings: current_cancelled,
      cancellation_rate: Number(current_cancellation_rate.toFixed(2)),
      new_users: current_users,

      // CHART DATA
      chart: {
        labels,
        revenues,
        bookings,
        cancelled
      },

      comparison_with_previous: {
        revenue_growth: calcGrowth(current_revenue, previous_revenue),
        bookings_growth: calcGrowth(current_bookings, previous_bookings),
        users_growth: calcGrowth(current_users, previous_users),
        cancellation_rate_growth: calcGrowth(current_cancellation_rate, previous_cancellation_rate)
      }
    }
  }

  async getRevenueStats(period: string, year?: number) {
    const now = new Date()
    const currentYear = year || now.getFullYear()

    let pipeline: object[] = []

    if (period === 'week') {
      // 7 ngày gần nhất, group theo ngày
      const from = new Date(now)
      from.setDate(from.getDate() - 6)
      from.setHours(0, 0, 0, 0)

      pipeline = [
        {
          $match: {
            status: PaymentStatus.Success,
            paid_at: { $gte: from, $lte: now }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$paid_at' }
            },
            revenue: { $sum: '$amount' },
            bookings: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            _id: 0,
            date: '$_id',
            revenue: 1,
            bookings: 1
          }
        }
      ]
    } else if (period === 'month') {
      // theo tháng trong năm
      pipeline = [
        {
          $match: {
            status: PaymentStatus.Success,
            paid_at: {
              $gte: new Date(currentYear, 0, 1),
              $lte: new Date(currentYear, 11, 31, 23, 59, 59)
            }
          }
        },
        {
          $group: {
            _id: { $month: '$paid_at' },
            revenue: { $sum: '$amount' },
            bookings: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            _id: 0,
            date: {
              $concat: [
                currentYear.toString(),
                '-',
                {
                  $cond: {
                    if: { $lt: ['$_id', 10] },
                    then: { $concat: ['0', { $toString: '$_id' }] },
                    else: { $toString: '$_id' }
                  }
                }
              ]
            },
            revenue: 1,
            bookings: 1
          }
        }
      ]
    } else if (period === 'year') {
      // 5 năm gần nhất, group theo năm
      const fromYear = currentYear - 4

      pipeline = [
        {
          $match: {
            status: PaymentStatus.Success,
            paid_at: {
              $gte: new Date(fromYear, 0, 1),
              $lte: now
            }
          }
        },
        {
          $group: {
            _id: { $year: '$paid_at' },
            revenue: { $sum: '$amount' },
            bookings: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            _id: 0,
            date: { $toString: '$_id' },
            revenue: 1,
            bookings: 1
          }
        }
      ]
    }

    const chart_data = await databaseServices.payments.aggregate(pipeline).toArray()

    return { chart_data }
  }

  async getTopToursStats(period: string, limit: number) {
    const now = new Date()
    let from = new Date()

    if (period === 'week') {
      from.setDate(now.getDate() - 7)
    } else if (period === 'month') {
      from = new Date(now.getFullYear(), now.getMonth(), 1)
    } else if (period === 'year') {
      from = new Date(now.getFullYear(), 0, 1)
    }

    const tours = await databaseServices.bookings
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
            tour_name: { $first: '$tour_snapshot.tour_name' },
            booking_count: { $sum: 1 },
            revenue: { $sum: '$final_price' }
          }
        },
        { $sort: { booking_count: -1 } },
        { $limit: limit },
        {
          $project: {
            _id: 0,
            tour_id: '$_id',
            name: '$tour_name',
            booking_count: 1,
            revenue: 1
          }
        }
      ])
      .toArray()

    return { tours }
  }
}

const statsService = new StatsService()

export default statsService
