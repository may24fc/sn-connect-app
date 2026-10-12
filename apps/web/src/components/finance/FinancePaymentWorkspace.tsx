'use client';

import { useState } from 'react';
import { FinanceInvoiceRegister } from './FinanceInvoiceRegister';
import { FinanceWiseBatches } from './FinanceWiseBatches';

export function FinancePaymentWorkspace({ queueKey }: { queueKey: string }) {
  const [hideAmounts, setHideAmounts] = useState(false);
  return (
    <>
      <FinanceWiseBatches key={queueKey} hideAmounts={hideAmounts} />
      <FinanceInvoiceRegister
        hiddenAmounts={hideAmounts}
        onToggleAmounts={() => setHideAmounts((hidden) => !hidden)}
      />
    </>
  );
}
