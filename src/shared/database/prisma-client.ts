import { ShardId } from "../types/shared-types";
import { PrismaClient } from "../../generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { logger } from "../config/logger";
// creating separate prisma client for each shard using driver adapters
// each client manages it's own connection pool via MariaDB
let shard1Client: PrismaClient | null = null;
let shard2Client: PrismaClient | null = null;

function getShard1AdaptionOption() {
  const url = process.env.DATABASE_SHARD1_URL;

  if (url) {
    try {
      const u = new URL(url);

      return {
        host: u.hostname,
        port: parseInt(u.port || "3306", 10),
        user: u.username,
        password: u.password,
        database: u.pathname.replace(/^\//, "") || "wallet_shard1",
        connectionLimit: 5,
      };
    } catch (err) {
      throw new Error(`Error parsing DATABASE_URL_SHARD_1: ${err}`);
    }
  }

  return {
    host: process.env.DB_SHARD1_HOST || "localhost",
    port: parseInt(process.env.DB_SHARD1_PORT || "3306", 10),
    user: process.env.DB_SHARD1_USER,
    password: process.env.DB_SHARD1_PASSWORD,
    database: process.env.DB_SHARD1_DATABASE || "wallet_shard1",
    connectionLimit: 5,
  };
}

function getShard2AdaptionOption() {
  const url = process.env.DATABASE_SHARD2_URL;

  if (url) {
    try {
      const u = new URL(url);

      return {
        host: u.hostname,
        port: parseInt(u.port || "3306", 10),
        user: u.username,
        password: u.password,
        database: u.pathname.replace(/^\//, "") || "wallet_shard2",
        connectionLimit: 5,
      };
    } catch (err) {
      throw new Error(`Error parsing DATABASE_URL_SHARD_2: ${err}`);
    }
  }

  return {
    host: process.env.DB_SHARD2_HOST || "localhost",
    port: parseInt(process.env.DB_SHARD2_PORT || "3306", 10),
    user: process.env.DB_SHARD2_USER,
    password: process.env.DB_SHARD2_PASSWORD,
    database: process.env.DB_SHARD2_DATABASE || "wallet_shard2",
    connectionLimit: 5,
  };
}

export function getShard1Client(): PrismaClient {
  if (!shard1Client) {
    const adapter = new PrismaMariaDb(getShard1AdaptionOption());
    shard1Client = new PrismaClient({
      adapter,
      log:
        process.env.NODE_ENV === "development"
          ? ["query", "warn", "error"]
          : ["error"],
    });
  }
  return shard1Client;
}

export function getShard2Client(): PrismaClient {
  if (!shard2Client) {
    const adapter = new PrismaMariaDb(getShard2AdaptionOption());
    shard2Client = new PrismaClient({
      adapter,
      log:
        process.env.NODE_ENV === "development"
          ? ["query", "warn", "error"]
          : ["error"],
    });
  }
  return shard2Client;
}

// centralised shard routing : callers should not directly reference
export function getPrismaClient(shardId: ShardId): PrismaClient {
  return shardId == ShardId.SHARD_1 ? getShard1Client() : getShard2Client();
}

export async function closePrismaClients(): Promise<void> {
  if (shard1Client) {
    await shard1Client.$disconnect();
    logger.info("Shard 1 client disconnected");
  }
  if (shard2Client) {
    await shard2Client.$disconnect();
    logger.info("Shard 2 client disconnected");
  }
}
