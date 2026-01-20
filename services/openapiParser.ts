import { Endpoint, ApiTag, Method, ApiSpec, SecurityRequirement, ResponseDefinition, RequestBodyProperty } from '../types';
import { DEFAULT_SPEC, BASE_URL } from '../constants';

export const parseOpenApi = async (url: string): Promise<ApiSpec> => {
  if (!url) {
    // Return the default internal spec provided by the user
    return parseSpec(DEFAULT_SPEC, BASE_URL);
  }

  try {
    let response = await fetch(url).catch(() => null);
    
    // If direct fetch fails (likely CORS), try a proxy
    if (!response) {
         console.warn("Direct fetch failed, attempting via CORS proxy...");
         const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
         response = await fetch(proxyUrl);
    }

    if (!response.ok) throw new Error(`Failed to fetch OpenAPI spec: ${response.status} ${response.statusText}`);
    const spec = await response.json();
    return parseSpec(spec, url);
  } catch (error: any) {
    console.error("Error parsing OpenAPI:", error);
    // Enhance error message for UI
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error(`Network error (CORS). The server at ${url} may not allow requests from this origin. Try enabling CORS on your server.`);
    }
    throw error;
  }
};

const parseSpec = (spec: any, sourceUrl: string): ApiSpec => {
    const title = spec.info?.title || "Unknown API";
    const version = spec.info?.version || "1.0.0";
    
    // Attempt to determine Base URL
    let baseUrl = "";
    
    // Strategy 1: OpenAPI 3.0 'servers'
    if (spec.servers?.[0]?.url) {
        baseUrl = spec.servers[0].url;
    } 
    // Strategy 2: Swagger 2.0 'host' + 'basePath'
    else if (spec.host) {
        const scheme = spec.schemes?.[0] || 'https';
        baseUrl = `${scheme}://${spec.host}${spec.basePath || ''}`;
    }

    // Handle relative URLs in Base URL
    if (baseUrl && !baseUrl.startsWith('http') && sourceUrl.startsWith('http')) {
       const urlObj = new URL(sourceUrl);
       // Handle CORS proxy URLs - strip the proxy part to find relative root if needed
       // If sourceUrl is proxied, this might be tricky. 
       
       if (baseUrl.startsWith('/')) {
          baseUrl = urlObj.origin + baseUrl;
       } else {
          const path = urlObj.pathname.substring(0, urlObj.pathname.lastIndexOf('/'));
          baseUrl = urlObj.origin + path + '/' + baseUrl;
       }
    }
    
    // Fallback: If we parsed the DEFAULT_SPEC, force the internal mock URL
    // Otherwise use origin of the spec URL (stripping proxy if needed)
    if (!baseUrl) {
        if (spec === DEFAULT_SPEC) {
            baseUrl = BASE_URL;
        } else if (sourceUrl.startsWith('http')) {
             if (sourceUrl.includes('corsproxy.io')) {
                 // Try to extract original URL from query param
                 const match = sourceUrl.match(/corsproxy\.io\/\?(.+)/);
                 if (match && match[1]) {
                     const decoded = decodeURIComponent(match[1]);
                     try {
                         const originalUrlObj = new URL(decoded);
                         baseUrl = originalUrlObj.origin;
                     } catch {
                         baseUrl = "";
                     }
                 }
             } else {
                const urlObj = new URL(sourceUrl);
                baseUrl = urlObj.origin;
             }
        }
    }

    const tags: ApiTag[] = spec.tags?.map((t: any) => ({
      name: t.name,
      description: t.description || ''
    })) || [];

    // Support both OpenAPI 3.0 (components.securitySchemes) and Swagger 2.0 (securityDefinitions)
    const securitySchemes = spec.components?.securitySchemes || spec.securityDefinitions || {};
    const globalSecurity = spec.security || [];

    const endpoints: Endpoint[] = [];
    
    if (spec.paths) {
      Object.entries(spec.paths).forEach(([path, methods]: [string, any]) => {
        Object.entries(methods).forEach(([methodStr, op]: [string, any]) => {
           if (['get', 'post', 'put', 'delete', 'patch', 'head', 'options'].includes(methodStr.toLowerCase())) {
             const method = methodStr.toUpperCase() as Method;
             
             // Extract parameters
             const allParams = [
               ...(op.parameters || []),
               ...(spec.paths[path].parameters || [])
             ];

             const parameters = allParams
                .filter((p: any) => {
                    const paramDef = p.$ref ? resolveRef(p.$ref, spec) : p;
                    // Keep only standard parameters, exclude body/formData
                    return ['query', 'path', 'header'].includes(paramDef.in);
                })
                .map((p: any) => {
                   const paramDef = p.$ref ? resolveRef(p.$ref, spec) : p;
                   return {
                     name: paramDef.name,
                     in: paramDef.in,
                     required: paramDef.required || false,
                     type: paramDef.schema?.type || paramDef.type || 'string', // v3 uses schema.type, v2 uses type directly
                     description: paramDef.description
                   };
             });

             // Extract request body properties & schema
             let requestBodySchema = '';
             let requestBodyType = '';
             let requestBodyProperties: RequestBodyProperty[] = [];
             
             // Strategy 1: OpenAPI 3.0 requestBody
             if (op.requestBody) {
                 const reqBody = op.requestBody.$ref ? resolveRef(op.requestBody.$ref, spec) : op.requestBody;
                 const content = reqBody.content || {};
                 // Find content type (prefer json or multipart)
                 const contentType = Object.keys(content).find(t => t.includes('json') || t.includes('multipart') || t.includes('form-urlencoded'));
                 
                 if (contentType) {
                     requestBodyType = contentType;
                     const schema = content[contentType].schema;
                     const resolvedSchema = schema.$ref ? resolveRef(schema.$ref, spec) : schema;
                     
                     // If multipart or form-urlencoded, extract properties for the form builder
                     if (contentType.includes('multipart') || contentType.includes('form-urlencoded')) {
                         if (resolvedSchema && resolvedSchema.properties) {
                             requestBodyProperties = Object.keys(resolvedSchema.properties).map(key => {
                                 const prop = resolvedSchema.properties[key];
                                 const resolvedProp = prop.$ref ? resolveRef(prop.$ref, spec) : prop;
                                 return {
                                     name: key,
                                     type: resolvedProp.type || 'string',
                                     format: resolvedProp.format,
                                     description: resolvedProp.description,
                                     required: resolvedSchema.required?.includes(key)
                                 };
                             });
                         }
                     }
                     
                     // Generate JSON example
                     requestBodySchema = JSON.stringify(generateExampleFromSchema(schema, spec), null, 2);
                 }
             }
             // Strategy 2: Swagger 2.0 formData/body
             else {
                 // Check for body param (JSON usually)
                 const bodyParam = allParams.find((p: any) => {
                     const paramDef = p.$ref ? resolveRef(p.$ref, spec) : p;
                     return paramDef.in === 'body';
                 });

                 // Check for formData params (Multipart)
                 const formDataParams = allParams.filter((p: any) => {
                     const paramDef = p.$ref ? resolveRef(p.$ref, spec) : p;
                     return paramDef.in === 'formData';
                 });

                 if (bodyParam) {
                      const paramDef = bodyParam.$ref ? resolveRef(bodyParam.$ref, spec) : bodyParam;
                      requestBodyType = 'application/json';
                      requestBodySchema = JSON.stringify(generateExampleFromSchema(paramDef.schema, spec), null, 2);
                 } else if (formDataParams.length > 0) {
                      requestBodyType = 'multipart/form-data'; 
                      requestBodySchema = '{}';
                      
                      requestBodyProperties = formDataParams.map((p: any) => {
                          const paramDef = p.$ref ? resolveRef(p.$ref, spec) : p;
                          return {
                              name: paramDef.name,
                              type: paramDef.type || 'string',
                              format: paramDef.format, // 'binary' or 'file' indicates file upload
                              description: paramDef.description,
                              required: paramDef.required
                          };
                      });
                 }
             }

             // Extract responses with examples
             const responses: Record<number, ResponseDefinition> = {};
             if (op.responses) {
               Object.entries(op.responses).forEach(([code, res]: [string, any]) => {
                 const resDef = res.$ref ? resolveRef(res.$ref, spec) : res;
                 let schemaExample = undefined;
                 
                 // Strategy 1: OpenAPI 3.0 content.application/json.schema
                 if (resDef.content?.['application/json']?.schema) {
                    const schema = resDef.content['application/json'].schema;
                    schemaExample = JSON.stringify(generateExampleFromSchema(schema, spec), null, 2);
                 }
                 // Strategy 2: Swagger 2.0 schema property directly on response
                 else if (resDef.schema) {
                    schemaExample = JSON.stringify(generateExampleFromSchema(resDef.schema, spec), null, 2);
                 }

                 responses[parseInt(code) || 200] = {
                     description: resDef.description || 'No description',
                     schema: schemaExample
                 };
               });
             }

             // Extract Security (Endpoint level overrides Global)
             const security: SecurityRequirement[] = op.security || globalSecurity;

             endpoints.push({
               id: `${methodStr}-${path}`,
               path,
               method,
               summary: op.summary || path,
               description: op.description || '',
               tags: op.tags || ['Default'],
               parameters,
               requestBodySchema,
               requestBodyType,
               requestBodyProperties,
               responses,
               security
             });
           }
        });
      });
    }

    const usedTags = new Set(endpoints.flatMap(e => e.tags));
    usedTags.forEach(tagName => {
      if (!tags.find(t => t.name === tagName)) {
        tags.push({ name: tagName, description: '' });
      }
    });

    return { title, version, baseUrl, endpoints, tags, securitySchemes };
};

const resolveRef = (ref: string, spec: any) => {
  if (!ref || !ref.startsWith('#/')) return {};
  const parts = ref.split('/').slice(1);
  let current = spec;
  for (const part of parts) {
    current = current?.[part];
    if (!current) return {};
  }
  return current;
};

function generateExampleFromSchema(schema: any, spec: any, depth = 0): any {
  if (!schema) return {};
  if (depth > 5) return "possible_circular_ref";

  if (schema.$ref) {
    const resolved = resolveRef(schema.$ref, spec);
    return generateExampleFromSchema(resolved, spec, depth + 1);
  }

  if (schema.allOf) {
    let combined = {};
    schema.allOf.forEach((subSchema: any) => {
        combined = { ...combined, ...generateExampleFromSchema(subSchema, spec, depth + 1) };
    });
    return combined;
  }

  if (schema.example) return schema.example;
  
  if (schema.type === 'object' || (!schema.type && schema.properties)) {
    const obj: any = {};
    if (schema.properties) {
        Object.keys(schema.properties).forEach(key => {
        obj[key] = generateExampleFromSchema(schema.properties[key], spec, depth + 1);
        });
    }
    return obj;
  }
  
  if (schema.type === 'array') {
    if (schema.items) {
        return [generateExampleFromSchema(schema.items, spec, depth + 1)];
    }
    return [];
  }

  if (schema.type === 'string') {
    if (schema.format === 'date-time') return new Date().toISOString();
    if (schema.format === 'uuid') return "3fa85f64-5717-4562-b3fc-2c963f66afa6";
    if (schema.enum && schema.enum.length > 0) return schema.enum[0];
    return "string";
  }
  if (schema.type === 'number' || schema.type === 'integer') return 0;
  if (schema.type === 'boolean') return true;
  
  return {};
}