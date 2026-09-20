'use client';
import { Trash2 } from 'lucide-react';
import { deleteTransactionAction } from '@/app/actions/transactions';
import { useRouter } from 'next/navigation';

export function DeleteTransactionButton({ transactionId }: { transactionId: number }) {
  const router = useRouter();

  return (
    <button
      onClick={async () => {
        if (window.confirm("Are you sure you want to delete this transaction? Your account balances will be restored.")) {
          await deleteTransactionAction(transactionId);
          router.push('/transactions');
        }
      }}
      className="flex items-center gap-2 text-sm font-medium text-red-500/80 hover:text-red-500 hover:bg-red-500/10 px-4 py-2 rounded-lg transition-colors"
    >
      <Trash2 size={16} />
      Delete Transaction
    </button>
  );
}
