import express from 'express'
import { config } from 'dotenv'
import databaseService from './services/database.services'
import authsRouter from './routes/auths.routes'
import { defaultErrorHandler } from './middlewares/error.middlerwares'
import cors from 'cors'
import usersRouter from './routes/users.routes'
import categoriesRouter from './routes/categories.routes'
import toursRouter from './routes/tours.routes'
import schedulesRouter from './routes/schedules.routes'
import bookingsRouter from './routes/bookings.routes'
import paymentsRouter from './routes/payments.routes'
import bookingExpiryJob from './jobs/booking-expiry.job'
import couponsRouter from './routes/coupons.routes'

config()
databaseService.connect()
bookingExpiryJob.start()
const app = express()
const port = process.env.PORT || 5000

app.use(cors())
app.use(express.json())
// Auth
app.use('/api/auths', authsRouter)

// User
app.use('/api/users', usersRouter)

// Category
app.use('/api/categories', categoriesRouter)

// Tour
app.use('/api/tours', toursRouter)

// Schedule
app.use('/api/schedules', schedulesRouter)

// Booking
app.use('/api/bookings', bookingsRouter)

// Payment
app.use('/api/payments', paymentsRouter)

// Coupon
app.use('/api/coupons', couponsRouter)

app.use(defaultErrorHandler)

app.listen(port, () => {
  console.log(`Server đang chạy ở cổng ${port}`)
})
