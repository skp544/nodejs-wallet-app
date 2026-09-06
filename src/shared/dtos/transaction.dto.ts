export interface TransferDTO {
  fromUser: number;
  toUser: number;
  amount: number;
  idempotencyKey?: string;
}

export interface TransactionResponseDTO {
  id: string;
  fromUser: string;
  toUser: string;
  amount: string;
  status: string;
  idempotencyKey: string;
  created_at: string;
}

// in JS, JSON.stringify cannot serialize BigInt directly
// so, response converts bigint fields to strings
