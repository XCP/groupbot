import { fetchAddressAssetRows, reduceBalance, parseToAtomic } from './counterparty';
import { db } from '@/src/db/prisma';

export async function getPolicyForChat(chatId: string) {
  try {
    return await db.policy.findUnique({ 
      where: { chatId } 
    });
  } catch (error) {
    console.error('Database not connected:', error);
    // Return mock policy for testing without database
    return null;
  }
}

export async function passesTokenPolicy(
  address: string, 
  cfg: {
    asset: string; 
    min_amount: string; 
    include_unconfirmed?: boolean;
  }
): Promise<boolean> {
  const rows = await fetchAddressAssetRows(address, cfg.asset, {
    verbose: true,
    show_unconfirmed: !!cfg.include_unconfirmed
  });
  
  const { atomic, decimals } = reduceBalance(rows);
  const minAtomic = parseToAtomic(cfg.min_amount, decimals);
  
  return atomic >= minAtomic;
}