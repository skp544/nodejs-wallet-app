import { Prisma } from "../../generated/prisma/client";
import { PrismaClient } from "../../generated/prisma/internal/class";
import { ShardId } from "../types/shared-types";
import { getPrismaClient } from "./prisma-client";

export class ConnectionManager {
  // get prisma client for a specific shard (For transactional operations)
  static getClient(shardId: ShardId): PrismaClient {
    return getPrismaClient(shardId);
  }

  async executeTransaction<T>(
    shardId: ShardId,
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    const client = getPrismaClient(shardId);

    return await client.$transaction(fn, {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    });
  }
}

// Repeatable Read: while we're inside a transaction, we're guranted to see the same data across all reads

export const connectionManager = new ConnectionManager();
