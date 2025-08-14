import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Force the locale to 'en-US'
vi.spyOn(Number.prototype, 'toLocaleString').mockImplementation(function (
  this: number,
  locales?: string | string[],
  options?: Intl.NumberFormatOptions
) {
  return new Intl.NumberFormat('en-US', options).format(this);
});
