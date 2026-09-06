export interface CreateWalletDTO {
  userId: number;
}

export interface AddMoneyDTO {
  userId: number;
  amount: number;
  transactionId: number;
}

export interface WalletResponseDTO {
  id: string;
  userId: string;
  balance: string;
  version: number;
  created_at: string;
  updated_at: string;
}

// in JS , JSON. stringify cannot serialize BigInt directly
// so , response convert bigint fields to strings
