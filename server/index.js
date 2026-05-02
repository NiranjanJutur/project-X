/**
 * Project X — Multi-Broker Proxy Server
 * 
 * A lightweight Express server that acts as a CORS proxy for Indian stock broker APIs.
 * Users provide their own API keys/credentials — nothing is stored server-side.
 * 
 * Supported Brokers:
 *   - AngelOne (Smart API) — Full: Login, Holdings, LTP, Positions
 *   - Zerodha (Kite Connect) — Full: Session, Holdings, Quote, Positions
 *   - Upstox (v2 API) — Full: Token exchange, Holdings, Market Quote
 *   - Groww — Unofficial (holdings scraping via session cookie)
 * 
 * All credentials are passed per-request via headers. Nothing persisted.
 */

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { authenticator } = require('otplib');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());

// ─── Health Check ────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), brokers: ['angelone', 'zerodha', 'upstox', 'groww'] });
});

// ═══════════════════════════════════════════════════════════════════
//  ANGELONE SMART API
// ═══════════════════════════════════════════════════════════════════

const ANGELONE_BASE = 'https://apiconnect.angelone.in';

/**
 * POST /api/angelone/login
 * Body: { clientCode, mpin, totpSecret, apiKey }
 * Returns: { jwtToken, refreshToken, feedToken }
 */
app.post('/api/angelone/login', async (req, res) => {
  try {
    const { clientCode, mpin, totpSecret, apiKey } = req.body;
    if (!clientCode || !mpin || !totpSecret || !apiKey) {
      return res.status(400).json({ error: 'Missing fields: clientCode, mpin, totpSecret, apiKey' });
    }

    // Generate TOTP from secret
    const totp = authenticator.generate(totpSecret);

    const response = await fetch(`${ANGELONE_BASE}/rest/auth/angelbroking/user/v1/loginByPassword`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-UserType': 'USER',
        'X-SourceID': 'WEB',
        'X-ClientLocalIP': '127.0.0.1',
        'X-ClientPublicIP': '127.0.0.1',
        'X-MACAddress': '00:00:00:00:00:00',
        'X-PrivateKey': apiKey,
      },
      body: JSON.stringify({ clientcode: clientCode, password: mpin, totp }),
    });

    const data = await response.json();
    if (!data.data || !data.data.jwtToken) {
      return res.status(401).json({ error: data.message || 'Login failed', raw: data });
    }

    res.json({
      jwtToken: data.data.jwtToken,
      refreshToken: data.data.refreshToken,
      feedToken: data.data.feedToken,
    });
  } catch (err) {
    res.status(500).json({ error: 'AngelOne login failed', detail: err.message });
  }
});

/**
 * GET /api/angelone/holdings
 * Headers: x-api-key, x-jwt-token
 */
app.get('/api/angelone/holdings', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    const jwt = req.headers['x-jwt-token'];
    if (!apiKey || !jwt) return res.status(400).json({ error: 'Missing x-api-key or x-jwt-token header' });

    const response = await fetch(`${ANGELONE_BASE}/rest/secure/angelbroking/portfolio/v1/getHolding`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-UserType': 'USER',
        'X-SourceID': 'WEB',
        'X-ClientLocalIP': '127.0.0.1',
        'X-ClientPublicIP': '127.0.0.1',
        'X-MACAddress': '00:00:00:00:00:00',
        'X-PrivateKey': apiKey,
        'Authorization': `Bearer ${jwt}`,
      },
    });

    const data = await response.json();
    if (!data.data) {
      return res.status(502).json({ error: 'Failed to fetch holdings', raw: data });
    }

    // Normalize to common format
    const holdings = (data.data || []).map(h => ({
      symbol: h.tradingsymbol,
      exchange: h.exchange,
      isin: h.isin,
      quantity: h.quantity,
      avgPrice: h.averageprice,
      ltp: h.ltp,
      currentValue: h.quantity * h.ltp,
      investedValue: h.quantity * h.averageprice,
      pnl: (h.ltp - h.averageprice) * h.quantity,
      pnlPercent: h.averageprice > 0 ? ((h.ltp - h.averageprice) / h.averageprice) * 100 : 0,
      dayChange: h.close > 0 ? ((h.ltp - h.close) / h.close) * 100 : 0,
    }));

    res.json({ holdings, count: holdings.length });
  } catch (err) {
    res.status(500).json({ error: 'AngelOne holdings fetch failed', detail: err.message });
  }
});

/**
 * POST /api/angelone/ltp
 * Headers: x-api-key, x-jwt-token
 * Body: { exchange, symbols: ["INFY", "RELIANCE"] }
 */
app.post('/api/angelone/ltp', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    const jwt = req.headers['x-jwt-token'];
    const { exchange = 'NSE', symbols } = req.body;
    if (!apiKey || !jwt) return res.status(400).json({ error: 'Missing x-api-key or x-jwt-token' });

    const exchangeTokens = symbols.map(s => ({
      exchange,
      tradingsymbol: s,
    }));

    const response = await fetch(`${ANGELONE_BASE}/rest/secure/angelbroking/market/v1/quote/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-UserType': 'USER',
        'X-SourceID': 'WEB',
        'X-ClientLocalIP': '127.0.0.1',
        'X-ClientPublicIP': '127.0.0.1',
        'X-MACAddress': '00:00:00:00:00:00',
        'X-PrivateKey': apiKey,
        'Authorization': `Bearer ${jwt}`,
      },
      body: JSON.stringify({ mode: 'LTP', exchangeTokens }),
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'AngelOne LTP fetch failed', detail: err.message });
  }
});

/**
 * GET /api/angelone/positions
 * Headers: x-api-key, x-jwt-token
 */
app.get('/api/angelone/positions', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    const jwt = req.headers['x-jwt-token'];
    if (!apiKey || !jwt) return res.status(400).json({ error: 'Missing headers' });

    const response = await fetch(`${ANGELONE_BASE}/rest/secure/angelbroking/order/v1/getPosition`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-UserType': 'USER',
        'X-SourceID': 'WEB',
        'X-ClientLocalIP': '127.0.0.1',
        'X-ClientPublicIP': '127.0.0.1',
        'X-MACAddress': '00:00:00:00:00:00',
        'X-PrivateKey': apiKey,
        'Authorization': `Bearer ${jwt}`,
      },
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'AngelOne positions failed', detail: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
//  ZERODHA KITE CONNECT
// ═══════════════════════════════════════════════════════════════════

const ZERODHA_BASE = 'https://api.kite.trade';
const ZERODHA_LOGIN = 'https://kite.zerodha.com/connect/login';

/**
 * GET /api/zerodha/login-url
 * Query: apiKey
 * Returns the URL to redirect user for OAuth login
 */
app.get('/api/zerodha/login-url', (req, res) => {
  const { apiKey } = req.query;
  if (!apiKey) return res.status(400).json({ error: 'Missing apiKey query param' });
  res.json({ url: `${ZERODHA_LOGIN}?v=3&api_key=${apiKey}` });
});

/**
 * POST /api/zerodha/session
 * Body: { apiKey, apiSecret, requestToken }
 * Returns: { accessToken, publicToken, userId }
 */
app.post('/api/zerodha/session', async (req, res) => {
  try {
    const { apiKey, apiSecret, requestToken } = req.body;
    if (!apiKey || !apiSecret || !requestToken) {
      return res.status(400).json({ error: 'Missing fields: apiKey, apiSecret, requestToken' });
    }

    // Generate checksum: SHA-256 of api_key + request_token + api_secret
    const crypto = require('crypto');
    const checksum = crypto.createHash('sha256').update(apiKey + requestToken + apiSecret).digest('hex');

    const response = await fetch(`${ZERODHA_BASE}/session/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `api_key=${apiKey}&request_token=${requestToken}&checksum=${checksum}`,
    });

    const data = await response.json();
    if (data.status === 'error') {
      return res.status(401).json({ error: data.message });
    }

    res.json({
      accessToken: data.data.access_token,
      publicToken: data.data.public_token,
      userId: data.data.user_id,
    });
  } catch (err) {
    res.status(500).json({ error: 'Zerodha session failed', detail: err.message });
  }
});

/**
 * GET /api/zerodha/holdings
 * Headers: x-api-key, x-access-token
 */
app.get('/api/zerodha/holdings', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    const accessToken = req.headers['x-access-token'];
    if (!apiKey || !accessToken) return res.status(400).json({ error: 'Missing headers' });

    const response = await fetch(`${ZERODHA_BASE}/portfolio/holdings`, {
      headers: { 'Authorization': `token ${apiKey}:${accessToken}` },
    });

    const data = await response.json();
    if (data.status === 'error') return res.status(502).json({ error: data.message });

    const holdings = (data.data || []).map(h => ({
      symbol: h.tradingsymbol,
      exchange: h.exchange,
      isin: h.isin,
      quantity: h.quantity,
      avgPrice: h.average_price,
      ltp: h.last_price,
      currentValue: h.quantity * h.last_price,
      investedValue: h.quantity * h.average_price,
      pnl: h.pnl,
      pnlPercent: h.average_price > 0 ? ((h.last_price - h.average_price) / h.average_price) * 100 : 0,
      dayChange: h.close_price > 0 ? ((h.last_price - h.close_price) / h.close_price) * 100 : 0,
    }));

    res.json({ holdings, count: holdings.length });
  } catch (err) {
    res.status(500).json({ error: 'Zerodha holdings failed', detail: err.message });
  }
});

/**
 * GET /api/zerodha/positions
 * Headers: x-api-key, x-access-token
 */
app.get('/api/zerodha/positions', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    const accessToken = req.headers['x-access-token'];
    if (!apiKey || !accessToken) return res.status(400).json({ error: 'Missing headers' });

    const response = await fetch(`${ZERODHA_BASE}/portfolio/positions`, {
      headers: { 'Authorization': `token ${apiKey}:${accessToken}` },
    });

    const data = await response.json();
    if (data.status === 'error') return res.status(502).json({ error: data.message });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Zerodha positions failed', detail: err.message });
  }
});

/**
 * POST /api/zerodha/quote
 * Headers: x-api-key, x-access-token
 * Body: { instruments: ["NSE:INFY", "NSE:RELIANCE"] }
 */
app.post('/api/zerodha/quote', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    const accessToken = req.headers['x-access-token'];
    const { instruments } = req.body;
    if (!apiKey || !accessToken) return res.status(400).json({ error: 'Missing headers' });

    const query = instruments.map(i => `i=${i}`).join('&');
    const response = await fetch(`${ZERODHA_BASE}/quote?${query}`, {
      headers: { 'Authorization': `token ${apiKey}:${accessToken}` },
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Zerodha quote failed', detail: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
//  UPSTOX v2 API
// ═══════════════════════════════════════════════════════════════════

const UPSTOX_BASE = 'https://api.upstox.com/v2';
const UPSTOX_AUTH = 'https://api.upstox.com/v2/login/authorization/token';

/**
 * GET /api/upstox/login-url
 * Query: apiKey, redirectUri
 */
app.get('/api/upstox/login-url', (req, res) => {
  const { apiKey, redirectUri = 'http://localhost:3001/api/upstox/callback' } = req.query;
  if (!apiKey) return res.status(400).json({ error: 'Missing apiKey' });
  res.json({
    url: `https://api.upstox.com/v2/login/authorization/dialog?response_type=code&client_id=${apiKey}&redirect_uri=${encodeURIComponent(redirectUri)}`,
  });
});

/**
 * GET /api/upstox/callback — OAuth callback handler
 */
app.get('/api/upstox/callback', (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Missing authorization code');
  // Return the code to the user to exchange for token
  res.send(`
    <html><body style="background:#0b0e1a;color:#fff;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column">
      <h2>✅ Authorization Successful</h2>
      <p>Your auth code: <code style="background:#1a1f33;padding:8px 16px;border-radius:8px;font-size:1.2rem">${code}</code></p>
      <p>Copy this code and paste it in the app to complete connection.</p>
    </body></html>
  `);
});

/**
 * POST /api/upstox/token
 * Body: { apiKey, apiSecret, code, redirectUri }
 */
app.post('/api/upstox/token', async (req, res) => {
  try {
    const { apiKey, apiSecret, code, redirectUri = 'http://localhost:3001/api/upstox/callback' } = req.body;
    if (!apiKey || !apiSecret || !code) {
      return res.status(400).json({ error: 'Missing fields: apiKey, apiSecret, code' });
    }

    const response = await fetch(UPSTOX_AUTH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
      body: `code=${code}&client_id=${apiKey}&client_secret=${apiSecret}&redirect_uri=${encodeURIComponent(redirectUri)}&grant_type=authorization_code`,
    });

    const data = await response.json();
    if (!data.access_token) {
      return res.status(401).json({ error: data.message || 'Token exchange failed', raw: data });
    }

    res.json({ accessToken: data.access_token, expiresIn: data.expires_in });
  } catch (err) {
    res.status(500).json({ error: 'Upstox token exchange failed', detail: err.message });
  }
});

/**
 * GET /api/upstox/holdings
 * Headers: x-access-token
 */
app.get('/api/upstox/holdings', async (req, res) => {
  try {
    const accessToken = req.headers['x-access-token'];
    if (!accessToken) return res.status(400).json({ error: 'Missing x-access-token' });

    const response = await fetch(`${UPSTOX_BASE}/portfolio/long-term-holdings`, {
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' },
    });

    const data = await response.json();
    if (data.status !== 'success') return res.status(502).json({ error: data.message || 'Holdings fetch failed' });

    const holdings = (data.data || []).map(h => ({
      symbol: h.tradingsymbol || h.trading_symbol,
      exchange: h.exchange,
      isin: h.isin,
      quantity: h.quantity,
      avgPrice: h.average_price,
      ltp: h.last_price || h.ltp,
      currentValue: h.quantity * (h.last_price || h.ltp || 0),
      investedValue: h.quantity * h.average_price,
      pnl: h.pnl || ((h.last_price || h.ltp || 0) - h.average_price) * h.quantity,
      pnlPercent: h.average_price > 0 ? (((h.last_price || h.ltp || 0) - h.average_price) / h.average_price) * 100 : 0,
      dayChange: h.close_price > 0 ? (((h.last_price || h.ltp || 0) - h.close_price) / h.close_price) * 100 : 0,
    }));

    res.json({ holdings, count: holdings.length });
  } catch (err) {
    res.status(500).json({ error: 'Upstox holdings failed', detail: err.message });
  }
});

/**
 * GET /api/upstox/positions
 * Headers: x-access-token
 */
app.get('/api/upstox/positions', async (req, res) => {
  try {
    const accessToken = req.headers['x-access-token'];
    if (!accessToken) return res.status(400).json({ error: 'Missing x-access-token' });

    const response = await fetch(`${UPSTOX_BASE}/portfolio/short-term-positions`, {
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' },
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Upstox positions failed', detail: err.message });
  }
});

/**
 * POST /api/upstox/market-quote
 * Headers: x-access-token
 * Body: { symbols: ["NSE_EQ|INE009A01021"] }
 */
app.post('/api/upstox/market-quote', async (req, res) => {
  try {
    const accessToken = req.headers['x-access-token'];
    const { symbols } = req.body;
    if (!accessToken) return res.status(400).json({ error: 'Missing x-access-token' });

    const query = symbols.map(s => `instrument_key=${s}`).join('&');
    const response = await fetch(`${UPSTOX_BASE}/market-quote/quotes?${query}`, {
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' },
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Upstox market quote failed', detail: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
//  GROWW (Unofficial — Session Cookie Approach)
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /api/groww/holdings
 * Headers: x-session-token (user's Groww auth cookie)
 * ⚠️ UNOFFICIAL — May break without notice
 */
app.get('/api/groww/holdings', async (req, res) => {
  try {
    const sessionToken = req.headers['x-session-token'];
    if (!sessionToken) return res.status(400).json({ error: 'Missing x-session-token header' });

    const response = await fetch('https://groww.in/v1/api/stocks_data/v1/tr_live_holdings/holdings', {
      headers: {
        'Accept': 'application/json',
        'Cookie': `auth_token=${sessionToken}`,
        'User-Agent': 'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Groww API returned error', status: response.status });
    }

    const data = await response.json();
    const holdings = (data.holdings || []).map(h => ({
      symbol: h.tradingSymbol || h.stockSymbol,
      exchange: h.exchange || 'NSE',
      isin: h.isinNumber || h.isin,
      quantity: h.totalQuantity || h.quantity,
      avgPrice: h.avgCostPrice || h.averagePrice,
      ltp: h.marketPrice || h.ltp,
      currentValue: (h.totalQuantity || h.quantity) * (h.marketPrice || h.ltp || 0),
      investedValue: (h.totalQuantity || h.quantity) * (h.avgCostPrice || h.averagePrice || 0),
      pnl: h.totalPnl || 0,
      pnlPercent: h.totalPnlPercentage || 0,
      dayChange: h.dayPnlPercentage || 0,
    }));

    res.json({ holdings, count: holdings.length, _disclaimer: 'Unofficial API — may break without notice' });
  } catch (err) {
    res.status(500).json({ error: 'Groww holdings failed', detail: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
//  UNIVERSAL QUOTE PROXY (Yahoo Finance fallback)
// ═══════════════════════════════════════════════════════════════════

app.get('/api/quote/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    const data = await response.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return res.status(404).json({ error: 'Symbol not found' });

    res.json({
      symbol: meta.symbol,
      price: meta.regularMarketPrice,
      previousClose: meta.previousClose,
      changePercent: meta.previousClose > 0
        ? ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100
        : 0,
      currency: meta.currency,
      exchange: meta.exchangeName,
    });
  } catch (err) {
    res.status(500).json({ error: 'Quote fetch failed', detail: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
//  START SERVER
// ═══════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log(`\n🚀 Project X Broker Proxy running on http://localhost:${PORT}`);
  console.log(`📊 Health: http://localhost:${PORT}/api/health`);
  console.log(`\nSupported Brokers:`);
  console.log(`  • AngelOne  — POST /api/angelone/login, GET /api/angelone/holdings`);
  console.log(`  • Zerodha   — POST /api/zerodha/session, GET /api/zerodha/holdings`);
  console.log(`  • Upstox    — POST /api/upstox/token, GET /api/upstox/holdings`);
  console.log(`  • Groww     — GET /api/groww/holdings (unofficial)`);
  console.log(`  • Quotes    — GET /api/quote/:symbol (Yahoo Finance)\n`);
});
