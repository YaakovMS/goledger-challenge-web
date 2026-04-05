import type { VercelRequest, VercelResponse } from '@vercel/node';

const API_BASE_URL = 'http://ec2-50-19-36-138.compute-1.amazonaws.com';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Get the full URL path after /api/proxy
  const fullUrl = req.url || '';
  // Extract path: /api/proxy/api/query/search -> /api/query/search
  const targetPath = fullUrl.replace(/^\/api\/proxy/, '') || '/';
  // The targetPath already includes /api, so we don't add it again
  const targetUrl = `${API_BASE_URL}${targetPath}`;

  console.log('Request URL:', fullUrl);
  console.log('Proxying to:', targetUrl);

  try {
    const fetchOptions: RequestInit = {
      method: req.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*',
      },
    };

    // Forward authorization header
    if (req.headers.authorization) {
      fetchOptions.headers = {
        ...fetchOptions.headers,
        'Authorization': req.headers.authorization,
      };
    }

    // Add body for non-GET requests
    if (req.method !== 'GET' && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.json();
    
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      error: 'Proxy request failed', 
      details: error instanceof Error ? error.message : String(error),
      targetUrl 
    });
  }
}
