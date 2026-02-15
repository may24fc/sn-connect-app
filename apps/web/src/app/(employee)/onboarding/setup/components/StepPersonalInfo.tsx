'use client';

import { Input, Label } from '@hr-portal/ui';
import type { ReactNode } from 'react';

export function StepPersonalInfo({
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
        <Label htmlFor="firstName">First Name</Label>
        <Input
          id="firstName"
          value={get('firstName')}
          onChange={(e) => update('firstName', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="middleName">Middle Name</Label>
        <Input
          id="middleName"
          value={get('middleName')}
          onChange={(e) => update('middleName', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lastName">Last Name</Label>
        <Input
          id="lastName"
          value={get('lastName')}
          onChange={(e) => update('lastName', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="position">Position</Label>
        <Input
          id="position"
          value={get('position')}
          onChange={(e) => update('position', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="emailAddress">Email Address</Label>
        <Input
          id="emailAddress"
          type="email"
          value={get('emailAddress')}
          onChange={(e) => update('emailAddress', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contactNumber">Contact Number</Label>
        <Input
          id="contactNumber"
          value={get('contactNumber')}
          onChange={(e) => update('contactNumber', e.target.value)}
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          value={get('address')}
          onChange={(e) => update('address', e.target.value)}
        />
      </div>
    </div>
  );
}
