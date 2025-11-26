import { Injectable, Logger } from '@nestjs/common'
import { Pool } from 'pg'

@Injectable()
export class PostgresService {
  private readonly logger = new Logger(PostgresService.name)
  private pool: Pool | null = null

  constructor() {
    const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL
    if (!connectionString) {
      this.logger.error('DATABASE_URL/SUPABASE_DB_URL não configurado. SQL direto indisponível.')
    } else {
      this.pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
      this.logger.log('Pool Postgres inicializado para SQL direto')
    }
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<{ rows: T[] }> {
    if (!this.pool) {
      throw new Error('Pool Postgres não inicializado')
    }
    const client = await this.pool.connect()
    try {
      const res = await client.query(sql, params)
      return { rows: res.rows as T[] }
    } finally {
      client.release()
    }
  }
}

