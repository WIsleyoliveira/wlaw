type P = { className?: string };
const base = "h-[18px] w-[18px]";
function s(d: string) {
  function Icone(p: P) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
           strokeLinecap="round" strokeLinejoin="round" className={p.className ?? base} aria-hidden>
        <path d={d} />
      </svg>
    );
  }
  return Icone;
}

export const IconCalendar = s("M7 3v3M17 3v3M3.5 9h17M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v12A1.5 1.5 0 0 1 19 20.5H5A1.5 1.5 0 0 1 3.5 19V7A1.5 1.5 0 0 1 5 5.5Z");
export const IconCheck = s("M4.5 6.5h15M4.5 12h15M4.5 17.5h15");
export const IconTasks = s("M9 6h11M9 12h11M9 18h11M4 5.8 5.2 7 7.4 4.6M4 11.8 5.2 13l2.2-2.4M4 17.8 5.2 19l2.2-2.4");
export const IconGavel = s("M14 3.5 20.5 10M17.2 6.3 9.5 14M6 12.5 11.5 18M3.5 20.5h9M4.2 15.8l2.6-2.6a1 1 0 0 1 1.4 0l2.6 2.6a1 1 0 0 1 0 1.4l-2.6 2.6a1 1 0 0 1-1.4 0l-2.6-2.6a1 1 0 0 1 0-1.4Z");
export const IconHandshake = s("M8 12.5 10.5 15a1.6 1.6 0 0 0 2.3 0l.4-.4 1.6 1.6a1.4 1.4 0 0 0 2-2l.4.4a1.4 1.4 0 0 0 2-2L14.5 7.5 12 9.5a2 2 0 0 1-2.6 0L8 8.3M3 8.5l3.5-2.8L12 9.5M21 8.5 17.5 5.7 14 8");
export const IconChart = s("M4 20V9M10 20V4M16 20v-7M22 20H2");
export const IconReport = s("M6 3.5h12v17H6zM9 8h6M9 12h6M9 16h4");
export const IconGauge = s("M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18ZM12 12l4-3.5M12 12v0");
export const IconFolder = s("M3.5 6.5A1.5 1.5 0 0 1 5 5h4l2 2.5h8A1.5 1.5 0 0 1 20.5 9v9A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18Z");
export const IconSearch = s("M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14ZM20 20l-4-4");
export const IconBell = s("M6.5 17V11a5.5 5.5 0 0 1 11 0v6M4.5 17h15M10 20.2a2.2 2.2 0 0 0 4 0");
export const IconClock = s("M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18ZM12 7.5V12l3 1.8");
export const IconSpark = s("M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6L4.8 10.7 10.3 9 12 3.5Z");
export const IconSettings = s("M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4ZM19.4 13.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-2.87 1.2v.17a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-2.93-1.16l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.5 12.6h-.17a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 5.58 5.7l-.06-.06A2 2 0 1 1 8.35 2.8l.06.06a1.7 1.7 0 0 0 2.87-1.2V1.5a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 2.93 1.16l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-1.2 2.87v.17a2 2 0 1 1 0 4h-.09Z");
export const IconPlus = s("M12 5v14M5 12h14");
export const IconChevronDown = s("m6 9.5 6 6 6-6");
export const IconChevronLeft = s("m14.5 6-6 6 6 6");
export const IconChevronRight = s("m9.5 6 6 6-6 6");
export const IconFilter = s("M4 6h16l-6.2 7.3V19l-3.6-1.8v-3.9L4 6Z");
export const IconExport = s("M12 15V4m0 0L8.5 7.5M12 4l3.5 3.5M4.5 15v3A1.5 1.5 0 0 0 6 19.5h12a1.5 1.5 0 0 0 1.5-1.5v-3");
export const IconMore = s("M12 6.2v.01M12 12v.01M12 17.8v.01");
export const IconMail = s("M3.5 7A1.5 1.5 0 0 1 5 5.5h14A1.5 1.5 0 0 1 20.5 7v10a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 17ZM4 6.5l8 6 8-6");
export const IconAlert = s("M12 4.5 21 19.5H3L12 4.5ZM12 10v4M12 16.8v.01");
export const IconRefresh = s("M20 12a8 8 0 1 1-2.6-5.9M20 4v4.5h-4.5");
