import { PrismaClient, Prisma } from "../../generated/prisma/client";
import { Transaction, TransactionStatus } from "../types/shared-types";

export class TransactionRepository {
  async create(
    toUser: bigint,
    fromUser: bigint,
    amount: bigint,
    idempotencyKey: string,
    tx: Prisma.TransactionClient,
  ): Promise<Transaction> {
    const transactionEntity = await tx.transaction.create({
      data: {
        to_user: toUser,
        from_user: fromUser,
        amount: amount,
        status: TransactionStatus.PENDING,
        idempotency_key: idempotencyKey,
      },
    });

    return this.mapToTransaction(transactionEntity);
  }

  async findById(
    transactionId: bigint,
    tx: PrismaClient | Prisma.TransactionClient,
  ): Promise<Transaction | null> {
    const transactionEntity = await tx.transaction.findUnique({
      where: { id: transactionId },
    });

    return transactionEntity ? this.mapToTransaction(transactionEntity) : null;
  }

  async findByIdempotencyKey(
    idempotencyKey: string,
    tx: PrismaClient | Prisma.TransactionClient,
  ): Promise<Transaction | null> {
    const transactionEntity = await tx.transaction.findUnique({
      where: { idempotency_key: idempotencyKey },
    });

    return transactionEntity ? this.mapToTransaction(transactionEntity) : null;
  }

  async updateStatus(
    transactionId: bigint,
    status: TransactionStatus,
    tx: Prisma.TransactionClient,
  ): Promise<Transaction> {
    const transactionEntity = await tx.transaction.update({
      where: { id: transactionId },
      data: { status: status },
    });

    return this.mapToTransaction(transactionEntity);
  }

  // get the transaction history for a user
  // check both shards since a user can be sender and receiver
  async getHistory(
    userId: bigint,
    client1: PrismaClient,
    client2: PrismaClient,
  ): Promise<Transaction[]> {
    const [transactions1, transactions2] = await Promise.all([
      client1.transaction.findMany({
        where: {
          OR: [{ from_user: userId }, { to_user: userId }],
        },
        orderBy: {
          created_at: "desc",
        },
      }),
      client2.transaction.findMany({
        where: {
          OR: [{ from_user: userId }, { to_user: userId }],
        },
        orderBy: {
          created_at: "desc",
        },
      }),
    ]);

    const allTransactions = [...transactions1, ...transactions2].map((entity) =>
      this.mapToTransaction(entity),
    );

    return allTransactions.sort(
      (a, b) => b.created_at.getTime() - a.created_at.getTime(),
    );
  }

  private mapToTransaction(entity: {
    id: bigint;
    from_user: bigint;
    to_user: bigint;
    amount: bigint;
    status: TransactionStatus;
    idempotency_key: string;
    created_at: Date;
  }): Transaction {
    const status = entity.status as TransactionStatus;
    return {
      id: entity.id,
      from_user: entity.from_user,
      to_user: entity.to_user,
      amount: entity.amount,
      status: status,
      idempotency_key: entity.idempotency_key,
      created_at: entity.created_at,
    };
  }
}
