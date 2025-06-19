# Hive MCP Server

A Model Context Protocol (MCP) server for the Hive Intelligence API, providing real-time crypto and Web3 intelligence through simple prompt or chat-style inputs.

## Features

- **Prompt-based queries**: Ask direct questions about crypto/Web3 topics
- **Chat-style conversations**: Use conversational context for more nuanced queries
- **Source information**: Optionally include data sources in responses

## Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up your Hive API key:
   ```bash
   export HIVE_API_KEY=your_api_key_here
   ```

4. Build the server:
   ```bash
   npm run build
   ```

## Usage

### Running the Server

```bash
npm start
```

Or for development:
```bash
npm run dev
```

### MCP Client Configuration

Add this server to your MCP client configuration:

```json
{
  "mcpServers": {
    "hive": {
      "command": "npx",
      "args": ["-y", "hive-mcp"],
      "env": {
        "HIVE_API_KEY": "add_your_hive_api_key_here"
      }
    }
  }
}
```

## Available Tools

### `search`

Search for crypto and Web3 intelligence using the Hive Intelligence API.

**Parameters:**

- `prompt` (string, optional): A plaintext question or query about crypto/Web3 topics
- `messages` (array, optional): Array of chat messages for conversational queries
  - Each message should have `role` ("user" or "assistant") and `content` (string)
- `include_data_sources` (boolean, optional): Whether to include source information

**Note:** You must provide either `prompt` OR `messages`, but not both.

### Example Usage

#### Prompt-based Query
```json
{
  "name": "search",
  "arguments": {
    "prompt": "What is the current price of Ethereum?",
    "include_data_sources": true
  }
}
```

#### Chat-style Query
```json
{
  "name": "search",
  "arguments": {
    "messages": [
      {"role": "user", "content": "Price of"},
      {"role": "assistant", "content": "Price of what?"},
      {"role": "user", "content": "BTC"}
    ]
  }
}
```

## Environment Variables

- `HIVE_API_KEY` (required): Your Hive Intelligence API key

## Error Handling

The server provides detailed error messages for:
- Missing API key
- Invalid parameters
- API errors from Hive Intelligence
- Network issues

## Development

### Project Structure

```
hive-mcp-server/
├── src/
│   └── index.ts          # Main server implementation
├── build/                # Compiled JavaScript output
├── package.json          # Project configuration
├── tsconfig.json         # TypeScript configuration
└── README.md            # This file
```

### Building

```bash
npm run build
```

### Development Mode

```bash
npm run dev
```