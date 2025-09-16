export interface NoncePayload {
  tgId: string;
  chatId: string;
  policyId?: string;
}

export interface VerifyRequest {
  tg_id: string;
  chat_id: string;
  policy_id?: string;
  address: string;
  message: string;
  signature: string;
  manual?: boolean;
}

export interface PolicyConfig {
  type: 'basic' | 'token';
  asset?: string;
  minAmount?: string;
  includeUnconfirmed?: boolean;
  recheckEvery?: string;
  onFail?: 'restrict' | 'soft_kick';
}

export interface AddressAssetRow {
  address: string;
  asset: string;
  quantity: string | number;
  asset_info?: { divisible: boolean };
  quantity_normalized?: string;
}