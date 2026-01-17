module.exports = function() {
  // Format: YYYYMMDD.HHMM (e.g., 20260117.1423)
  const now = new Date();
  const version = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    '.',
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0')
  ].join('');
  return { version };
};
