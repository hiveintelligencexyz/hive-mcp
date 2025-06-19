#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { HiveSearchClient } from 'hive-intelligence';
import type { HiveSearchRequest, HiveSearchResponse } from 'hive-intelligence';
import dotenv from 'dotenv';

dotenv.config();

export class HiveMCPServer {
  private server: Server;
  private hiveClient: HiveSearchClient;

  constructor() {
    this.server = new Server(
      {
        name: "hive-mcp-server",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Get API key from environment
    const apiKey = process.env.HIVE_API_KEY;
    if (!apiKey) {
      throw new Error("HIVE_API_KEY environment variable is required");
    }
    
    console.error(`[DEBUG] Initializing Hive client with API key: ${apiKey.substring(0, 8)}...`);
    this.hiveClient = new HiveSearchClient(apiKey);
    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "search",
            description: "Search for crypto and Web3 intelligence using the Hive Intelligence API. Supports both prompt-based and chat-style queries. Get answers to questions on Blockchain Data Querying, DeFi Analytics, Wallet & Portfolio Tracking, Market Data (like price and volume), and Cross-chain Data Aggregation.",
            inputSchema: {
              type: "object",
              properties: {
                prompt: {
                  type: "string",
                  description: "A plaintext question or query about crypto/Web3 topics",
                },
                messages: {
                  type: "array",
                  description: "Array of chat messages for conversational queries",
                  items: {
                    type: "object",
                    properties: {
                      role: {
                        type: "string",
                        enum: ["user", "assistant"],
                        description: "The role of the message sender",
                      },
                      content: {
                        type: "string",
                        description: "The content of the message",
                      },
                    },
                    required: ["role", "content"],
                  },
                },
                include_data_sources: {
                  type: "boolean",
                  description: "Whether to include source information in the response",
                },
              },
              oneOf: [
                { required: ["prompt"] },
                { required: ["messages"] }
              ],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name !== "search") {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
      }

      const args = request.params.arguments;

      // Check if arguments exist
      if (!args) {
        throw new McpError(
          ErrorCode.InvalidParams,
          "No arguments provided"
        );
      }

      // Validate that either prompt or messages is provided
      if (!args.prompt && !args.messages) {
        throw new McpError(
          ErrorCode.InvalidParams,
          "Either 'prompt' or 'messages' must be provided"
        );
      }

      if (args.prompt && args.messages) {
        throw new McpError(
          ErrorCode.InvalidParams,
          "Only one of 'prompt' or 'messages' should be provided, not both"
        );
      }

      try {
        // Build the search request
        const searchRequest: HiveSearchRequest = {};

        if (args.prompt) {
          searchRequest.prompt = args.prompt as string;
        }

        if (args.messages) {
          searchRequest.messages = args.messages as Array<{
            role: 'user' | 'assistant';
            content: string;
          }>;
        }

        if (typeof args.include_data_sources === 'boolean') {
          searchRequest.include_data_sources = args.include_data_sources;
        }

        // Perform the search with timeout handling
        console.error(`[DEBUG] Making Hive API request: ${JSON.stringify(searchRequest)}`);
        
        const searchPromise = this.hiveClient.search(searchRequest);
        // const timeoutPromise = new Promise<never>((_, reject) => {
        //   setTimeout(() => reject(new Error('Hive API request timed out after 30 seconds')), 30000);
        // });
        
        const response: HiveSearchResponse = await searchPromise //await Promise.race([searchPromise, timeoutPromise]);
        let res: Record<string, any> = {
          response: response.isAdditionalDataRequired
            ? response.isAdditionalDataRequired
            : response.response
        };

        if (!response.isAdditionalDataRequired && response.data_sources) {
          res.data_sources = response.data_sources;
        }

        console.error(`[DEBUG] Received Hive API response`);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(res, null, 2),
            },
          ],
        };
      } catch (error: any) {
        console.error(`[DEBUG] Error in search tool:`, error);
        
        let errorMessage = "An error occurred while searching";
        let errorDetails = "";

        if (error.message === 'Hive API request timed out after 30 seconds') {
          errorMessage = "Hive API request timed out. The service may be slow or unavailable.";
        } else if (error.name === "HiveSearchAPIError") {
          errorMessage = `Hive API Error: ${error.status} ${error.statusText}`;
          errorDetails = error.body ? JSON.stringify(error.body, null, 2) : "";
        } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
          errorMessage = "Network error: Unable to connect to Hive Intelligence API";
          errorDetails = `Connection error: ${error.code}`;
        } else if (error.message) {
          errorMessage = error.message;
        }

        throw new McpError(
          ErrorCode.InternalError,
          `${errorMessage}${errorDetails ? `\n\nDetails:\n${errorDetails}` : ""}`
        );
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Hive MCP server running on stdio");
  }
}

const server = new HiveMCPServer();
server.run().catch(console.error);