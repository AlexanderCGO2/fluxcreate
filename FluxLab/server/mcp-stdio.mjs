import {StdioServerTransport} from '@modelcontextprotocol/server/stdio';
import {createMcpServer} from './mcp.mjs';
// stdout belongs exclusively to MCP JSON-RPC. No connection values are logged.
await createMcpServer().connect(new StdioServerTransport());
