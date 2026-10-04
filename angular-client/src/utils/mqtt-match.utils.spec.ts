import { topicMatchesFilter } from './mqtt-match.utils';

describe('topicMatchesFilter', () => {
  it('matches exact topics', () => {
    expect(topicMatchesFilter('A/B', 'A/B')).toBeTrue();
    expect(topicMatchesFilter('A/B', 'A/C')).toBeFalse();
  });

  it('matches + as exactly one level', () => {
    expect(topicMatchesFilter('A/B/C', 'A/+/C')).toBeTrue();
    expect(topicMatchesFilter('A/B/X/C', 'A/+/C')).toBeFalse();
    expect(topicMatchesFilter('A/B', 'A/+')).toBeTrue();
    expect(topicMatchesFilter('A/B/C', 'A/+')).toBeFalse();
  });

  it('matches trailing # for the parent level and all descendants', () => {
    expect(topicMatchesFilter('A', 'A/#')).toBeTrue();
    expect(topicMatchesFilter('A/B/C', 'A/#')).toBeTrue();
    expect(topicMatchesFilter('B/C', 'A/#')).toBeFalse();
    expect(topicMatchesFilter('anything/at/all', '#')).toBeTrue();
  });

  it('does not treat a mid-filter # as a wildcard tail', () => {
    expect(topicMatchesFilter('A/B/C', 'A/#/C')).toBeFalse();
  });
});
