const fetch = require('node-fetch');

// Simple in-memory cache so we don't re-fetch M3U on every request
let cachedChannels = [];
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Slugify a string into a safe ID
 */
function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Parse an M3U playlist from a URL
 * Returns an array of channel objects
 */
async function parseM3U(m3uUrl) {
  if (!m3uUrl) return [];

  // Return cache if fresh
  if (cachedChannels.length && Date.now() - cacheTime < CACHE_TTL) {
    return cachedChannels;
  }

  try {
    const res = await fetch(m3uUrl, { timeout: 15000 });
    if (!res.ok) throw new Error(`M3U fetch failed: ${res.status}`);
    const text = await res.text();

    const channels = [];
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    let current = null;

    for (const line of lines) {
      if (line.startsWith('#EXTINF')) {
        // Parse attributes from #EXTINF line
        const nameMatch = line.match(/,(.+)$/);
        const logoMatch = line.match(/tvg-logo="([^"]+)"/);
        const groupMatch = line.match(/group-title="([^"]+)"/);
        const tvgIdMatch = line.match(/tvg-id="([^"]+)"/);
        const tvgNameMatch = line.match(/tvg-name="([^"]+)"/);

        const name = nameMatch ? nameMatch[1].trim() : 'Unknown Channel';
        current = {
          name,
          logo: logoMatch ? logoMatch[1] : null,
          group: groupMatch ? groupMatch[1] : 'General',
          tvgId: tvgIdMatch ? tvgIdMatch[1] : null,
          tvgName: tvgNameMatch ? tvgNameMatch[1] : name,
          id: `nerotv-${slugify(name)}-${channels.length}`,
        };
      } else if (line.startsWith('http') || line.startsWith('rtmp') || line.startsWith('rtsp')) {
        if (current) {
          current.url = line;
          channels.push(current);
          current = null;
        }
      }
    }

    cachedChannels = channels;
    cacheTime = Date.now();
    console.log(`✅ Loaded ${channels.length} IPTV channels`);
    return channels;

  } catch (e) {
    console.error('M3U parse error:', e.message);
    return cachedChannels; // Return stale cache on error
  }
}

/**
 * Get stream object for a specific channel ID
 */
async function getIPTVStreams(m3uUrl, channelId) {
  const channels = await parseM3U(m3uUrl);
  const channel = channels.find(c => c.id === channelId);

  if (!channel) return [];

  return [
    {
      name: 'NeroTV Live',
      description: `📡 ${channel.name}${channel.group ? ` · ${channel.group}` : ''}`,
      url: channel.url,
      behaviorHints: {
        notWebReady: false,
        bingeGroup: `nerotv-live-${slugify(channel.group || 'tv')}`,
      },
    },
  ];
}

/**
 * Get catalog metas for IPTV channels
 */
async function getIPTVCatalog(m3uUrl, { search, genre, skip = 0 } = {}) {
  const channels = await parseM3U(m3uUrl);

  let filtered = channels;

  // Filter by search
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.group && c.group.toLowerCase().includes(q))
    );
  }

  // Filter by genre/group
  if (genre && genre !== 'All') {
    filtered = filtered.filter(c => c.group === genre);
  }

  // Paginate
  const page = filtered.slice(skip, skip + 100);

  return page.map(channel => ({
    id: channel.id,
    type: 'tv',
    name: channel.name,
    poster: channel.logo || 'https://i.imgur.com/wEYbHIR.png',
    background: channel.logo || undefined,
    description: channel.group || 'Live TV',
    genres: channel.group ? [channel.group] : ['General'],
  }));
}

/**
 * Get all unique groups/genres from M3U
 */
async function getIPTVGroups(m3uUrl) {
  const channels = await parseM3U(m3uUrl);
  const groups = [...new Set(channels.map(c => c.group).filter(Boolean))].sort();
  return groups;
}

module.exports = { parseM3U, getIPTVStreams, getIPTVCatalog, getIPTVGroups };
