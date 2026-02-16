'use client';

import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hr-portal/ui';
import type { ReactNode } from 'react';

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
            <Label htmlFor="middleName">Middle Name</Label>
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
            <Input
              id="birthday"
              type="date"
              value={get('birthday')}
              onChange={(e) => update('birthday', e.target.value)}
              required
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
            <Label htmlFor="major">Major/Field of Study</Label>
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
            <Label htmlFor="companyEmail">
              Company Email <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="companyEmail"
              type="email"
              value={get('companyEmail')}
              onChange={(e) => update('companyEmail', e.target.value)}
              placeholder="name@company.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactNumber">
              Contact Number <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="contactNumber"
              type="tel"
              value={get('contactNumber')}
              onChange={(e) => update('contactNumber', e.target.value)}
              placeholder="09XXXXXXXXX or +639XXXXXXXXX"
              required
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">
              Address <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="address"
              value={get('address')}
              onChange={(e) => update('address', e.target.value)}
              placeholder="Street, Barangay, City, Province"
              required
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
            <Input
              id="emergencyContactNumber"
              type="tel"
              value={get('emergencyContactNumber')}
              onChange={(e) => update('emergencyContactNumber', e.target.value)}
              placeholder="09XXXXXXXXX or +639XXXXXXXXX"
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
