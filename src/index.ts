import express from 'express'
import { config } from 'dotenv'
import databaseService from './services/database.services'
import authsRouter from './routes/auths.routes'
import { defaultErrorHandler } from './middlewares/error.middlerwares'
import cors from 'cors'
import usersRouter from './routes/users.routes'
import categoriesRouter from './routes/categories.routes'

config()
databaseService.connect()
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

app.use(defaultErrorHandler)

app.listen(port, () => {
  console.log(`Server đang chạy ở cổng ${port}`)
})
