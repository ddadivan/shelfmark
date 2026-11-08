import { networkOf } from './network-of';

describe('networkOf', () => {
  it.each([
    ['2001:db8:1:2::/64', '2001:db8:1::/48'],
    ['2001:db8:abcd:ffff::/64', '2001:db8:abcd::/48'],
    ['2001:DB8:0001:2::/64', '2001:db8:1::/48'],
    ['2001:db8::/64', '2001:db8:0::/48'],
    ['2001::/64', '2001:0:0::/48'],
  ])('maps the /64 %s to the /48 %s', (key, expected) => {
    expect(networkOf(key)).toBe(expected);
  });

  it('puts every /64 of one /48 in the same network', () => {
    expect(networkOf('2001:db8:1:1::/64')).toBe(networkOf('2001:db8:1:ffff::/64'));
    expect(networkOf('2001:db8:1:1::/64')).not.toBe(networkOf('2001:db8:2:1::/64'));
  });

  it.each(['203.0.113.5', 'unknown', '::1'])('has no network for %s', (key) => {
    expect(networkOf(key)).toBeNull();
  });
});
