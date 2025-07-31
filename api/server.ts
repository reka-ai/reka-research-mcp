import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

// Enhanced logging utility
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error ? (error.stack || error.message || error) : '');
  },
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
  },
  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
};

async function verifyClaimWithReka(claim: string, rekaApiKey: string): Promise<string> {
  logger.info('Starting claim verification', { claimLength: claim.length, hasApiKey: !!rekaApiKey });

  const requestPayload = {
    model: "reka-flash-research",
    messages: [
      {
        role: "user",
        content: `Analyze the given claim and provide a verification assessment. Return your response as a JSON object with 'verdict' (true/false/uncertain), 'confidence' (0-1), and 'reasoning' fields. Please verify this claim: ${claim}`
      }
    ]
  };

  logger.debug('Making request to Reka API', {
    model: requestPayload.model,
    messageCount: requestPayload.messages.length,
  });

  const response = await fetch("https://api.reka.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${rekaApiKey}`,
    },
    body: JSON.stringify(requestPayload)
  });

  logger.debug('Received response from Reka API', {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('Reka API request failed', {
      status: response.status,
      statusText: response.statusText,
      errorBody: errorText
    });
    throw new Error(`Reka API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const result = data.choices[0]?.message?.content || "No response received";

  logger.info('Successfully verified claim', {
    responseLength: result.length,
    hasChoices: !!data.choices?.length
  });

  return result;
}

async function findSimilarWithReka(target: string, attribute: string, rekaApiKey: string): Promise<string> {
  logger.info('Starting similarity search', { targetLength: target.length, attribute, hasApiKey: !!rekaApiKey });

  const requestPayload = {
    model: "reka-flash-research",
    messages: [
      {
        role: "user",
        content: `Find items similar to the given target based on the specified attribute. Provide a detailed analysis and list of similar items with explanations.

Target: ${target}
Attribute to compare: ${attribute}

Analyze the target and find similar items based on the "${attribute}" attribute. Provide concrete examples and explain why they are similar.`
      }
    ]
  };

  logger.debug('Making request to Reka API for similarity search', {
    model: requestPayload.model,
    messageCount: requestPayload.messages.length,
    attribute
  });

  const response = await fetch("https://api.reka.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${rekaApiKey}`,
    },
    body: JSON.stringify(requestPayload)
  });

  logger.debug('Received response from Reka API', {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('Reka API request failed', {
      status: response.status,
      statusText: response.statusText,
      errorBody: errorText
    });
    throw new Error(`Reka API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const result = data.choices[0]?.message?.content || "No response received";

  logger.info('Successfully found similar items', {
    responseLength: result.length,
    hasChoices: !!data.choices?.length
  });

  return result;
}

const handler = createMcpHandler(
  (server) => {
    logger.info('Initializing Reka Research MCP Server with multiple tools');

    server.tool(
      "verify_claim",
      "Fact-check and verify claims using agentic analysis. Returns a structured assessment with verdict, confidence level, and detailed reasoning.",
      { claim: z.string().describe("The claim or statement to fact-check and verify") },
      async ({ claim }, context) => {
        const startTime = Date.now();
        logger.info('Processing claim verification request', {
          claimPreview: claim.substring(0, 100) + (claim.length > 100 ? '...' : ''),
          claimLength: claim.length
        });
        try {
          // Get API key from environment variables first
          let rekaApiKey = process.env.REKA_API_KEY;

          // Extract API key from Authorization header
          if (context?.requestInfo?.headers) {
            // Support both header casings and array values
            const rawAuthHeader = context.requestInfo.headers['Authorization'] ?? context.requestInfo.headers['authorization'];
            if (rawAuthHeader) {
              const authHeader = Array.isArray(rawAuthHeader) ? rawAuthHeader[0] : rawAuthHeader;
              if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
                rekaApiKey = authHeader.slice(7);
                logger.debug('API key found in Authorization header');
              }
            }
          }

          if (!rekaApiKey) {
            logger.error('API key not found in environment or Authorization header');
            throw new Error("REKA_API_KEY must be provided via environment variable 'REKA_API_KEY' or Authorization header");
          }

          logger.debug('API key available, proceeding with verification');
          const verification = await verifyClaimWithReka(claim, rekaApiKey);

          const duration = Date.now() - startTime;
          logger.info('Claim verification completed successfully', {
            duration: `${duration}ms`,
            responseLength: verification.length
          });

          return {
            content: [{ type: "text", text: verification }],
          };
        } catch (error) {
          const duration = Date.now() - startTime;
          logger.error('Claim verification failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
            duration: `${duration}ms`,
            stack: error instanceof Error ? error.stack : undefined
          });

          return {
            content: [{
              type: "text",
              text: `Error verifying claim: ${error instanceof Error ? error.message : 'Unknown error'}`
            }],
          };
        }
      });

    server.tool(
      "find_similar",
      "Find items similar to a target based on a specific attribute using agentic analysis. Use this tool when you need to discover similar things, alternatives, or related items that share common characteristics.",
      {
        target: z.string().describe("The item, concept, or entity to find similarities for"),
        attribute: z.string().describe("The specific attribute or characteristic to compare (e.g., 'functionality', 'style', 'purpose', 'appearance', 'behavior')")
      },
      async ({ target, attribute }, context) => {
        const startTime = Date.now();
        logger.info('Processing similarity search request', {
          targetPreview: target.substring(0, 100) + (target.length > 100 ? '...' : ''),
          targetLength: target.length,
          attribute
        });

        try {
          // Get API key from environment variables first
          let rekaApiKey = process.env.REKA_API_KEY;

          // Extract API key from Authorization header
          if (context?.requestInfo?.headers) {
            // Support both header casings and array values
            const rawAuthHeader = context.requestInfo.headers['Authorization'] ?? context.requestInfo.headers['authorization'];
            if (rawAuthHeader) {
              const authHeader = Array.isArray(rawAuthHeader) ? rawAuthHeader[0] : rawAuthHeader;
              if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
                rekaApiKey = authHeader.slice(7);
                logger.debug('API key found in Authorization header');
              }
            }
          }

          if (!rekaApiKey) {
            logger.error('API key not found in environment or Authorization header');
            throw new Error("REKA_API_KEY must be provided via environment variable 'REKA_API_KEY' or Authorization header");
          }

          logger.debug('API key available, proceeding with similarity search');
          const similarItems = await findSimilarWithReka(target, attribute, rekaApiKey);

          const duration = Date.now() - startTime;
          logger.info('Similarity search completed successfully', {
            duration: `${duration}ms`,
            responseLength: similarItems.length
          });

          return {
            content: [{ type: "text", text: similarItems }],
          };
        } catch (error) {
          const duration = Date.now() - startTime;
          logger.error('Similarity search failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
            duration: `${duration}ms`,
            stack: error instanceof Error ? error.stack : undefined
          });

          return {
            content: [{
              type: "text",
              text: `Error finding similar items: ${error instanceof Error ? error.message : 'Unknown error'}`
            }],
          };
        }
      });
  },
  {},
  {
    // Optional redis config
    redisUrl: process.env.REDIS_URL,
    maxDuration: 180,
    verboseLogs: true,
  }
);

// Log server initialization
logger.info('Reka Research MCP Server initialized with multiple tools', {
  environment: process.env.NODE_ENV || 'development',
  hasRedis: !!process.env.REDIS_URL,
  hasRekaApiKey: !!process.env.REKA_API_KEY,
  supportedTools: ['verify_claim', 'find_similar']
});

export { handler as GET, handler as POST, handler as DELETE };
