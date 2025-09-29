import { createServer } from 'http';
import { GET, POST, DELETE } from './server.js';

const PORT = process.env.PORT || 3000;

// Simple router that mimics Next.js API routes
const server = createServer(async (req: any, res: any) => {
  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Create a Web API Request object
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const body = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => resolve(Buffer.concat(chunks)));
      req.on('error', reject);
    });

    const webRequest = new Request(url.toString(), {
      method: req.method,
      headers: req.headers as any,
      body: body.length > 0 ? new Uint8Array(body) : undefined,
    });

    // Call the appropriate handler
    let response: Response;
    if (req.method === 'GET' && GET) {
      response = await GET(webRequest);
    } else if (req.method === 'POST' && POST) {
      response = await POST(webRequest);
    } else if (req.method === 'DELETE' && DELETE) {
      response = await DELETE(webRequest);
    } else {
      res.writeHead(405);
      res.end('Method not allowed');
      return;
    }

    // Handle the Response object
    const status = response.status;
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    res.writeHead(status, headers);

    const responseBody = await response.text();
    res.end(responseBody);
  } catch (error) {
    console.error('Server error:', error);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }));
    }
  }
});

server.listen(PORT, () => {
  console.log(`MCP Server running on http://localhost:${PORT}`);
  console.log(`SSE endpoint: http://localhost:${PORT}/sse`);
  console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);
});