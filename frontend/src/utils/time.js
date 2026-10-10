// "5 minutes ago", "3 hours ago", "2 days ago"
export const timeAgo = (date) => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));

  if (seconds < 60) return "just now";

  const units = [
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];

  for (const [name, size] of units) {
    const count = Math.floor(seconds / size);
    if (count >= 1) return `${count} ${name}${count === 1 ? "" : "s"} ago`;
  }

  return "just now";
};

// 95 -> "1h 35m", 3000 -> "2d 2h", null -> "—"
export const formatDuration = (minutes) => {
  if (minutes === null || minutes === undefined) return "—";
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;

  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
};
