# Reka Research MCP Server

A Model Context Protocol (MCP) server providing AI-powered fact-checking and similarity search using Reka Research API. This server is hosted remotely and ready to use - no local installation required!

## Prerequisites

- Get your Reka API key at [platform.reka.ai](https://platform.reka.ai)
- Your API key should have access to `reka-flash-research` model

## 🚀 Using the Hosted MCP Server

The Reka Research MCP server is hosted at `https://mcp-server-nine-bice.vercel.app/mcp` and ready to use. Simply configure your MCP client to connect to this endpoint.

### Claude Desktop

Add this configuration to your Claude Desktop `claude_desktop_config.json` file:

```jsonc
{
  "mcpServers": {
    "reka-research": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://reka-research-mcp.vercel.app/mcp",
        "--header",
        "Authorization: Bearer $REKA_API_KEY"
      ],
      "env": {
        "REKA_API_KEY": "<your-reka-api-key-here>"
      }
    }
  }
}
```

### VS Code with MCP Extension

Configure the MCP extension in VS Code by adding this to your settings:

```jsonc
{
    "servers": {
        "reka-research": {
            "url": "https://mcp-server-nine-bice.vercel.app/mcp",
            "type": "http", 
            "headers": {
                "Authorization": "Bearer ${input:reka-api-key}"
            }
        }
    },
    "inputs": [
        {
            "type": "promptString",
            "id": "reka-api-key",
            "description": "Reka API Key",
            "password": true
        }
    ]
}
```

## 🛠️ Available Tools

### `verify_claim`

Fact-check statements and claims using advanced AI analysis.

- **Input**: `claim` (string) - The statement to verify
- **Output**: JSON with verdict (true/false/uncertain), confidence score (0-1), and detailed reasoning

**Example usage:**

```
Can you verify this claim: "The Great Wall of China is visible from space with the naked eye"
```

### `find_similar`

Find similar items based on specific attributes using agentic analysis.

- **Input**:
  - `target` (string) - The item to find similarities for
  - `attribute` (string) - The comparison attribute (e.g., "functionality", "style", "purpose")

- **Output**: Analysis with similar items and explanations

**Example usage:**

```
Find items similar to "ChatGPT" based on "functionality"
```

## 🔧 Troubleshooting

- **Authentication errors**: Ensure your Reka API key is valid and has access to the `reka-flash-research` model
- **Connection issues**: Verify the server URL is correct: `https://mcp-server-nine-bice.vercel.app/mcp`
- **Tool not found**: Make sure your MCP client supports the tools interface

---

## 🏠 Local Development

For developers who want to run the server locally or contribute to the project.

### Prerequisites

- Node.js 18+
- pnpm package manager
- Reka API key (set as `REKA_API_KEY` environment variable)

### Setup

```sh
# Clone the repository
git clone  https://github.com/reka-ai/reka-research-mcp.git

# Install dependencies
pnpm install

# Set your API key
export REKA_API_KEY="your-reka-api-key"

# Start development server
pnpm run dev
```

### Available Scripts

```sh
pnpm install           # Install dependencies
pnpm run build         # Type check the code
pnpm run test          # Test with remote server
pnpm run test:http     # Test HTTP endpoints locally
pnpm run deploy        # Deploy to Vercel
```

### Local Testing

Test the local server:

```sh
# Start local development server (usually on port 3000)
pnpm run dev

# In another terminal, test the MCP endpoints
node scripts/test-client.mjs http://localhost:3000

# Test HTTP endpoints directly
node scripts/test-streamable-http-client.mjs
```

### Deployment

The server is automatically deployed to Vercel. For manual deployment:

```sh
pnpm run deploy
```
