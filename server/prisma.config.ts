import path from 'path'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  migrate: {
    adapter: async () => {
      const url = process.env.DATABASE_URL
      if (!url) throw new Error('DATABASE_URL is required')
      return { url }
    }
  }
})
