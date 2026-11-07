import { expandIpv6, isBlockedAddress, isBlockedHostname } from './ip-policy';

describe('isBlockedAddress', () => {
  const blocked: readonly string[] = [
    '0.0.0.0',
    '0.1.2.3',
    '10.0.0.1',
    '100.64.0.1',
    '127.0.0.1',
    '127.255.255.254',
    '169.254.169.254',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '192.0.0.1',
    '198.18.0.1',
    '224.0.0.1',
    '240.0.0.1',
    '255.255.255.255',
    '::',
    '::1',
    '0:0:0:0:0:0:0:1',
    '0000:0000:0000:0000:0000:0000:0000:0001',
    '::ffff:127.0.0.1',
    '::ffff:7f00:1',
    '::ffff:10.0.0.1',
    '::ffff:a9fe:a9fe',
    '0:0:0:0:0:ffff:192.168.0.1',
    '::127.0.0.1',
    '::10.0.0.1',
    '64:ff9b::7f00:1',
    '2002:7f00:1::',
    '2001::1',
    '::ffff:0:127.0.0.1',
    '::ffff:0:8.8.8.8',
    '0:0:0:0:ffff:0:7f00:1',
    '3fff::1',
    '3fff:fff::1',
    '5f00::1',
    '192.31.196.1',
    '192.52.193.1',
    '192.175.48.1',
    '2001:db8::1',
    'fc00::1',
    'fd00:ec2::254',
    'fe80::1',
    'fec0::1',
    'ff02::1',
    'fe80::1%eth0',
  ];
  const notIps: readonly string[] = [
    '',
    'localhost',
    '2130706433',
    '0177.0.0.1',
    '0x7f.0.0.1',
    '0x7f000001',
    '127.1',
    '127.0.1',
    '1.2.3',
    '1.2.3.4.5',
    '256.1.1.1',
    '1:2:3',
    ':::',
    'example.com',
  ];
  const allowed: readonly string[] = [
    '1.1.1.1',
    '8.8.8.8',
    '93.184.216.34',
    '172.15.0.1',
    '192.31.197.1',
    '3ffe::1',
    '5e00::1',
    '172.32.0.1',
    '100.63.255.255',
    '100.128.0.1',
    '::ffff:8.8.8.8',
    '::8.8.8.8',
    '2606:4700:4700::1111',
    '2a00:1450:4001::200e',
  ];

  it.each(blocked)('blocks %s', (address) => {
    expect(isBlockedAddress(address)).toBe(true);
  });

  it.each(notIps)('fails closed on non-canonical input %j', (address) => {
    expect(isBlockedAddress(address)).toBe(true);
  });

  it.each(allowed)('allows public %s', (address) => {
    expect(isBlockedAddress(address)).toBe(false);
  });
});

describe('expandIpv6', () => {
  it.each([
    ['::', [0, 0, 0, 0, 0, 0, 0, 0]],
    ['1::', [1, 0, 0, 0, 0, 0, 0, 0]],
    ['::1', [0, 0, 0, 0, 0, 0, 0, 1]],
    ['1:2:3:4:5:6:7:8', [1, 2, 3, 4, 5, 6, 7, 8]],
    ['::ffff:1.2.3.4', [0, 0, 0, 0, 0, 0xffff, 0x102, 0x304]],
  ])('expands %s', (address, groups) => {
    expect(expandIpv6(address)).toEqual(groups);
  });

  it.each(['1:2:3', '1::2::3', 'g::1', '1:2:3:4:5:6:7:8:9', '1:2:3:4:5:6:7::8', '::1.2.3'])(
    'rejects %s',
    (address) => {
      expect(expandIpv6(address)).toBeNull();
    },
  );
});

describe('isBlockedHostname', () => {
  it.each([
    'localhost',
    'LOCALHOST',
    'localhost.',
    'app.localhost',
    'printer.local',
    'db.internal',
    'a.b.internal.',
  ])('blocks %s', (name) => {
    expect(isBlockedHostname(name)).toBe(true);
  });

  it.each(['example.com', 'localhost.example.com', 'notlocal', 'internal.example.org'])(
    'allows %s',
    (name) => {
      expect(isBlockedHostname(name)).toBe(false);
    },
  );
});
