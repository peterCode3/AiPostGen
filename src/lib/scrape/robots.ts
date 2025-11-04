import got from 'got';

export async function robotsAllowed(urlStr: string) {
  try {
    const u = new URL(urlStr);
    const robotsUrl = `${u.origin}/robots.txt`;
    const txt = await got(robotsUrl, { timeout: { request: 6000 } }).text();
    // naive: disallow wildcard check
    if (/Disallow:\s*\/\s*$/im.test(txt)) return false;
    return true;
  } catch { return true; }
}
