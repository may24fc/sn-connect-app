# Form Components Reference

> Audience: Developers

Controlled form components built on React Hook Form. Used across onboarding wizard, report forms, invoice forms, and admin modals.

**Location:** `packages/ui/src/components/forms/`  
**Import:** `import { Form, FormInput, FormSelect, FormTextarea, PhoneInput, CurrencySelector, BankSelector } from '@hr-portal/ui';`

---

## Form

Root form wrapper that provides React Hook Form context via `FormProvider`.

```typescript
interface FormProps<T extends FieldValues> {
  form: UseFormReturn<T>;      // From useForm()
  onSubmit: (data: T) => void;
  children: React.ReactNode;
  className?: string;
}
```

### Usage

```tsx
const form = useForm<PersonalInfoSchema>({
  resolver: zodResolver(personalInfoSchema),
});

<Form form={form} onSubmit={handleSubmit}>
  <FormInput name="firstName" label="First Name" required />
  <FormInput name="lastName" label="Last Name" required />
  <Button type="submit">Save</Button>
</Form>
```

---

## FormField

Core field wrapper. Uses React Hook Form's `Controller` to connect form state with a custom render function. Handles label, error display, and description.

```typescript
interface FormFieldProps<TFieldValues, TName> {
  name: TName;                                        // Field path (dot notation)
  label?: string;                                     // Label text
  description?: string;                               // Help text below field
  required?: boolean;                                  // Shows red asterisk
  className?: string;
  children: (props: FormFieldRenderProps) => ReactNode; // Render function
}
```

### Render Props

| Prop | Description |
|------|-------------|
| `field` | Controller field props (`value`, `onChange`, `onBlur`, `ref`, `id`) |
| `fieldState` | Validation state (`error`, `isDirty`, `isTouched`) |
| `id` | Generated field ID for label association |

---

## FormInput

Pre-composed field: `FormField` + `Input` primitive. Auto-wires error state.

```typescript
interface FormInputProps<T> extends Omit<InputProps, 'name'> {
  name: FieldPath<T>;
  label?: string;
  description?: string;
  required?: boolean;
}
```

```tsx
<FormInput<PersonalInfoSchema> name="email" label="Email" type="email" required />
```

---

## FormSelect

Pre-composed field: `FormField` + native `<select>`. Takes an options array.

```typescript
interface FormSelectProps<T> {
  name: FieldPath<T>;
  label?: string;
  options: FormSelectOption[];
  required?: boolean;
  placeholder?: string;
}

interface FormSelectOption {
  value: string;
  label: string;
}
```

```tsx
<FormSelect name="department" label="Department" options={departments} required />
```

---

## FormTextarea

Pre-composed field: `FormField` + `Textarea` primitive.

```tsx
<FormTextarea name="notes" label="Additional Notes" rows={4} />
```

---

## PhoneInput

International phone number input with country dropdown. Default countries include PH, US, IT, AU, GB, DE, SG, JP, KR, IN.

```typescript
interface PhoneInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onCountryChange?: (countryCode: string) => void;
  countryCode?: string;            // ISO 3166-1 alpha-2 (default: 'PH')
  countries?: PhoneCountry[];
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
  required?: boolean;
  onBlur?: (value: string) => void;
}
```

### Usage

```tsx
<PhoneInput
  value={phone}
  onChange={setPhone}
  countryCode="PH"
  onCountryChange={setCountryCode}
  error={!!errors.phone}
/>
```

---

## CurrencySelector

Currency picker dropdown with search. Used in invoice and payroll forms.

```typescript
interface CurrencySelectorProps {
  value?: string;
  onChange?: (value: string) => void;
  currencies?: CurrencyOption[];
  placeholder?: string;
  disabled?: boolean;
}

interface CurrencyOption {
  code: string;    // ISO 4217 (e.g. 'PHP')
  symbol: string;  // '₱'
  name: string;    // 'Philippine Peso'
}
```

---

## BankSelector

Bank picker dropdown with search. Used in onboarding payment info step.

```typescript
interface BankSelectorProps {
  value?: string;
  onChange?: (value: string) => void;
  banks?: BankOption[];
  placeholder?: string;
  disabled?: boolean;
}

interface BankOption {
  code: string;
  name: string;
  type: string;  // 'bank' | 'e-wallet'
}
```

---

*Last updated: 2026-02-27*
