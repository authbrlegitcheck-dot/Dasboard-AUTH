/**
 * Utility functions for working with dates in Brasília timezone (America/Sao_Paulo).
 * All date operations in the system should use these functions instead of raw `new Date()`.
 */

const BRASILIA_TIMEZONE = "America/Sao_Paulo";

/**
 * Returns the current date/time adjusted to Brasília timezone.
 * This creates a Date object whose UTC methods return Brasília local time values.
 */
export function nowBrasilia(): Date {
  const now = new Date();
  const brasiliaStr = now.toLocaleString("en-US", { timeZone: BRASILIA_TIMEZONE });
  return new Date(brasiliaStr);
}

/**
 * Returns today's date string in YYYY-MM-DD format (Brasília timezone).
 */
export function todayBrasiliaISO(): string {
  return formatDateBrasilia(new Date(), "yyyy-MM-dd");
}

/**
 * Returns the current month string in YYYY-MM format (Brasília timezone).
 */
export function currentMonthBrasilia(): string {
  const now = nowBrasilia();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Returns the current datetime string in YYYY-MM-DDTHH:mm format (Brasília timezone).
 */
export function nowBrasiliaDatetimeLocal(): string {
  const now = nowBrasilia();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${h}:${min}`;
}

/**
 * Formats a Date using toLocaleDateString with Brasília timezone.
 */
export function formatDateBrasilia(date: Date, format?: string): string {
  if (format === "yyyy-MM-dd") {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: BRASILIA_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
    return parts; // en-CA gives YYYY-MM-DD format
  }

  return date.toLocaleDateString("pt-BR", { timeZone: BRASILIA_TIMEZONE });
}

/**
 * Formats a Date using toLocaleDateString with Brasília timezone and custom options.
 */
export function formatDateBrasiliaOptions(
  date: Date,
  options: Intl.DateTimeFormatOptions
): string {
  return date.toLocaleDateString("pt-BR", {
    ...options,
    timeZone: BRASILIA_TIMEZONE,
  });
}

/**
 * Formats a Date using toLocaleString (date + time) with Brasília timezone.
 */
export function formatDateTimeBrasilia(date: Date): string {
  return date.toLocaleString("pt-BR", { timeZone: BRASILIA_TIMEZONE });
}

/** YYYY-MM-DD for an auth row or Date, always in Brasília calendar. */
export function dateKeyBrasilia(dateLike: Date | string): string {
  const d = typeof dateLike === "string" ? new Date(dateLike) : dateLike;
  return formatDateBrasilia(d, "yyyy-MM-dd");
}

/** YYYY-MM for grouping (Brasília). */
export function yearMonthKeyBrasilia(dateLike: Date | string): string {
  return dateKeyBrasilia(dateLike).slice(0, 7);
}

export function prevYearMonthKey(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number);
  const prev = new Date(y, m - 2, 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
}

export function daysInMonth(year: number, month1to12: number): number {
  return new Date(year, month1to12, 0).getDate();
}
