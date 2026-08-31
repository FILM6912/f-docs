const MEDIA_TYPE_KEY = /^[a-zA-Z0-9!#$&^_.+-]+\/[a-zA-Z0-9!#$&^_.+-]+$/;

export function isMediaTypeKey(key: string): boolean {
  return MEDIA_TYPE_KEY.test(key) || key === '*/*';
}

/** Swagger 2.0 examples are keyed by mime type instead of being the payload itself. */
export function unwrapSwaggerStyleExample(example: any): any {
  if (example === null || example === undefined) return example;
  if (typeof example !== 'object' || Array.isArray(example)) return example;

  const keys = Object.keys(example);
  if (keys.length === 0 || !keys.every(isMediaTypeKey)) return example;

  const jsonKey = keys.find((key) => key.includes('json'));
  return example[jsonKey || keys[0]];
}

function exampleFromExamplesMap(examples: any): any {
  if (!examples || typeof examples !== 'object') return undefined;

  const keys = Object.keys(examples);
  if (keys.length === 0) return undefined;

  const jsonKey = keys.find((key) => key.includes('json'));
  const first = examples[jsonKey || keys[0]];
  if (first === undefined) return undefined;

  if (first && typeof first === 'object' && !Array.isArray(first) && 'value' in first) {
    return unwrapSwaggerStyleExample(first.value);
  }

  return unwrapSwaggerStyleExample(first);
}

export function pickContentMedia(content: any): any {
  if (!content || typeof content !== 'object') return undefined;

  const keys = Object.keys(content);
  if (keys.length === 0) return undefined;

  const preferred = keys.find((type) => type.includes('json')) || keys[0];
  return content[preferred];
}

/** OpenAPI 3 media object: content[mediaType].example / .examples */
export function resolveMediaExample(media: any): any {
  if (!media || typeof media !== 'object') return undefined;

  if (media.example !== undefined) {
    return unwrapSwaggerStyleExample(media.example);
  }

  if (media.examples) {
    return exampleFromExamplesMap(media.examples);
  }

  return undefined;
}

/**
 * Response example from:
 * - OpenAPI 3 `content.*.example` / `content.*.examples`
 * - Swagger 2.0 `examples` keyed by mime type
 */
export function resolveResponseExample(resDef: any): any {
  if (!resDef || typeof resDef !== 'object') return undefined;

  const fromContent = resolveMediaExample(pickContentMedia(resDef.content));
  if (fromContent !== undefined) return fromContent;

  if (resDef.examples) {
    return exampleFromExamplesMap(resDef.examples);
  }

  return undefined;
}
