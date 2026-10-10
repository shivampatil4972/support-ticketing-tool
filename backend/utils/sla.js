const priorityToHours = {
  urgent: 4,
  high: 24,
  medium: 72,
  low: 168
};

const calculateSlaDueDate = (priority) => {
  const hours = priorityToHours[priority] || 24;
  const dueDate = new Date();
  dueDate.setHours(dueDate.getHours() + hours);
  return dueDate.toISOString().slice(0, 19).replace('T', ' ');
};

const formatSlaStatus = (dueDate, status) => {
  if (status === 'closed') {
    return 'Resolved';
  }

  const now = new Date();
  const due = new Date(dueDate);
  return due < now ? 'OVERDUE' : 'ON TRACK';
};

module.exports = { calculateSlaDueDate, formatSlaStatus };
