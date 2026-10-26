const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
});

/** Handle Flask HTTP dates and ISO/SQL dates without truncating month names. */
export function formatDisplayDate(value: string | null | undefined, fallback = 'Date not available'): string {
  if (!value) return fallback;
  const calendarDate = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T ])/.exec(value);
  const date = calendarDate
    ? new Date(`${calendarDate[1]}-${calendarDate[2]}-${calendarDate[3]}T00:00:00Z`)
    : new Date(value);
  if (!Number.isFinite(date.getTime())) return fallback;
  return dateFormatter.format(date);
}
