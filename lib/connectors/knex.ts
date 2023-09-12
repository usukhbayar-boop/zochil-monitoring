import knex from 'knex';
import { parse } from 'pg-connection-string';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL not configured in .env file.');
}

if (!process.env.DATABASE_READONLY_URL) {
  throw new Error('DATABASE_READONLY_URL not configured in .env file.');
}

if (!process.env.DATABASE_CA_FILE) {
  throw new Error('DATABASE_CA_FILE not configured in .env file.');
}

let ca = process.env.DATABASE_CA_FILE || "";

if(process.env.NODE_ENV !== "") {
  ca = process.env.DATABASE_CA_FILE_DEV || "";
}

export const db = knex({
  client: 'pg',
  pool: {
    min: parseInt(process.env.DB_POOL_COUNT_MIN || "5", 10),
    max: parseInt(process.env.DB_POOL_COUNT_MAX || "30", 10),
  },
  connection: Object.assign({}, parse(process.env.DATABASE_URL), { ssl: {
    ca,
    rejectUnauthorized: false,
  }}) as any,
  // connection: Object.assign({}, parse(process.env.DATABASE_URL)) as any,
});

export const db_readonly = knex({
  client: 'pg',
  pool: {
    min: parseInt(process.env.DB_POOL_COUNT_MIN || "5", 10),
    max: parseInt(process.env.DB_POOL_COUNT_MAX || "30", 10),
  },
  connection: Object.assign({}, parse(process.env.DATABASE_READONLY_URL), { ssl: {
    ca,
    rejectUnauthorized: false,
  }}) as any,
  // connection: Object.assign({}, parse(process.env.DATABASE_READONLY_URL)) as any,
});
