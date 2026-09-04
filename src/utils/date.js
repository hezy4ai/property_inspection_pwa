/**
 * Date Utilities for West African Time (WAT)
 */

export function getWatDateString() {
  // en-CA formats as YYYY-MM-DD which is required for <input type="date" />
  const formatter = new Intl.DateTimeFormat('en-CA', { 
    timeZone: 'Africa/Lagos', 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  });
  return formatter.format(new Date());
}

export function formatWatDateTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  // Example output: "4 Sep 2026, 10:36 WAT"
  return `${formatter.format(date)} WAT`;
}
