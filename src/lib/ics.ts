/**
 * Minimal RFC 5545 calendar invite. Times are written as floating local
 * times (no TZ suffix) so the shoot shows at the stated clock time in
 * whatever calendar opens it — which is what a studio booking means.
 */

interface IcsInput {
  uid: string;
  title: string;
  description: string;
  location: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM[:SS]
  endTime: string; // HH:MM[:SS]
}

/** Escape per RFC 5545: backslash, semicolon, comma, newline. */
function esc(v: string): string {
  return v
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function stamp(date: string, time: string): string {
  return `${date.replace(/-/g, '')}T${time.slice(0, 5).replace(':', '')}00`;
}

/** Fold long lines to 75 octets as the spec requires. */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length > 74) {
    parts.push(' ' + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  if (rest) parts.push(' ' + rest);
  return parts.join('\r\n');
}

export function buildIcs(input: IcsInput): string {
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CHACE STUDIOS//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${esc(input.uid)}`,
    `DTSTAMP:${now}`,
    `DTSTART:${stamp(input.date, input.startTime)}`,
    `DTEND:${stamp(input.date, input.endTime)}`,
    `SUMMARY:${esc(input.title)}`,
    `DESCRIPTION:${esc(input.description)}`,
    `LOCATION:${esc(input.location)}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    'DESCRIPTION:CHACE STUDIOS shoot in 1 hour',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.map(fold).join('\r\n') + '\r\n';
}
