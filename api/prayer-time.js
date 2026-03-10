export default async function handler(req, res) {
    // Support for both Express (req.query) and Next.js / Vercel (req.query)
    const query = req.query || {};
    let lat = query.lat;
    let lng = query.lng;

    // Fallback if req.query is not properly parsed
    if (!lat || !lng) {
        try {
            // Vercel / serverless environment provides req.url
            const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
            lat = parsedUrl.searchParams.get('lat') || lat;
            lng = parsedUrl.searchParams.get('lng') || lng;
        } catch (e) {
            // ignore
        }
    }

    const ISLAMIC_API_KEY = process.env.ISLAMIC_API_KEY || '3Z7SzW1uBjvE2S0pJjmJtyHF9fYZ9ficVNL2k2p9fMxhZhlR';

    // Enable CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (!lat || !lng) {
        return res.status(400).json({ error: 'Missing lat or lng parameter' });
    }

    try {
        const fetchUrl = `https://islamicapi.com/api/v1/prayer-time/?lat=${lat}&lon=${lng}&method=1&school=2&api_key=${ISLAMIC_API_KEY}`;
        const response = await fetch(fetchUrl);

        if (!response.ok) {
            return res.status(response.status).json({ error: 'Upstream API error' });
        }

        const data = await response.json();
        return res.status(200).json(data);
    } catch (error) {
        console.error('Serverless proxy error:', error);
        return res.status(500).json({ error: 'Internal Server Error fetching prayer times' });
    }
}
