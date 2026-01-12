import { defineConfig } from '@prisma/internals';

  datasource: {
    provider: 'sqlite',
    url: process.env.DATABASE_URL,
  },
});
