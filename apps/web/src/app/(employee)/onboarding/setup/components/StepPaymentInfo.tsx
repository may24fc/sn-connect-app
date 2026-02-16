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
    onChange({ ...value, [key]: val });
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="paymentAccountName">
          Account Name <span className="text-rose-500">*</span>
        </Label>
        <Input
          id="paymentAccountName"
          value={get('paymentAccountName')}
          onChange={(e) => update('paymentAccountName', e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="paymentAccountNumber">
          Account Number <span className="text-rose-500">*</span>
        </Label>
        <Input
          id="paymentAccountNumber"
          value={get('paymentAccountNumber')}
          onChange={(e) => update('paymentAccountNumber', e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="paymentEmail">
          Payment Email <span className="text-rose-500">*</span>
        </Label>
        <Input
          id="paymentEmail"
          type="email"
          value={get('paymentEmail')}
          onChange={(e) => update('paymentEmail', e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="paymentPhoneNumber">
          Phone Number <span className="text-rose-500">*</span>
        </Label>
        <Input
          id="paymentPhoneNumber"
          type="tel"
          value={get('paymentPhoneNumber')}
          onChange={(e) => update('paymentPhoneNumber', e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="paymentCity">
          City <span className="text-rose-500">*</span>
        </Label>
        <Input
          id="paymentCity"
          value={get('paymentCity')}
          onChange={(e) => update('paymentCity', e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="paymentProvince">
          Province <span className="text-rose-500">*</span>
        </Label>
        <Input
          id="paymentProvince"
          value={get('paymentProvince')}
          onChange={(e) => update('paymentProvince', e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="paymentZipcode">Zipcode (Optional)</Label>
        <Input
          id="paymentZipcode"
          value={get('paymentZipcode')}
          onChange={(e) => update('paymentZipcode', e.target.value)}
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="paymentAddress">
          Address <span className="text-rose-500">*</span>
        </Label>
        <Input
          id="paymentAddress"
          value={get('paymentAddress')}
          onChange={(e) => update('paymentAddress', e.target.value)}
          required
        />
      </div>
    </div>
  );
}
