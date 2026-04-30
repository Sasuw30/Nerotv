function landingTemplate(manifest) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${manifest.name} - Stremio Addon</title>
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;400;600&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    html {
      background: #000;
      min-height: 100%;
    }

    body {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      font-family: 'Rajdhani', sans-serif;
      color: #fff;
      padding: 24px;
      position: relative;
      overflow-x: hidden;
    }

    /* Animated background blobs */
    .bg {
      position: fixed;
      inset: 0;
      z-index: 0;
      background: #000;
      overflow: hidden;
    }
    .bg::before {
      content: '';
      position: absolute;
      width: 600px; height: 600px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(255,100,0,0.12) 0%, transparent 70%);
      top: -100px; left: -100px;
      animation: drift1 8s ease-in-out infinite alternate;
    }
    .bg::after {
      content: '';
      position: absolute;
      width: 500px; height: 500px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(255,0,128,0.1) 0%, transparent 70%);
      bottom: -100px; right: -100px;
      animation: drift2 10s ease-in-out infinite alternate;
    }
    .bg-cyan {
      position: fixed;
      width: 400px; height: 400px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(0,200,255,0.07) 0%, transparent 70%);
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      z-index: 0;
      animation: drift3 12s ease-in-out infinite alternate;
    }

    /* Scanlines */
    .scanlines {
      position: fixed;
      inset: 0;
      z-index: 0;
      background: repeating-linear-gradient(
        0deg, transparent, transparent 2px,
        rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px
      );
      pointer-events: none;
    }

    @keyframes drift1 { to { transform: translate(80px, 60px); } }
    @keyframes drift2 { to { transform: translate(-60px, -80px); } }
    @keyframes drift3 { to { transform: translate(-50%, -50%) scale(1.3); } }

    /* Card */
    .card {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 460px;
      background: rgba(255,255,255,0.025);
      border: 1px solid rgba(255,100,0,0.25);
      border-radius: 18px;
      padding: 40px 36px;
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      box-shadow:
        0 0 50px rgba(255,100,0,0.08),
        0 0 100px rgba(255,0,128,0.05),
        inset 0 1px 0 rgba(255,255,255,0.06);
      animation: slideUp 0.7s cubic-bezier(0.16,1,0.3,1) both;
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(30px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    /* Logo */
    .logo-wrap {
      width: 88px; height: 88px;
      margin: 0 auto 24px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      background: rgba(255,100,0,0.06);
      border: 1px solid rgba(255,100,0,0.3);
      box-shadow: 0 0 24px rgba(255,100,0,0.2), 0 0 48px rgba(255,0,128,0.1);
      animation: pulse 3s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 24px rgba(255,100,0,0.2), 0 0 48px rgba(255,0,128,0.1); }
      50%       { box-shadow: 0 0 36px rgba(255,100,0,0.35), 0 0 70px rgba(255,0,128,0.18); }
    }
    .logo-wrap svg { width: 48px; height: 48px; }

    /* Title */
    h1 {
      font-family: 'Orbitron', sans-serif;
      font-size: clamp(24px, 5vw, 32px);
      font-weight: 900;
      letter-spacing: 4px;
      text-align: center;
      text-transform: uppercase;
      background: linear-gradient(90deg, #ff6400 0%, #ff0080 50%, #00c8ff 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 4px;
    }

    .version {
      font-family: 'Orbitron', sans-serif;
      font-size: 11px;
      letter-spacing: 3px;
      color: rgba(255,255,255,0.35);
      text-align: center;
      margin-bottom: 24px;
    }

    /* Divider */
    .divider {
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(255,100,0,0.5), rgba(255,0,128,0.4), transparent);
      border: none;
      margin: 20px 0;
    }

    /* Description */
    .desc {
      font-size: 14px;
      font-weight: 300;
      color: rgba(255,255,255,0.6);
      line-height: 1.7;
      text-align: center;
      margin-bottom: 0;
    }

    /* Feature badges */
    .badges {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: center;
      margin: 4px 0;
    }
    .badge {
      font-family: 'Orbitron', sans-serif;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      padding: 5px 12px;
      border-radius: 4px;
      border: 1px solid rgba(255,100,0,0.3);
      background: rgba(255,100,0,0.07);
      color: rgba(255,255,255,0.65);
    }

    /* Info box */
    .info-box {
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 10px;
      padding: 14px 16px;
      font-size: 13px;
      color: rgba(255,255,255,0.5);
      line-height: 1.6;
    }
    .info-box a {
      color: #ff6400;
      text-decoration: none;
      font-weight: 600;
    }
    .info-box a:hover { color: #ff0080; }

    /* Install button */
    .install-btn {
      display: block;
      width: 100%;
      margin-top: 24px;
      padding: 16px;
      border: none;
      border-radius: 10px;
      background: linear-gradient(90deg, #ff6400, #ff0080);
      color: #fff;
      font-family: 'Orbitron', sans-serif;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 4px;
      text-transform: uppercase;
      text-align: center;
      text-decoration: none;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      box-shadow: 0 0 24px rgba(255,100,0,0.3), 0 0 48px rgba(255,0,128,0.15);
      transition: all 0.25s ease;
    }
    .install-btn::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
      transform: translateX(-100%);
      transition: transform 0.5s ease;
    }
    .install-btn:hover::before { transform: translateX(100%); }
    .install-btn:hover {
      box-shadow: 0 0 36px rgba(255,100,0,0.5), 0 0 72px rgba(255,0,128,0.25);
      transform: translateY(-2px);
    }
    .install-btn:active { transform: translateY(0); }

    /* Footer */
    .footer {
      text-align: center;
      margin-top: 20px;
      font-size: 12px;
      color: rgba(255,255,255,0.25);
      font-family: 'Rajdhani', sans-serif;
    }
  </style>
</head>
<body>
  <div class="bg"></div>
  <div class="bg-cyan"></div>
  <div class="scanlines"></div>

  <div class="card">

    <!-- Logo -->
    <div class="logo-wrap">
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="22" stroke="url(#g1)" stroke-width="2"/>
        <path d="M18 14l16 10-16 10V14z" fill="url(#g2)"/>
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="48" y2="48">
            <stop offset="0%" stop-color="#ff6400"/>
            <stop offset="100%" stop-color="#ff0080"/>
          </linearGradient>
          <linearGradient id="g2" x1="18" y1="14" x2="34" y2="34">
            <stop offset="0%" stop-color="#ff6400"/>
            <stop offset="100%" stop-color="#ff0080"/>
          </linearGradient>
        </defs>
      </svg>
    </div>

    <!-- Title -->
    <h1>${manifest.name}</h1>
    <div class="version">v${manifest.version} &nbsp;·&nbsp; Stremio Addon</div>

    <hr class="divider">

    <!-- Description -->
    <p class="desc">${manifest.description}</p>

    <hr class="divider">

    <!-- Feature badges -->
    <div class="badges">
      <span class="badge">🎬 Movies</span>
      <span class="badge">📺 Series</span>
      <span class="badge">🌐 VidSrc.me</span>
      <span class="badge">🗂 TMDB</span>
      <span class="badge">💬 Subtitles</span>
    </div>

    <hr class="divider">

    <!-- Info -->
    <div class="info-box">
      ⚡ Streams are provided via <strong>VidSrc.me</strong> embeds. No sign-up required. 
      For best results, open streams in your browser or use Stremio's web player.
    </div>

    <!-- Install button -->
    <a id="installLink" class="install-btn" href="#">⚡ Install Addon</a>

    <!-- Footer -->
    <div class="footer">NeroTV &nbsp;·&nbsp; Powered by VidSrc &amp; TMDB</div>

  </div>

  <script>
    const base = window.location.host;
    document.getElementById('installLink').href = 'stremio://' + base + '/manifest.json';
  </script>
</body>
</html>`;
}

module.exports = { landingTemplate };
