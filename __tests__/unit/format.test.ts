import { formatCurrency, formatDate, formatNumber, formatPercent } from '@/lib/format';

describe('format', () => {
  it('formats EUR cents for nl locale', () => {
    expect(formatCurrency(12500, 'nl')).toMatch(/125/);
  });

  it('formats EUR cents for en locale', () => {
    expect(formatCurrency(12500, 'en')).toMatch(/125/);
  });

  it('formats dates without throwing', () => {
    expect(formatDate('2026-07-20T12:00:00.000Z', 'd MMM yyyy', 'nl')).toBeTruthy();
  });

  it('formats numbers and percents', () => {
    expect(formatNumber(1200, 'nl')).toBeTruthy();
    expect(formatPercent(0.25, 'en')).toMatch(/25/);
  });
});
