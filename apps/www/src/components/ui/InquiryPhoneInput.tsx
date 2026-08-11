'use client';

import { ChevronDown } from 'lucide-react';
import { AsYouType } from 'libphonenumber-js';
import { type ReactNode, useMemo, useState } from 'react';
import {
  type Country,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumber,
} from 'react-phone-number-input';
import flags from 'react-phone-number-input/flags';
import labels from 'react-phone-number-input/locale/en';

type InquiryPhoneInputProps = {
  id?: string;
  value?: string;
  onChange: (value?: string) => void;
  onBlur?: () => void;
  placeholder?: string;
};

function InternationalPhoneIcon(): ReactNode {
  return (
    <svg
      aria-hidden="true"
      className="inquiry-phone-field__international-icon"
      viewBox="0 0 75 50"
    >
      <g
        className="PhoneInputInternationalIconGlobe"
        stroke="currentColor"
        fill="none"
        strokeWidth="2"
        strokeMiterlimit="10"
      >
        <path strokeLinecap="round" d="M47.2 36.1C48.1 36 49 36 50 36c7.4 0 14 1.7 18.5 4.3" />
        <path d="M68.6 9.6C64.2 12.3 57.5 14 50 14c-7.4 0-14-1.7-18.5-4.3" />
        <path d="M26 25h48M50 1v48" />
        <path
          strokeLinecap="round"
          d="M46.3 48.7c1.2.2 2.5.3 3.7.3 13.3 0 24-10.7 24-24S63.3 1 50 1 26 11.7 26 25c0 2 .3 3.9.7 5.8"
        />
        <path
          strokeLinecap="round"
          d="M46.8 48.2c1 .6 2.1.8 3.2.8 6.6 0 12-10.7 12-24S56.6 1 50 1 38 11.7 38 25c0 1.4.1 2.7.2 4v.2"
        />
      </g>
      <path
        className="PhoneInputInternationalIconPhone"
        fill="currentColor"
        d="M12.4 17.9c2.9-2.9 5.4-4.8.3-11.2S4.1 5.2 1.3 8.1C-2 11.4 1.1 23.5 13.1 35.6s24.3 15.2 27.5 11.9c2.8-2.8 7.8-6.3 1.4-11.5s-8.3-2.6-11.2.3c-2 2-7.2-2.2-11.7-6.7s-8.7-9.7-6.7-11.7Z"
      />
    </svg>
  );
}

export function InquiryPhoneInput({
  id,
  value,
  onChange,
  onBlur,
  placeholder = 'Enter phone number',
}: InquiryPhoneInputProps): ReactNode {
  const initialCountry = value ? parsePhoneNumber(value)?.country : undefined;
  const [country, setCountry] = useState<Country | undefined>(initialCountry);
  const [nationalNumber, setNationalNumber] = useState(() => {
    if (!value || !initialCountry) {
      return '';
    }

    return parsePhoneNumber(value)?.formatNational() ?? '';
  });
  const countries = useMemo(
    () => getCountries().sort((first, second) => labels[first].localeCompare(labels[second])),
    []
  );
  const SelectedFlag = country ? flags[country] : undefined;

  function changeCountry(nextCountry: string): void {
    setCountry(nextCountry ? (nextCountry as Country) : undefined);
    setNationalNumber('');
    onChange('');
  }

  function changeNationalNumber(nextNationalNumber: string): void {
    if (!country) {
      return;
    }

    const digits = nextNationalNumber.replace(/\D/g, '');
    if (!digits) {
      setNationalNumber('');
      onChange('');
      return;
    }

    const formatter = new AsYouType(country);
    const formattedNationalNumber = formatter.input(digits);
    const internationalValue = formatter.getNumberValue();

    setNationalNumber(formattedNationalNumber);
    onChange(internationalValue ?? `+${getCountryCallingCode(country)}${digits}`);
  }

  return (
    <div className="inquiry-phone-field">
      <div className="inquiry-phone-field__country">
        <span className="inquiry-phone-field__country-content" aria-hidden="true">
          {country && SelectedFlag ? (
            <>
              <SelectedFlag title={labels[country]} />
              <span className="inquiry-phone-field__calling-code">
                +{getCountryCallingCode(country)}
              </span>
            </>
          ) : (
            <InternationalPhoneIcon />
          )}
          <ChevronDown className="inquiry-phone-field__chevron" />
        </span>
        <select
          className="inquiry-phone-field__country-select"
          aria-label="Country calling code"
          value={country ?? ''}
          onChange={(event) => changeCountry(event.target.value)}
        >
          <option value="">Select country</option>
          {countries.map((countryOption) => (
            <option key={countryOption} value={countryOption}>
              {labels[countryOption]} (+{getCountryCallingCode(countryOption)})
            </option>
          ))}
        </select>
      </div>

      <input
        {...(id ? { id } : {})}
        type="tel"
        inputMode="tel"
        className="inquiry-phone-field__number"
        value={nationalNumber}
        onChange={(event) => changeNationalNumber(event.target.value)}
        {...(onBlur ? { onBlur } : {})}
        placeholder={country ? placeholder : 'Select a country first'}
        disabled={!country}
        autoComplete="tel-national"
      />
    </div>
  );
}
