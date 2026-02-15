'use client';

import { Input, Label } from '@hr-portal/ui';
import type { ReactNode } from 'react';

export function StepPaymentInfo({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}): ReactNode {
  const get = (key: string): string =>
    typeof value[key] === 'string' ? (value[key] as string) : '';

  const update = (key: string, val: string) => {
    onChange({ [key]: val });
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="paymentAccountName">Account Name</Label>
        <Input
          id="paymentAccountName"
          value={get('paymentAccountName')}
          onChange={(e) => update('paymentAccountName', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="paymentAccountNumber">Account Number</Label>
        <Input
          id="paymentAccountNumber"
          value={get('paymentAccountNumber')}
          onChange={(e) => update('paymentAccountNumber', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="paymentEmail">Payment Email</Label>
        <Input
          id="paymentEmail"
          type="email"
          value={get('paymentEmail')}
          onChange={(e) => update('paymentEmail', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="paymentPhoneNumber">Phone Number</Label>
        <Input
          id="paymentPhoneNumber"
          value={get('paymentPhoneNumber')}
          onChange={(e) => update('paymentPhoneNumber', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="paymentCity">City</Label>
        <Input
          id="paymentCity"
          value={get('paymentCity')}
          onChange={(e) => update('paymentCity', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="paymentProvince">Province</Label>
        <Input
          id="paymentProvince"
          value={get('paymentProvince')}
          onChange={(e) => update('paymentProvince', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="paymentZipcode">Zipcode</Label>
        <Input
          id="paymentZipcode"
          value={get('paymentZipcode')}
          onChange={(e) => update('paymentZipcode', e.target.value)}
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="paymentAddress">Address</Label>
        <Input
          id="paymentAddress"
          value={get('paymentAddress')}
          onChange={(e) => update('paymentAddress', e.target.value)}
        />
      </div>
    </div>
  );
}
