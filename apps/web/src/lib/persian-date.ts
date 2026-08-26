const fullDateFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function isoDateToSafeDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

export function formatPersianFullDate(value: string): string {
  return fullDateFormatter.format(isoDateToSafeDate(value));
}

type DateParts = { year: number; month: number; day: number };

function div(a: number, b: number) {
  return Math.trunc(a / b);
}

function jalaliCalendar(jy: number) {
  const breaks = [
    -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097,
    2192, 2262, 2324, 2394, 2456, 3178,
  ];
  const gy = jy + 621;
  let leapJ = -14;
  let previous = breaks[0];
  let jump = 0;
  if (jy < previous || jy >= breaks.at(-1)!)
    throw new Error("سال شمسی خارج از محدوده است.");
  for (let index = 1; index < breaks.length; index += 1) {
    const current = breaks[index];
    jump = current - previous;
    if (jy < current) break;
    leapJ += div(jump, 33) * 8 + div(jump % 33, 4);
    previous = current;
  }
  let offset = jy - previous;
  leapJ += div(offset, 33) * 8 + div((offset % 33) + 3, 4);
  if (jump % 33 === 4 && jump - offset === 4) leapJ += 1;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - offset < 6) offset = offset - jump + div(jump + 4, 33) * 33;
  let leap = ((offset + 1) % 33) - 1;
  leap = leap === -1 ? 4 : leap % 4;
  return { leap, gy, march };
}

function gregorianToJulianDay(gy: number, gm: number, gd: number) {
  let day = div((gy + div(gm - 8, 6) + 100100) * 1461, 4);
  day += div(153 * ((gm + 9) % 12) + 2, 5) + gd - 34840408;
  day -= div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) - 752;
  return day;
}

function julianDayToGregorian(jdn: number): DateParts {
  let value = 4 * jdn + 139361631;
  value += div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const index = div(value % 1461, 4) * 5 + 308;
  const day = div(index % 153, 5) + 1;
  const month = (div(index, 153) % 12) + 1;
  const year = div(value, 1461) - 100100 + div(8 - month, 6);
  return { year, month, day };
}

function jalaliToJulianDay(jy: number, jm: number, jd: number) {
  const calendar = jalaliCalendar(jy);
  return (
    gregorianToJulianDay(calendar.gy, 3, calendar.march) +
    (jm - 1) * 31 -
    div(jm, 7) * (jm - 7) +
    jd -
    1
  );
}

export function persianDateToIso(
  year: number,
  month: number,
  day: number,
): string {
  const result = julianDayToGregorian(jalaliToJulianDay(year, month, day));
  return `${result.year.toString().padStart(4, "0")}-${result.month.toString().padStart(2, "0")}-${result.day.toString().padStart(2, "0")}`;
}

export function isoDateToPersian(value: string): DateParts {
  const date = isoDateToSafeDate(value);
  const parts = new Intl.DateTimeFormat("en-US-u-ca-persian", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    timeZone: "UTC",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((item) => item.type === type)?.value);
  return { year: part("year"), month: part("month"), day: part("day") };
}

export function persianMonthLength(year: number, month: number): number {
  if (month <= 6) return 31;
  if (month <= 11) return 30;
  return jalaliCalendar(year).leap === 0 ? 30 : 29;
}
