export enum Method {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH'
}

export interface Parameter {
  name: string;
  in: 'path' | 'query' | 'header';
  required: boolean;
  type: string;
  enum?: string[];
  description?: string;
}

export interface SecurityRequirement {
  [name: string]: string[];
}

export interface ResponseDefinition {
  description: string;
  schema?: string; // Stringified JSON example
}

export interface RequestBodyProperty {
  name: string;
  type: string;
  format?: string;
  required?: boolean;
  description?: string;
}

export interface Endpoint {
  id: string;
  path: string;
  method: Method;
  summary: string;
  description: string;
  tags: string[];
  parameters?: Parameter[];
  requestBodySchema?: string;
  requestBodyType?: string; // e.g. 'application/json' or 'multipart/form-data'
  requestBodyProperties?: RequestBodyProperty[]; // For multipart/form-data fields
  responses: Record<number, ResponseDefinition>;
  security?: SecurityRequirement[];
}

export interface ApiTag {
  name: string;
  description: string;
}

export interface SimulationResponse {
  status: number;
  data: any;
  latency: number;
}

export interface OAuthFlows {
  implicit?: { authorizationUrl: string; scopes: Record<string, string> };
  password?: { tokenUrl: string; refreshUrl?: string; scopes: Record<string, string> };
  clientCredentials?: { tokenUrl: string; refreshUrl?: string; scopes: Record<string, string> };
  authorizationCode?: { authorizationUrl: string; tokenUrl: string; refreshUrl?: string; scopes: Record<string, string> };
}

export interface SecurityScheme {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
  description?: string;
  name?: string; // for apiKey
  in?: 'query' | 'header' | 'cookie'; // for apiKey
  scheme?: string; // for http (e.g. bearer, basic)
  bearerFormat?: string;
  flows?: OAuthFlows;
}

export interface ApiSpec {
  title: string;
  version: string;
  baseUrl: string;
  endpoints: Endpoint[];
  tags: ApiTag[];
  securitySchemes?: Record<string, SecurityScheme>;
}