import { AddressAssetRow } from '@/src/types';

const API = process.env.XCP_API_BASE || 'https://api.counterparty.io:4000';

export async function fetchAddressAssetRows(
  address: string, 
  asset: string, 
  opts?: { 
    verbose?: boolean; 
    show_unconfirmed?: boolean; 
  }
): Promise<AddressAssetRow[]> {
  const url = new URL(`${API}/addresses/${address}/balances/${asset}`);
  if (opts?.verbose) url.searchParams.set('verbose', '1');
  if (opts?.show_unconfirmed) url.searchParams.set('show_unconfirmed', '1');
  
  const r = await fetch(url);
  if (!r.ok) throw new Error(`XCP API ${r.status}`);
  
  const data = await r.json() as { result?: AddressAssetRow[] };
  return data.result ?? [];
}

export function reduceBalance(rows: AddressAssetRow[]) {
  let atomic = BigInt(0);
  let divisible = rows[0]?.asset_info?.divisible ?? true;
  
  for (const row of rows) {
    const q = typeof row.quantity === 'string' 
      ? BigInt(row.quantity) 
      : BigInt(row.quantity ?? 0);
    atomic += q;
    if (row.asset_info?.divisible === false) divisible = false;
  }
  
  const decimals = divisible ? 8 : 0;
  return { atomic, decimals };
}

export function parseToAtomic(normalized: string, decimals: number): bigint {
  const [h='0', t=''] = normalized.split('.');
  const frac = (t + '0'.repeat(decimals)).slice(0, decimals);
  return BigInt(h) * BigInt(10 ** decimals) + BigInt(frac || '0');
}