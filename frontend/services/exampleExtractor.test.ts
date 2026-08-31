import { describe, expect, it } from 'vitest';
import {
  resolveMediaExample,
  resolveResponseExample,
  unwrapSwaggerStyleExample,
} from './exampleExtractor';

describe('unwrapSwaggerStyleExample', () => {
  it('returns OpenAPI example objects as-is', () => {
    const example = { id: 1, name: 'Widget' };
    expect(unwrapSwaggerStyleExample(example)).toEqual({ id: 1, name: 'Widget' });
  });

  it('unwraps Swagger mime-keyed example map', () => {
    const example = {
      'application/json': { id: 1, name: 'Widget' },
      'application/xml': '<widget />',
    };
    expect(unwrapSwaggerStyleExample(example)).toEqual({ id: 1, name: 'Widget' });
  });

  it('prefers json when several swagger mime keys exist', () => {
    const example = {
      'text/plain': 'plain',
      'application/json': { ok: true },
    };
    expect(unwrapSwaggerStyleExample(example)).toEqual({ ok: true });
  });

  it('does not unwrap objects that merely contain a slash in a field name', () => {
    const example = { 'not/a-media': 1, name: 'keep' };
    expect(unwrapSwaggerStyleExample(example)).toEqual(example);
  });
});

describe('resolveMediaExample', () => {
  it('uses content.example when present', () => {
    expect(
      resolveMediaExample({
        schema: { type: 'object', properties: { id: { type: 'integer' } } },
        example: { id: 42, name: 'from-example' },
      })
    ).toEqual({ id: 42, name: 'from-example' });
  });

  it('unwraps Swagger-style map inside content.example', () => {
    expect(
      resolveMediaExample({
        example: {
          'application/json': { token: 'abc', role: 'admin' },
        },
      })
    ).toEqual({ token: 'abc', role: 'admin' });
  });

  it('uses first OpenAPI named example value', () => {
    expect(
      resolveMediaExample({
        examples: {
          success: {
            summary: 'ok',
            value: { status: 'ok' },
          },
        },
      })
    ).toEqual({ status: 'ok' });
  });

  it('uses raw Swagger-style named example when value wrapper is missing', () => {
    expect(
      resolveMediaExample({
        examples: {
          'application/json': { status: 'legacy' },
        },
      })
    ).toEqual({ status: 'legacy' });
  });

  it('returns undefined when no explicit example exists', () => {
    expect(resolveMediaExample({ schema: { type: 'object' } })).toBeUndefined();
  });
});

describe('resolveResponseExample', () => {
  it('reads OpenAPI 3 content.example', () => {
    expect(
      resolveResponseExample({
        description: 'ok',
        content: {
          'application/json': {
            example: { message: 'hello' },
          },
        },
      })
    ).toEqual({ message: 'hello' });
  });

  it('reads OpenAPI 3 content.example in Swagger mime-keyed shape', () => {
    expect(
      resolveResponseExample({
        content: {
          'application/json': {
            example: {
              'application/json': { message: 'swagger-shape' },
            },
          },
        },
      })
    ).toEqual({ message: 'swagger-shape' });
  });

  it('reads Swagger 2.0 response.examples keyed by mime type', () => {
    expect(
      resolveResponseExample({
        description: 'ok',
        schema: { type: 'object' },
        examples: {
          'application/json': { id: 7, title: 'swagger2' },
        },
      })
    ).toEqual({ id: 7, title: 'swagger2' });
  });

  it('prefers content.example over swagger response.examples', () => {
    expect(
      resolveResponseExample({
        content: {
          'application/json': {
            example: { source: 'content' },
          },
        },
        examples: {
          'application/json': { source: 'swagger' },
        },
      })
    ).toEqual({ source: 'content' });
  });
});
