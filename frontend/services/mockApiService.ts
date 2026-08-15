import { Method, SimulationResponse } from '../types';
import { toProxyUrl } from './devProxy';

export type ExecuteRequestOptions = {
  /** Called with partial response while reading SSE, NDJSON, or chunked binary */
  onStreamUpdate?: (r: SimulationResponse) => void;
};

function shouldStreamAsText(contentType: string): boolean {
  const c = contentType.toLowerCase();
  if (c.includes('application/json')) return false;
  if (c.includes('text/html')) return false;
  return (
    c.includes('text/event-stream') ||
    c.includes('application/x-ndjson') ||
    c.includes('application/jsonlines') ||
    c.includes('application/x-json-stream') ||
    c.includes('text/vnd.ndjson') ||
    c.includes('ndjson') ||
    c.includes('text/csv') ||
    c.includes('text/') ||
    c.includes('application/xml') ||
    c.includes('application/xhtml+xml')
  );
}

function shouldStreamBinary(contentType: string): boolean {
  const c = contentType.toLowerCase();
  if (c.includes('application/json')) return false;
  if (shouldStreamAsText(contentType)) return false;
  return (
    c.includes('application/octet-stream') ||
    c.includes('application/stream') ||
    c.includes('video/') ||
    c.includes('audio/') ||
    c.includes('image/') ||
    c.includes('application/pdf') ||
    c.includes('spreadsheet') ||
    c.includes('excel') ||
    c.includes('ms-excel') ||
    c.includes('officedocument')
  );
}

/**
 * Converts a fetch Response into SimulationResponse, with optional incremental reads
 * for text/event-stream, NDJSON, plain text, XML, CSV, and chunked binary bodies.
 */
export async function readResponseAsSimulation(
  res: Response,
  startedAt: number,
  onStreamUpdate?: (r: SimulationResponse) => void
): Promise<SimulationResponse> {
  const contentType = res.headers.get('content-type') || '';

  const latencyNow = () => Math.round(performance.now() - startedAt);

  const base = (): Omit<SimulationResponse, 'data'> => ({
    status: res.status,
    latency: latencyNow(),
    contentType,
  });

  // JSON must be buffered (partial JSON is not useful)
  if (contentType.includes('application/json')) {
    const text = await res.text();
    let data: unknown;
    if (text && text.trim().length > 0) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    } else {
      data = res.status === 204 || res.status === 205 ? null : { message: 'Empty response' };
    }
    return { ...base(), data, streamed: false };
  }

  // ReadableStream text (SSE, NDJSON, etc.)
  if (res.body && shouldStreamAsText(contentType)) {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let acc = '';
    let bytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        bytes += value.byteLength;
        acc += decoder.decode(value, { stream: true });
        onStreamUpdate?.({
          ...base(),
          data: acc,
          streamed: true,
          streamBytesReceived: bytes,
        });
      }
    }
    acc += decoder.decode();
    return {
      ...base(),
      data: acc,
      streamed: true,
      streamBytesReceived: bytes,
    };
  }

  // ReadableStream binary
  if (res.body && shouldStreamBinary(contentType)) {
    const reader = res.body.getReader();
    const chunks: BlobPart[] = [];
    let bytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        bytes += value.byteLength;
        const blob = new Blob(chunks);
        onStreamUpdate?.({
          ...base(),
          data: blob,
          streamed: true,
          streamBytesReceived: bytes,
        });
      }
    }
    const blob = new Blob(chunks);
    return {
      ...base(),
      data: blob,
      streamed: true,
      streamBytesReceived: bytes,
    };
  }

  // Buffered fallbacks (no stream body or unclassified type)
  let data: unknown;
  if (
    contentType.includes('image/') ||
    contentType.includes('application/pdf') ||
    contentType.includes('application/octet-stream')
  ) {
    data = await res.blob();
  } else if (
    contentType.includes('text/csv') ||
    contentType.includes('spreadsheet') ||
    contentType.includes('excel')
  ) {
    data = await res.blob();
  } else {
    const text = await res.text();
    data = text || null;
  }

  return {
    ...base(),
    data,
    streamed: false,
  };
}

/**
 * Executes a request.
 * If the baseUrl matches our internal demo, it mocks the response.
 * If it is an external URL, it attempts a real fetch.
 */
export const executeRequest = async (
  baseUrl: string,
  method: Method,
  path: string,
  body?: string | FormData,
  headers: Record<string, string> = {},
  options?: ExecuteRequestOptions
): Promise<SimulationResponse> => {
  const isInternalDemo = baseUrl.includes('api.cosmos-store.io');

  if (isInternalDemo) {
    return mockInternalRequest(method, path, body);
  } else {
    return executeRealRequest(baseUrl, method, path, body, headers, options);
  }
};

const executeRealRequest = async (
  baseUrl: string,
  method: Method,
  path: string,
  body?: string | FormData,
  customHeaders: Record<string, string> = {},
  options?: ExecuteRequestOptions
): Promise<SimulationResponse> => {
  const start = performance.now();
  const url = toProxyUrl(`${baseUrl.replace(/\/$/, '')}${path}`);

  try {
    const fetchOptions: RequestInit = {
      method,
      headers: { ...customHeaders },
    };

    if (body) {
      if (typeof body === 'string') {
        if (!fetchOptions.headers) fetchOptions.headers = {};
        (fetchOptions.headers as Record<string, string>)['Content-Type'] = 'application/json';
        fetchOptions.body = body;
      } else {
        fetchOptions.body = body;
        if (fetchOptions.headers && (fetchOptions.headers as Record<string, string>)['Content-Type']) {
          delete (fetchOptions.headers as Record<string, string>)['Content-Type'];
        }
      }
    }

    const res = await fetch(url, fetchOptions);
    return readResponseAsSimulation(res, start, options?.onStreamUpdate);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: 0,
      data: { error: 'Network Error', details: message },
      latency: 0,
      streamed: false,
    };
  }
};

const mockInternalRequest = async (
  method: Method,
  path: string,
  body?: string | FormData
): Promise<SimulationResponse> => {
  return new Promise((resolve) => {
    const latency = Math.floor(Math.random() * 900) + 300;

    setTimeout(() => {
      let status = 200;
      let data: any = {};

      if (method === Method.GET) {
        if (path.includes('/products') && !path.includes('/products/')) {
          data = {
            items: [
              { id: 1, name: 'Quantum Processor', price: 1299.99, stock: 50, category: 'Hardware' },
              { id: 2, name: 'Holographic Display', price: 899.5, stock: 12, category: 'Displays' },
              { id: 3, name: 'Neural Interface', price: 2450.0, stock: 5, category: 'Implants' },
            ],
            skip: 0,
            limit: 10,
            total: 3,
          };
        } else if (path.match(/\/products\/\d+/)) {
          data = {
            id: 101,
            name: 'Flux Capacitor',
            price: 500000,
            description: 'Time travel device',
            stock: 1,
            category: 'Exotic',
          };
        } else if (path.includes('/users') && !path.includes('/users/')) {
          data = [
            { id: 1, username: 'admin', email: 'admin@cosmos.io', is_active: true, created_at: '2024-01-01T10:00:00Z' },
            { id: 2, username: 'user', email: 'user@cosmos.io', is_active: true, created_at: '2024-01-02T11:00:00Z' },
          ];
        } else if (path.match(/\/users\/\d+/)) {
          data = { id: 99, username: 'neo_anderson', email: 'neo@matrix.io', full_name: 'Thomas Anderson', is_active: true };
        } else if (path.includes('/orders') && !path.includes('/orders/')) {
          data = [
            { id: 501, user_id: 1, product_id: 2, quantity: 1, total_price: 899.5, status: 'completed' },
            { id: 502, user_id: 2, product_id: 1, quantity: 2, total_price: 2599.98, status: 'pending' },
          ];
        } else if (path.match(/\/orders\/\d+/)) {
          data = { id: 501, user_id: 1, product_id: 2, quantity: 1, total_price: 899.5, status: 'completed' };
        } else if (path.includes('/posts') && !path.includes('/posts/')) {
          data = [
            { id: 1, title: 'Welcome to Cosmos', content: 'The future is here.', author: 'admin', published: true },
            { id: 2, title: 'New Arrivals', content: 'Check out our latest quantum chips.', author: 'sales', published: true },
          ];
        } else if (path.match(/\/posts\/\d+/)) {
          data = { id: 1, title: 'Welcome to Cosmos', content: 'The future is here.', author: 'admin', published: true };
        } else if (path.includes('/files') && !path.includes('/files/')) {
          data = { files: ['blueprint_v1.png', 'schematic_final.pdf', 'logo.svg'] };
        } else if (path.match(/\/files\/.+/)) {
          const filename = path.split('/').pop();
          data = { filename: filename, size: 1024 * 5, url: `https://cdn.cosmos-store.io/uploads/${filename}` };
        } else if (path.includes('/download/image')) {
          data = 'https://picsum.photos/800/600';
        } else if (path.includes('/download/pdf')) {
          data = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
        } else if (path.includes('/download/csv')) {
          data = 'Name,Age,City\nJohn Doe,30,New York\nJane Smith,25,Los Angeles\nBob Johnson,35,Chicago';
        } else if (path === '/') {
          data = { message: 'Welcome to Test API - Full CRUD Operations' };
        } else {
          data = { message: 'Mock data for ' + path };
        }
      } else if (method === Method.POST) {
        status = 201;

        if (body instanceof FormData) {
          data = {
            message: 'File uploaded successfully',
            filename: (body.get('file') as File)?.name || 'unknown.png',
            size: (body.get('file') as File)?.size || 0,
            content_type: (body.get('file') as File)?.type,
            id: 'upload_' + Math.floor(Math.random() * 1000),
          };
          status = 200;
        } else {
          try {
            const parsed = body ? JSON.parse(body) : {};

            if (path.includes('calculate')) {
              status = 200;
              const { a, b, operation } = parsed;
              let result = 0;
              if (operation === 'add') result = a + b;
              else if (operation === 'subtract') result = a - b;
              else if (operation === 'multiply') result = a * b;
              else if (operation === 'divide') result = a / b;
              data = { result, operation, inputs: { a, b } };
            } else if (path.includes('echo')) {
              status = 200;
              data = { ...parsed, server_timestamp: new Date().toISOString() };
            } else {
              data = {
                id: Math.floor(Math.random() * 1000),
                created_at: new Date().toISOString(),
                ...parsed,
              };
            }
          } catch {
            status = 400;
            data = { error: 'Invalid JSON body' };
          }
        }
      } else if (method === Method.PUT || method === Method.PATCH) {
        status = 200;
        data = {
          message: 'Resource updated successfully',
          updated_at: new Date().toISOString(),
          ...(typeof body === 'string' ? JSON.parse(body) : {}),
        };
      } else if (method === Method.DELETE) {
        status = 200;
        data = { message: 'Resource deleted successfully' };
      }

      if (Math.random() < 0.05) {
        status = 500;
        data = { error: 'Internal Server Error', code: 'SERVER_CRASH' };
      }

      resolve({ status, data, latency });
    }, latency);
  });
};
