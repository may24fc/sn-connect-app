'use client';

import {
  BankSelector,
  Input,
  Label,
  PhoneInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hr-portal/ui';
import type { BankOption } from '@hr-portal/ui';
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

  // Default bank data - in production this would come from the API
  const banks: BankOption[] = [
    { id: 'bdo', bankName: 'BDO Unibank', bankCode: 'BDO', countryCode: 'PH' },
    {
      id: 'bpi',
      bankName: 'BPI (Bank of the Philippine Islands)',
      bankCode: 'BPI',
      countryCode: 'PH',
    },
    { id: 'metrobank', bankName: 'Metrobank', bankCode: 'MBTC', countryCode: 'PH' },
    { id: 'unionbank', bankName: 'UnionBank', bankCode: 'UBP', countryCode: 'PH' },
    { id: 'gcash', bankName: 'GCash', bankCode: 'GCASH', countryCode: 'PH' },
    { id: 'maya', bankName: 'PayMaya / Maya', bankCode: 'MAYA', countryCode: 'PH' },
    { id: 'unicredit', bankName: 'UniCredit', bankCode: 'UCG', countryCode: 'IT' },
    { id: 'intesa', bankName: 'Intesa Sanpaolo', bankCode: 'ISP', countryCode: 'IT' },
    { id: 'cba', bankName: 'Commonwealth Bank', bankCode: 'CBA', countryCode: 'AU' },
    { id: 'westpac', bankName: 'Westpac', bankCode: 'WBC', countryCode: 'AU' },
    { id: 'wise', bankName: 'Wise (TransferWise)', bankCode: 'WISE', countryCode: 'GLOBAL' },
    { id: 'revolut', bankName: 'Revolut', bankCode: 'REVOLUT', countryCode: 'GLOBAL' },
    { id: 'paypal', bankName: 'PayPal', bankCode: 'PAYPAL', countryCode: 'GLOBAL' },
  ];

  const COUNTRIES = [
    { code: 'PH', label: 'Philippines' },
    { code: 'US', label: 'United States' },
    { code: 'IT', label: 'Italy' },
    { code: 'AU', label: 'Australia' },
    { code: 'GB', label: 'United Kingdom' },
    { code: 'DE', label: 'Germany' },
    { code: 'SG', label: 'Singapore' },
  ];

  return (
    <div className="space-y-6">
      {/* Country & Bank Selection */}
      <div>
        <h3 className="text-sm font-medium mb-3">Bank Information</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="paymentCountryCode">
              Country <span className="text-rose-500">*</span>
            </Label>
            <Select
              value={get('paymentCountryCode') || 'PH'}
              onValueChange={(val) => update('paymentCountryCode', val)}
            >
              <SelectTrigger id="paymentCountryCode">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    {country.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="paymentBankId">
              Bank <span className="text-rose-500">*</span>
            </Label>
            <BankSelector
              id="paymentBankId"
              value={get('paymentBankId')}
              onChange={(bankId, bankName) => {
                update('paymentBankId', bankId);
                update('paymentBankName', bankName);
              }}
              banks={banks}
              countryCode={get('paymentCountryCode') || 'PH'}
              customBankName={get('paymentBankName')}
              onCustomBankNameChange={(name) => update('paymentBankName', name)}
              allowOther
              required
            />
          </div>
        </div>
      </div>

      {/* Account Details */}
      <div>
        <h3 className="text-sm font-medium mb-3">Account Details</h3>
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
            <PhoneInput
              id="paymentPhoneNumber"
              value={get('paymentPhoneNumber')}
              onChange={(val) => update('paymentPhoneNumber', val)}
              countryCode={get('paymentPhoneCountryCode') || 'PH'}
              onCountryChange={(code) => update('paymentPhoneCountryCode', code)}
              placeholder="Enter phone number"
              required
            />
          </div>
        </div>
      </div>

      {/* Address */}
      <div>
        <h3 className="text-sm font-medium mb-3">Payment Address</h3>
        <div className="grid gap-4 md:grid-cols-2">
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
      </div>
    </div>
  );
}
