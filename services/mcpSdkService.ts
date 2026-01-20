import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: any;
}

export interface MCPResource {
  uri: string;
  name: string;
  mimeType?: string;
  description?: string;
}

export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: any[];
}

export interface MCPConnectionConfig {
  url: string;
  authToken?: string;
  customHeaders?: Record<string, string>;
  includeCredentials?: boolean;
}

class MCPSDKService {
  private client: Client | null = null;
  private transport: SSEClientTransport | null = null;

  async connect(config: MCPConnectionConfig): Promise<void> {
    // Close existing connection if any
    await this.disconnect();

    // Create new client
    this.client = new Client(
      {
        name: "MCP-Inspector",
        version: "1.0.0",
      },
      {
        capabilities: {
          roots: { listChanged: true },
          sampling: {},
        },
      }
    );

    // Create SSE transport
    const url = new URL(config.url);
    
    // Add custom headers if provided
    const headers: Record<string, string> = {};
    
    if (config.authToken) {
      headers['Authorization'] = `Bearer ${config.authToken}`;
    }
    
    if (config.customHeaders) {
      Object.assign(headers, config.customHeaders);
    }

    // Create transport with headers
    this.transport = new SSEClientTransport(url, {
      headers,
    });

    // Connect with timeout
    const connectPromise = this.client.connect(this.transport);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout after 10 seconds')), 10000);
    });

    await Promise.race([connectPromise, timeoutPromise]);
  }

  async listTools(): Promise<MCPTool[]> {
    if (!this.client) {
      throw new Error('Not connected. Call connect() first.');
    }

    try {
      const result = await this.client.listTools();
      return result.tools.map((tool: any) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      }));
    } catch (error: any) {
      // If method not found, return empty array
      if (error.message?.includes('Method not found')) {
        return [];
      }
      throw error;
    }
  }

  async listResources(): Promise<MCPResource[]> {
    if (!this.client) {
      throw new Error('Not connected. Call connect() first.');
    }

    try {
      const result = await this.client.listResources();
      return result.resources.map((resource: any) => ({
        uri: resource.uri,
        name: resource.name,
        mimeType: resource.mimeType,
        description: resource.description,
      }));
    } catch (error: any) {
      // If method not found, return empty array
      if (error.message?.includes('Method not found')) {
        return [];
      }
      throw error;
    }
  }

  async listPrompts(): Promise<MCPPrompt[]> {
    if (!this.client) {
      throw new Error('Not connected. Call connect() first.');
    }

    try {
      const result = await this.client.listPrompts();
      return result.prompts.map((prompt: any) => ({
        name: prompt.name,
        description: prompt.description,
        arguments: prompt.arguments,
      }));
    } catch (error: any) {
      // If method not found, return empty array
      if (error.message?.includes('Method not found')) {
        return [];
      }
      throw error;
    }
  }

  async callTool(toolName: string, args: any): Promise<any> {
    if (!this.client) {
      throw new Error('Not connected. Call connect() first.');
    }

    const result = await this.client.callTool({
      name: toolName,
      arguments: args,
    });

    return result;
  }

  async readResource(uri: string): Promise<any> {
    if (!this.client) {
      throw new Error('Not connected. Call connect() first.');
    }

    const result = await this.client.readResource({ uri });
    return result;
  }

  async getPrompt(name: string, args?: any): Promise<any> {
    if (!this.client) {
      throw new Error('Not connected. Call connect() first.');
    }

    const result = await this.client.getPrompt({
      name,
      arguments: args,
    });

    return result;
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
      } catch (error) {
        console.error('Error closing client:', error);
      }
      this.client = null;
      this.transport = null;
    }
  }

  isConnected(): boolean {
    return this.client !== null;
  }
}

// Export singleton instance
export const mcpSdkService = new MCPSDKService();
