import { describe, expect, it } from 'vitest';
import { parseSpec } from './openapiParser';

describe('parseSpec content.example', () => {
  it('uses OpenAPI 3 content.example for response and request body', () => {
    const spec = parseSpec(
      {
        openapi: '3.0.0',
        info: { title: 'Demo', version: '1.0.0' },
        paths: {
          '/pets': {
            post: {
              summary: 'Create pet',
              requestBody: {
                content: {
                  'application/json': {
                    schema: { type: 'object' },
                    example: { name: 'Doggie', tag: 'friendly' },
                  },
                },
              },
              responses: {
                '200': {
                  description: 'ok',
                  content: {
                    'application/json': {
                      schema: { type: 'object' },
                      example: { id: 1, name: 'Doggie' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      ''
    );

    const endpoint = spec.endpoints[0];
    expect(JSON.parse(endpoint.requestBodySchema || '{}')).toEqual({
      name: 'Doggie',
      tag: 'friendly',
    });
    expect(JSON.parse(endpoint.responses[200].schema || '{}')).toEqual({
      id: 1,
      name: 'Doggie',
    });
  });

  it('unwraps Swagger mime-keyed content.example and Swagger 2 response.examples', () => {
    const openApi = parseSpec(
      {
        openapi: '3.0.0',
        info: { title: 'Demo', version: '1.0.0' },
        paths: {
          '/echo': {
            get: {
              responses: {
                '200': {
                  content: {
                    'application/json': {
                      example: {
                        'application/json': { echoed: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      ''
    );
    expect(JSON.parse(openApi.endpoints[0].responses[200].schema || '{}')).toEqual({
      echoed: true,
    });

    const swagger2 = parseSpec(
      {
        swagger: '2.0',
        info: { title: 'Demo', version: '1.0.0' },
        paths: {
          '/echo': {
            get: {
              responses: {
                '200': {
                  description: 'ok',
                  schema: { type: 'object' },
                  examples: {
                    'application/json': { echoed: 'swagger2' },
                  },
                },
              },
            },
          },
        },
      },
      ''
    );
    expect(JSON.parse(swagger2.endpoints[0].responses[200].schema || '{}')).toEqual({
      echoed: 'swagger2',
    });
  });

  it('falls back to schema example when content.example is absent', () => {
    const spec = parseSpec(
      {
        openapi: '3.0.0',
        info: { title: 'Demo', version: '1.0.0' },
        paths: {
          '/x': {
            get: {
              responses: {
                '200': {
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: { id: { type: 'integer', example: 9 } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      ''
    );
    expect(JSON.parse(spec.endpoints[0].responses[200].schema || '{}')).toEqual({
      id: 9,
    });
  });
});
