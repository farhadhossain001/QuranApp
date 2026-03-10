export default async function handler(req, res) {
    const query = req.query || {};
    let language = query.language || 'en';

    if (!query.language) {
        try {
            const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
            language = parsedUrl.searchParams.get('language') || language;
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

    try {
        const fetchUrl = `https://islamicapi.com/api/v1/asma-ul-husna/?language=${language}&api_key=${ISLAMIC_API_KEY}`;
        const response = await fetch(fetchUrl);

        if (!response.ok) {
            return res.status(response.status).json({ error: 'Upstream API error' });
        }

        const data = await response.json();
        return res.status(200).json(data);
    } catch (error) {
        console.error('Serverless proxy error:', error);
        return res.status(500).json({ error: 'Internal Server Error fetching Asma-ul-Husna' });
    }
}
