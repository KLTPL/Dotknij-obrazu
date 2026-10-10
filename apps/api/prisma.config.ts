import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // not env(): `prisma generate` has to work before .env exists
    url: process.env.DATABASE_URL ?? '',
  },
});
