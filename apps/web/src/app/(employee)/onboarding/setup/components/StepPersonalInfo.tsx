'use client';

import {
  Input,
  Label,
  PhoneInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hr-portal/ui';
import type { ReactNode } from 'react';
import { DatePickerField } from './DatePickerField';

const NATIONALITIES = [
  'Filipino',
  'American',
  'British',
  'Canadian',
  'Australian',
  'Japanese',
  'Korean',
  'Chinese',
  'Indian',
  'Other',
];

const RELATIONSHIPS = [
  'Spouse',
  'Parent',
  'Sibling',
  'Child',
  'Grandparent',
  'Friend',
  'Partner',
  'Other Relative',
];

const EDUCATION_LEVELS = [
  'High School',
  'Vocational/Technical',
  "Associate's Degree",
  "Bachelor's Degree",
  "Master's Degree",
  'Doctorate (PhD)',
  'Professional Degree (MD, JD, etc.)',
];

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
    onChange({ ...value, [key]: val });
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div>
        <h3 className="text-sm font-medium mb-3">Basic Information</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">
              First Name <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="firstName"
              value={get('firstName')}
              onChange={(e) => update('firstName', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="middleName">
              Middle Name <span className="text-muted-foreground text-xs">(Optional)</span>
            </Label>
            <Input
              id="middleName"
              value={get('middleName')}
              onChange={(e) => update('middleName', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">
              Last Name <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="lastName"
              value={get('lastName')}
              onChange={(e) => update('lastName', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="position">
              Position <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="position"
              value={get('position')}
              onChange={(e) => update('position', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="birthday">
              Birthday <span className="text-rose-500">*</span>
            </Label>
            <DatePickerField
              id="birthday"
              value={get('birthday')}
              onChange={(nextValue) => update('birthday', nextValue)}
              placeholder="Select your birthday"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nationality">
              Nationality <span className="text-rose-500">*</span>
            </Label>
            <Select value={get('nationality')} onValueChange={(val) => update('nationality', val)}>
              <SelectTrigger id="nationality">
                <SelectValue placeholder="Select nationality" />
              </SelectTrigger>
              <SelectContent>
                {NATIONALITIES.map((nationality) => (
                  <SelectItem key={nationality} value={nationality}>
                    {nationality}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="education">
              Education Level <span className="text-rose-500">*</span>
            </Label>
            <Select value={get('education')} onValueChange={(val) => update('education', val)}>
              <SelectTrigger id="education">
                <SelectValue placeholder="Select education level" />
              </SelectTrigger>
              <SelectContent>
                {EDUCATION_LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="major">
              Major/Field of Study{' '}
              <span className="text-muted-foreground text-xs">(Optional)</span>
            </Label>
            <Input
              id="major"
              value={get('major')}
              onChange={(e) => update('major', e.target.value)}
              placeholder="e.g., Computer Science, Business"
            />
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div>
        <h3 className="text-sm font-medium mb-3">Contact Information</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="personalEmail">
              Personal Email <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="personalEmail"
              type="email"
              value={get('personalEmail')}
              onChange={(e) => update('personalEmail', e.target.value)}
              placeholder="personal@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactNumber">
              Contact Number <span className="text-rose-500">*</span>
            </Label>
            <PhoneInput
              id="contactNumber"
              value={get('contactNumber')}
              onChange={(val) => update('contactNumber', val)}
              countryCode={get('contactCountryCode') || 'PH'}
              onCountryChange={(code) => update('contactCountryCode', code)}
              placeholder="Enter phone number"
              required
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="streetAddress">
              Street <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="streetAddress"
              value={get('streetAddress')}
              onChange={(e) => update('streetAddress', e.target.value)}
              placeholder="House/Unit, Building, Street"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">
              City <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="city"
              value={get('city')}
              onChange={(e) => update('city', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="province">
              Province <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="province"
              value={get('province')}
              onChange={(e) => update('province', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">
              Country <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="country"
              value={get('country')}
              onChange={(e) => update('country', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zipcode">
              Zipcode <span className="text-muted-foreground text-xs">(Optional)</span>
            </Label>
            <Input
              id="zipcode"
              value={get('zipcode')}
              onChange={(e) => update('zipcode', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      <div>
        <h3 className="text-sm font-medium mb-3">Emergency Contact</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="emergencyContactName">
              Name <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="emergencyContactName"
              value={get('emergencyContactName')}
              onChange={(e) => update('emergencyContactName', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergencyContactRelationship">
              Relationship <span className="text-rose-500">*</span>
            </Label>
            <Select
              value={get('emergencyContactRelationship')}
              onValueChange={(val) => update('emergencyContactRelationship', val)}
            >
              <SelectTrigger id="emergencyContactRelationship">
                <SelectValue placeholder="Select relationship" />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIPS.map((relationship) => (
                  <SelectItem key={relationship} value={relationship}>
                    {relationship}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergencyContactNumber">
              Contact Number <span className="text-rose-500">*</span>
            </Label>
            <PhoneInput
              id="emergencyContactNumber"
              value={get('emergencyContactNumber')}
              onChange={(val) => update('emergencyContactNumber', val)}
              countryCode={get('emergencyContactCountryCode') || 'PH'}
              onCountryChange={(code) => update('emergencyContactCountryCode', code)}
              placeholder="Enter phone number"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergencyContactEmail">
              Email <span className="text-muted-foreground text-xs">(Optional)</span>
            </Label>
            <Input
              id="emergencyContactEmail"
              type="email"
              value={get('emergencyContactEmail')}
              onChange={(e) => update('emergencyContactEmail', e.target.value)}
              placeholder="emergency@example.com"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
