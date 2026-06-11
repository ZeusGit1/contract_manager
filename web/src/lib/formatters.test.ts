import { daysFromToday, formatUsd } from './formatters';

describe('formatUsd', () => {
  it('formatUsd — positive number — returns $ with comma grouping', () => {
    expect(formatUsd(1234567)).toBe('$1,234,567');
  });
  it('formatUsd — null — returns em-dash placeholder', () => {
    expect(formatUsd(null)).toBe('—');
  });
});

describe('daysFromToday', () => {
  it('daysFromToday — date 5 days out — returns 5', () => {
    // Arrange
    const today = new Date(Date.UTC(2026, 5, 10));
    const targetIso = '2026-06-15T00:00:00Z';

    // Act
    const result = daysFromToday(targetIso, today);

    // Assert
    expect(result).toBe(5);
  });

  it('daysFromToday — null — returns null', () => {
    expect(daysFromToday(null)).toBeNull();
  });
});
