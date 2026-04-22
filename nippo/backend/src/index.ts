import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

import { prisma } from './lib/prisma.js'

const app = express()
const port = process.env.PORT ?? 3000

app.use(cors())
app.use(express.json())

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ok', db: 'connected' })
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' })
  }
})

app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})
