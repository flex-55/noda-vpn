import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const defaultDatabaseUrl = `file:${path.resolve(currentDir, "noda.db")}`;

const adapter = new PrismaLibSql({
	url: process.env.DATABASE_URL ?? defaultDatabaseUrl,
});

export const prisma = new PrismaClient({ adapter });
