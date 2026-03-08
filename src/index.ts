import express from 'express'
import { config } from 'dotenv'
import databaseService from './services/database.services'
import authsRouter from './routes/auths.routes'
import { defaultErrorHandler } from './middlewares/error.middlerwares'
import cors from 'cors'

config()
databaseService.connect()
const app = express()
const port = process.env.PORT || 5000

app.use(cors())
app.use(express.json())
// Auth
app.use('/api/auths', authsRouter)

app.use(defaultErrorHandler)

app.listen(port, () => {
  console.log(`Server đang chạy ở cổng ${port}`)
})
