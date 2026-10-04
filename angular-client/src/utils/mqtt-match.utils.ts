/**
 * MQTT-style topic filter matching: `+` matches exactly one level, a trailing
 * `#` matches the parent level and everything below it. Mirrors the matching
 * the server applies to the `set_subscriptions` filter set, so client-side
 * wildcard streams and server-side delivery agree on what a filter covers.
 */
export const topicMatchesFilter = (topic: string, filter: string): boolean => {
  if (filter === topic) return true;
  const topicLevels = topic.split('/');
  const filterLevels = filter.split('/');
  for (let i = 0; i < filterLevels.length; i++) {
    const filterLevel = filterLevels[i];
    if (filterLevel === '#') return i === filterLevels.length - 1;
    if (i >= topicLevels.length) return false;
    if (filterLevel !== '+' && filterLevel !== topicLevels[i]) return false;
  }
  return topicLevels.length === filterLevels.length;
};
