import { Method, SimulationResponse } from '../types';

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
  headers: Record<string, string> = {}
): Promise<SimulationResponse> => {
  const isInternalDemo = baseUrl.includes('api.cosmos-store.io');

  if (isInternalDemo) {
    return mockInternalRequest(method, path, body);
  } else {
    return executeRealRequest(baseUrl, method, path, body, headers);
  }
};

const executeRealRequest = async (
  baseUrl: string, 
  method: Method, 
  path: string, 
  body?: string | FormData,
  customHeaders: Record<string, string> = {}
): Promise<SimulationResponse> => {
  const start = performance.now();
  const url = `${baseUrl.replace(/\/$/, '')}${path}`;
  
  try {
    const options: RequestInit = {
      method,
      headers: { ...customHeaders },
    };

    // If body is string (JSON), add Content-Type: application/json
    // If body is FormData, DO NOT add Content-Type (browser adds boundary)
    if (body) {
      if (typeof body === 'string') {
         if (!options.headers) options.headers = {};
         (options.headers as Record<string, string>)['Content-Type'] = 'application/json';
         options.body = body;
      } else {
         // FormData
         options.body = body;
         // Ensure we don't accidentally set content-type for multipart
         if (options.headers && (options.headers as Record<string, string>)['Content-Type']) {
             delete (options.headers as Record<string, string>)['Content-Type'];
         }
      }
    }

    const res = await fetch(url, options);
    const end = performance.now();
    
    let data;
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        data = await res.json();
    } else {
        data = await res.text();
    }

    return {
      status: res.status,
      data: data,
      latency: Math.round(end - start)
    };

  } catch (error: any) {
    return {
      status: 0,
      data: { error: "Network Error", details: error.message },
      latency: 0
    };
  }
};

const mockInternalRequest = async (
  method: Method,
  path: string,
  body?: string | FormData
): Promise<SimulationResponse> => {
  return new Promise((resolve) => {
    // Simulate network delay (300ms to 1200ms)
    const latency = Math.floor(Math.random() * 900) + 300;

    setTimeout(() => {
      let status = 200;
      let data: any = {};

      if (method === Method.GET) {
        // --- Products ---
        if (path.includes('/products') && !path.includes('/products/')) {
          data = {
            items: [
              { id: 1, name: "Quantum Processor", price: 1299.99, stock: 50, category: "Hardware" },
              { id: 2, name: "Holographic Display", price: 899.50, stock: 12, category: "Displays" },
              { id: 3, name: "Neural Interface", price: 2450.00, stock: 5, category: "Implants" },
            ],
            skip: 0,
            limit: 10,
            total: 3
          };
        } else if (path.match(/\/products\/\d+/)) {
             data = { id: 101, name: "Flux Capacitor", price: 500000, description: "Time travel device", stock: 1, category: "Exotic" };
        }
        
        // --- Users ---
        else if (path.includes('/users') && !path.includes('/users/')) {
            data = [
                { id: 1, username: "admin", email: "admin@cosmos.io", is_active: true, created_at: "2024-01-01T10:00:00Z" },
                { id: 2, username: "user", email: "user@cosmos.io", is_active: true, created_at: "2024-01-02T11:00:00Z" }
            ];
        } else if (path.match(/\/users\/\d+/)) {
            data = { id: 99, username: "neo_anderson", email: "neo@matrix.io", full_name: "Thomas Anderson", is_active: true };
        } 
        
        // --- Orders ---
        else if (path.includes('/orders') && !path.includes('/orders/')) {
             data = [
                { id: 501, user_id: 1, product_id: 2, quantity: 1, total_price: 899.50, status: "completed" },
                { id: 502, user_id: 2, product_id: 1, quantity: 2, total_price: 2599.98, status: "pending" }
             ];
        } else if (path.match(/\/orders\/\d+/)) {
             data = { id: 501, user_id: 1, product_id: 2, quantity: 1, total_price: 899.50, status: "completed" };
        }

        // --- Posts ---
        else if (path.includes('/posts') && !path.includes('/posts/')) {
            data = [
                { id: 1, title: "Welcome to Cosmos", content: "The future is here.", author: "admin", published: true },
                { id: 2, title: "New Arrivals", content: "Check out our latest quantum chips.", author: "sales", published: true }
            ];
        } else if (path.match(/\/posts\/\d+/)) {
            data = { id: 1, title: "Welcome to Cosmos", content: "The future is here.", author: "admin", published: true };
        }

        // --- Files ---
        else if (path.includes('/files') && !path.includes('/files/')) {
            data = { files: ["blueprint_v1.png", "schematic_final.pdf", "logo.svg"] };
        } else if (path.match(/\/files\/.+/)) {
             // Simulate file download/info
             const filename = path.split('/').pop();
             data = { filename: filename, size: 1024 * 5, url: `https://cdn.cosmos-store.io/uploads/${filename}` };
        }
        
        // --- Root ---
        else if (path === '/') {
            data = { message: "Welcome to Test API - Full CRUD Operations" };
        }
        
        else {
            data = { message: "Mock data for " + path };
        }

      } else if (method === Method.POST) {
        status = 201;
        
        if (body instanceof FormData) {
            // /upload
            data = {
                message: "File uploaded successfully",
                filename: (body.get('file') as File)?.name || "unknown.png",
                size: (body.get('file') as File)?.size || 0,
                content_type: (body.get('file') as File)?.type,
                id: "upload_" + Math.floor(Math.random() * 1000)
            };
            status = 200; // /upload returns 200 in the spec
        } else {
            try {
                const parsed = body ? JSON.parse(body) : {};
                
                // Handle Calculate
                if (path.includes('calculate')) {
                    status = 200;
                    const { a, b, operation } = parsed;
                    let result = 0;
                    if (operation === 'add') result = a + b;
                    else if (operation === 'subtract') result = a - b;
                    else if (operation === 'multiply') result = a * b;
                    else if (operation === 'divide') result = a / b;
                    data = { result, operation, inputs: { a, b } };
                } 
                // Handle Echo
                else if (path.includes('echo')) {
                    status = 200;
                    data = { ...parsed, server_timestamp: new Date().toISOString() };
                }
                else {
                    // Create User, Product, Order, Post
                    data = {
                        id: Math.floor(Math.random() * 1000),
                        created_at: new Date().toISOString(),
                        ...parsed
                    };
                }
            } catch (e) {
                status = 400;
                data = { error: "Invalid JSON body" };
            }
        }
      } else if (method === Method.PUT || method === Method.PATCH) {
         status = 200;
         data = { 
             message: "Resource updated successfully", 
             updated_at: new Date().toISOString(),
             // echo back changes if simple json
             ...(typeof body === 'string' ? JSON.parse(body) : {})
         };
      } else if (method === Method.DELETE) {
          status = 200; // Spec says 200 for delete user/order etc
          data = { message: "Resource deleted successfully" };
      }

      if (Math.random() < 0.05) { // 5% chance of random failure
          status = 500;
          data = { error: "Internal Server Error", code: "SERVER_CRASH" };
      }

      resolve({ status, data, latency });
    }, latency);
  });
};