import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const origin = process.argv[2] || "https://reka-research-mcp-server.vercel.app";

async function main() {
  console.log(`[INFO] ${new Date().toISOString()} - Connecting to Reka Research MCP Server at ${origin}`);
  
  const transport = new SSEClientTransport(new URL(`${origin}/sse`));

  const client = new Client(
    {
      name: "reka-research-test-client",
      version: "1.0.0",
    },
    {
      capabilities: {
        prompts: {},
        resources: {},
        tools: {},
      },
    }
  );

  try {
    await client.connect(transport);
    console.log(`[INFO] ${new Date().toISOString()} - Connected successfully`);
    console.log("Server capabilities:", client.getServerCapabilities());

    const result = await client.listTools();
    console.log(`[INFO] ${new Date().toISOString()} - Available tools:`, result);
    
    // Test the verify_claim tool if available
    if (result.tools?.some(tool => tool.name === 'verify_claim')) {
      console.log(`[INFO] ${new Date().toISOString()} - Testing verify_claim tool...`);
      
      const testClaim = "The Earth is round";
      const verificationResult = await client.callTool({
        name: "verify_claim",
        arguments: { claim: testClaim }
      });
      
      console.log(`[INFO] ${new Date().toISOString()} - Verification result for "${testClaim}":`, verificationResult);
    }
  } catch (error) {
    console.error(`[ERROR] ${new Date().toISOString()} - Connection failed:`, error.message);
    process.exit(1);
  }
}

main();
