const express = require('express');
const fetch = require('node-fetch');
const { landingTemplate } = require('./landing');
const { parseM3U, getIPTVStreams, getIPTVCatalog } = require('./iptv');

const app = express();
const PORT = process.env.PORT || 7000;
const TMDB_KEY = process.env.TMDB_API_KEY || '';
const M3U_URL = process.env.M3U_URL || '';

// ── Manifest ──────────────────────────────────────────────────────────────────
const MANIFEST = {
  id: 'community.nerotv.vidsrc',
  version: '1.0.0',
  name: 'NeroTV',
  description: 'Stream movies, TV series via multiple sources and Live TV via your M3U playlist.',
  resources: ['stream', 'meta', 'subtitles', 'catalog'],
  types: ['movie', 'series', 'tv'],
  catalogs: [
    {
      type: 'movie',
      id: 'nerotv-movies',
      name: 'NeroTV Movies',
      extra: [{ name: 'search', isRequired: false }, { name: 'skip' }],
    },
    {
      type: 'series',
      id: 'nerotv-series',
      name: 'NeroTV Series',
      extra: [{ name: 'search', isRequired: false }, { name: 'skip' }],
    },
    {
      type: 'tv',
      id: 'nerotv-iptv',
      name: 'NeroTV Live TV',
      extra: [{ name: 'search', isRequired: false }, { name: 'genre' }, { name: 'skip' }],
    },
  ],
  idPrefixes: ['tt', 'nerotv-'],
  logo: 'https://i.imgur.com/wEYbHIR.png',
  behaviorHints: {
    p2p: false,
    configurable: false,
    configurationRequired: false,
  },
};

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  next();
});

// ── Landing ───────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.setHeader('content-type', 'text/html');
  res.send(landingTemplate(MANIFEST));
});
app.get('/configure', (req, res) => {
  res.setHeader('content-type', 'text/html');
  res.send(landingTemplate(MANIFEST));
});

// ── Manifest ──────────────────────────────────────────────────────────────────
app.get('/manifest.json', (req, res) => res.json(MANIFEST));

// ── TMDB helpers ──────────────────────────────────────────────────────────────
async function tmdbFetch(path) {
  if (!TMDB_KEY) return null;
  try {
    const res = await fetch(`https://api.themoviedb.org/3${path}&api_key=${TMDB_KEY}`);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function imdbToTmdbId(imdbId, type) {
  const data = await tmdbFetch(`/find/${imdbId}?external_source=imdb_id`);
  if (!data) return null;
  const results = type === 'movie' ? data.movie_results : data.tv_results;
  return results && results[0] ? results[0].id : null;
}

// ── Stream sources ────────────────────────────────────────────────────────────
// These return real playable stream URLs or embeds
// Priority: direct HLS first, embed fallbacks after

async function fetchVidSrcICU(imdbId, season, episode) {
  // vidsrc.icu has a simple API that returns stream info
  try {
    const isMovie = !season;
    const url = isMovie
      ? `https://vidsrc.icu/api/server/movie?imdb_id=${imdbId}`
      : `https://vidsrc.icu/api/server/tv?imdb_id=${imdbId}&season=${season}&episode=${episode}`;

    const res = await fetch(url, {
      headers: { 'Referer': 'https://vidsrc.icu/' },
      timeout: 8000,
    });
    if (!res.ok) return [];

    const data = await res.json();
    const streams = [];

    if (data && Array.isArray(data)) {
      data.forEach((s, i) => {
        if (s.url) {
          streams.push({
            name: 'NeroTV',
            description: `🎬 Source ${i + 1}${s.quality ? ` · ${s.quality}` : ''}`,
            url: s.url,
            behaviorHints: { notWebReady: false },
          });
        }
      });
    }
    return streams;
  } catch { return []; }
}

async function fetchVidSrcXYZ(imdbId, season, episode) {
  // vidsrc.xyz provides embed but also exposes stream via their API
  try {
    const isMovie = !season;
    const path = isMovie
      ? `/movie/${imdbId}`
      : `/tv/${imdbId}/${season}/${episode}`;

    const embedUrl = `https://vidsrc.xyz/embed${path}`;

    // Return as external URL fallback - opens in browser
    return [{
      name: 'NeroTV',
      description: '🌐 VidSrc.xyz',
      externalUrl: embedUrl,
      behaviorHints: { notWebReady: false },
    }];
  } catch { return []; }
}

async function fetchVidSrcMov(imdbId, season, episode) {
  // vidsrc.mov clean embed API
  try {
    const isMovie = !season;
    const url = isMovie
      ? `https://vidsrc.mov/embed/movie/${imdbId}`
      : `https://vidsrc.mov/embed/tv/${imdbId}/${season}/${episode}`;

    return [{
      name: 'NeroTV',
      description: '🎥 VidSrc.mov',
      externalUrl: url,
      behaviorHints: { notWebReady: false },
    }];
  } catch { return []; }
}

async function fetchVidSrcMe(imdbId, season, episode) {
  const isMovie = !season;
  const url = isMovie
    ? `https://vidsrc.me/embed/movie?imdb=${imdbId}`
    : `https://vidsrc.me/embed/tv?imdb=${imdbId}&season=${season}&episode=${episode}`;

  return [{
    name: 'NeroTV',
    description: '📺 VidSrc.me',
    externalUrl: url,
    behaviorHints: { notWebReady: false },
  }];
}

async function fetchAutoEmbed(imdbId, season, episode) {
  try {
    const isMovie = !season;
    const url = isMovie
      ? `https://autoembed.co/movie/imdb/${imdbId}`
      : `https://autoembed.co/tv/imdb/${imdbId}-${season}-${episode}`;

    return [{
      name: 'NeroTV',
      description: '⚡ AutoEmbed',
      externalUrl: url,
      behaviorHints: { notWebReady: false },
    }];
  } catch { return []; }
}

// ── Build streams with fallback chain ─────────────────────────────────────────
async function buildStreams(imdbId, season, episode) {
  // Run all sources in parallel
  const [icu, xyz, mov, me, auto] = await Promise.allSettled([
    fetchVidSrcICU(imdbId, season, episode),
    fetchVidSrcXYZ(imdbId, season, episode),
    fetchVidSrcMov(imdbId, season, episode),
    fetchVidSrcMe(imdbId, season, episode),
    fetchAutoEmbed(imdbId, season, episode),
  ]);

  const streams = [
    ...(icu.status === 'fulfilled' ? icu.value : []),
    ...(xyz.status === 'fulfilled' ? xyz.value : []),
    ...(mov.status === 'fulfilled' ? mov.value : []),
    ...(me.status === 'fulfilled' ? me.value : []),
    ...(auto.status === 'fulfilled' ? auto.value : []),
  ];

  return streams;
}

// ── Meta ──────────────────────────────────────────────────────────────────────
app.get('/meta/:type/:id.json', async (req, res) => {
  const { type, id } = req.params;

  // IPTV channel meta
  if (type === 'tv') {
    const channels = await parseM3U(M3U_URL);
    const channel = channels.find(c => c.id === id);
    if (!channel) return res.json({ meta: { id, type, name: id } });
    return res.json({
      meta: {
        id,
        type: 'tv',
        name: channel.name,
        poster: channel.logo || undefined,
        background: channel.logo || undefined,
        description: `Live: ${channel.group || 'TV Channel'}`,
        genres: channel.group ? [channel.group] : [],
      }
    });
  }

  const imdbId = id.startsWith('tt') ? id : null;
  if (!imdbId) return res.json({ meta: {} });

  try {
    const tmdbId = await imdbToTmdbId(imdbId, type);
    if (!tmdbId) return res.json({ meta: { id, type } });

    const endpoint = type === 'movie'
      ? `/movie/${tmdbId}?append_to_response=credits`
      : `/tv/${tmdbId}?append_to_response=credits`;

    const data = await tmdbFetch(endpoint);
    if (!data) return res.json({ meta: { id, type } });

    const meta = {
      id,
      type,
      name: data.title || data.name,
      poster: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : undefined,
      background: data.backdrop_path ? `https://image.tmdb.org/t/p/original${data.backdrop_path}` : undefined,
      description: data.overview,
      releaseInfo: (data.release_date || data.first_air_date || '').slice(0, 4),
      runtime: data.runtime ? `${data.runtime} min` : undefined,
      genres: (data.genres || []).map(g => g.name),
      cast: (data.credits?.cast || []).slice(0, 10).map(c => c.name),
      imdbRating: data.vote_average ? data.vote_average.toFixed(1) : undefined,
    };

    if (type === 'series' && data.number_of_seasons) {
      meta.videos = [];
      for (let s = 1; s <= data.number_of_seasons; s++) {
        const seasonData = await tmdbFetch(`/tv/${tmdbId}/season/${s}?`);
        if (seasonData?.episodes) {
          seasonData.episodes.forEach(ep => {
            meta.videos.push({
              id: `${id}:${s}:${ep.episode_number}`,
              title: ep.name || `Episode ${ep.episode_number}`,
              season: s,
              episode: ep.episode_number,
              released: ep.air_date,
              thumbnail: ep.still_path ? `https://image.tmdb.org/t/p/w300${ep.still_path}` : undefined,
              overview: ep.overview,
            });
          });
        }
      }
    }

    res.json({ meta });
  } catch (e) {
    console.error('Meta error:', e);
    res.json({ meta: { id, type } });
  }
});

// ── Catalog ───────────────────────────────────────────────────────────────────
app.get('/catalog/:type/:id.json', async (req, res) => {
  const { type, id } = req.params;
  const { search, skip, genre } = req.query;

  if (type === 'tv' && id === 'nerotv-iptv') {
    try {
      const metas = await getIPTVCatalog(M3U_URL, { search, genre, skip: parseInt(skip) || 0 });
      return res.json({ metas });
    } catch (e) {
      return res.json({ metas: [] });
    }
  }

  const page = Math.floor((parseInt(skip) || 0) / 20) + 1;
  try {
    let endpoint;
    if (search) {
      const tmdbType = type === 'movie' ? 'movie' : 'tv';
      endpoint = `/search/${tmdbType}?query=${encodeURIComponent(search)}&page=${page}`;
    } else {
      const tmdbType = type === 'movie' ? 'movie' : 'tv';
      endpoint = `/${tmdbType}/popular?page=${page}`;
    }

    const data = await tmdbFetch(endpoint);
    if (!data?.results) return res.json({ metas: [] });

    const metas = await Promise.all(
      data.results.slice(0, 20).map(async item => {
        const extData = await tmdbFetch(
          `/${type === 'movie' ? 'movie' : 'tv'}/${item.id}/external_ids?`
        );
        const imdbId = extData?.imdb_id;
        if (!imdbId) return null;
        return {
          id: imdbId,
          type,
          name: item.title || item.name,
          poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : undefined,
          background: item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : undefined,
          description: item.overview,
          releaseInfo: (item.release_date || item.first_air_date || '').slice(0, 4),
          imdbRating: item.vote_average ? item.vote_average.toFixed(1) : undefined,
        };
      })
    );

    res.json({ metas: metas.filter(Boolean) });
  } catch (e) {
    console.error('Catalog error:', e);
    res.json({ metas: [] });
  }
});

// ── Streams ───────────────────────────────────────────────────────────────────
app.get('/stream/:type/:id.json', async (req, res) => {
  const { type, id } = req.params;

  // IPTV stream
  if (type === 'tv') {
    try {
      const streams = await getIPTVStreams(M3U_URL, id);
      return res.json({ streams });
    } catch (e) {
      return res.json({ streams: [] });
    }
  }

  try {
    let imdbId, season, episode;

    if (type === 'movie') {
      imdbId = id;
    } else {
      const parts = id.split(':');
      imdbId = parts[0];
      season = parts[1] || '1';
      episode = parts[2] || '1';
    }

    const streams = await buildStreams(imdbId, season, episode);
    res.json({ streams });
  } catch (e) {
    console.error('Stream error:', e);
    res.json({ streams: [] });
  }
});

// ── Subtitles ─────────────────────────────────────────────────────────────────
app.get('/subtitles/:type/:id.json', (req, res) => res.json({ subtitles: [] }));

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 NeroTV running at http://localhost:${PORT}`);
  if (!M3U_URL) console.warn('⚠️  M3U_URL not set — IPTV will be empty');
  if (!TMDB_KEY) console.warn('⚠️  TMDB_API_KEY not set — metadata disabled');
});
