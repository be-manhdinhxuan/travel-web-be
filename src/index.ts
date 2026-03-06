import express from 'express'
import { config } from 'dotenv'
const app = express()
config()
const port = process.env.PORT || 4000

app.listen(port, () => {
  console.log(`Server đang chạy ở cổng ${port}`)
})
