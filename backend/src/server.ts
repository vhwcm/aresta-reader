import express from 'express'
import cors from 'cors'
import path from 'path'
import { bookRouter } from './routes/book.routes'
import { userBookRouter } from './routes/userBook.routes'
import { syncRouter } from './routes/sync.routes'

const app = express()
const PORT = process.env.PORT ?? 3003
const STORAGE_PATH = process.env.STORAGE_PATH ?? './storage'

app.use(cors())
app.use(express.json())
app.use('/storage', express.static(path.resolve(STORAGE_PATH)))

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'aresta-reader', port: PORT }))

app.use('/api/books', bookRouter)
app.use('/api/user-books', userBookRouter)
app.use('/api/sync', syncRouter)

app.listen(PORT, () => {
  console.log(`[aresta-reader] Running on http://localhost:${PORT}`)
})

export default app
