export default async function handler(req, res) {
    const query = req.query || {};
    let targetUrl = query.url;

    if (!targetUrl) {
        try {
            const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
            targetUrl = parsedUrl.searchParams.get('url');
        } catch (e) {
            // ignore
        }
    }

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

    if (!targetUrl) {
        return res.status(400).json({ error: 'Missing url parameter' });
    }

    try {
        const fetchResponse = await fetch(targetUrl);

        if (!fetchResponse.ok) {
            return res.status(fetchResponse.status).json({ error: 'Upstream fetching error' });
        }

        // Convert to buffer to pipe the binary pdf data directly
        const arrayBuffer = await fetchResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        res.setHeader('Content-Type', fetchResponse.headers.get('content-type') || 'application/pdf');
        res.setHeader('Content-Length', buffer.length);
        res.status(200).send(buffer);
    } catch (error) {
        console.error('Serverless PDF proxy error:', error);
        return res.status(500).json({ error: 'Internal Server Error fetching PDF' });
    }
}
