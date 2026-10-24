export function PhotoCredit({ name, createdAt }: { name: string; createdAt: string }) {
  // SQLite CURRENT_TIMESTAMP is UTC but omits the timezone suffix.
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(createdAt)
    ? createdAt.replace(" ", "T") + "Z"
    : createdAt;
  const date = new Date(normalized);
  const valid = !Number.isNaN(date.getTime());
  const parts = valid ? new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Singapore", day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: true,
  }).formatToParts(date) : [];
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  const timestamp = `${part("day")}/${part("month")}/${part("year")} ${Number(part("hour"))}:${part("minute")} ${part("dayPeriod").toLowerCase()}`;
  return <>
    <span>Sent by {name}</span>
    {valid && <time dateTime={date.toISOString()} className="mt-1 block text-xs font-normal opacity-75">
      {timestamp}
    </time>}
  </>;
}
