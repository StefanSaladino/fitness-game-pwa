const FALLBACK_TIMEZONES = [
  'America/Toronto',
  'America/Vancouver',
  'America/Edmonton',
  'America/Winnipeg',
  'America/Halifax',
  'America/St_Johns',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
  'UTC',
  'Europe/London',
  'Europe/Paris',
  'Europe/Rome',
  'Africa/Nairobi',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
];

type IntlWithSupportedValues = typeof Intl & {
  supportedValuesOf?: (key: 'timeZone') => string[];
};

export function getBrowserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function getTimeZoneOptions(preferred?: string): string[] {
  const supported = (Intl as IntlWithSupportedValues).supportedValuesOf?.('timeZone') ?? FALLBACK_TIMEZONES;
  const values = new Set<string>(supported);
  values.add('UTC');
  if (preferred) values.add(preferred);
  values.add(getBrowserTimeZone());

  return [...values].sort((first, second) => {
    if (first === preferred) return -1;
    if (second === preferred) return 1;
    return first.localeCompare(second);
  });
}
