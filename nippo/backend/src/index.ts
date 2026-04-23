import express, { NextFunction, Request, Response } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

import { prisma } from './lib/prisma.js'
import authRouter from './routes/auth.js'

const app = express()
const port = process.env.PORT ?? 3000

app.use(cors())
app.use(express.json())

app.use('/v1/auth', authRouter)

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ok', db: 'connected' })
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' })
  }
})

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err)
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'サーバーエラーが発生しました' },
  })
})

app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})
