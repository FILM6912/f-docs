/**
 * Dev-only CORS escape hatch.
 *
 * When running `npm run dev` (import.meta.env.DEV), absolute cross-origin URLs
 * (like http://192.168.99.1:9786/openapi.json) can be blocked by the target
 * server's missing CORS headers. The Vite dev server has a catch-all proxy at
 * /proxy/<host>:<port>/<path> so the browser only ever talks same-origin to
 * localhost:3000.
 *
 * In production (FDocs served by the backend) URLs are used as-is, since the
 * backend is expected to serve (or proxy) the spec itself.
 */

const PROXY_PREFIX = '/proxy/';

const isDev = import.meta.env.DEV;

/** http://192.168.99.1:9786/openapi.json -> /proxy/192.168.99.1:9786/openapi.json */
export const toProxyUrl = (url: string): string => {
    if (!isDev || !url) return url;
    try {
        const parsed = new URL(url, window.location.origin);
        // Same-origin (e.g. '/openapi.json') needs no proxying.
        if (parsed.origin === window.location.origin) return url;
        return `${PROXY_PREFIX}${parsed.host}${parsed.pathname}${parsed.search}`;
    } catch {
        return url;
    }
};

/** Remember which original spec URL the user actually entered (for display/persistence). */
const LAST_SPEC_KEY = 'last_spec_url';
export const saveLastSpecUrl = (url: string) => {
    try { localStorage.setItem(LAST_SPEC_KEY, url); } catch {}
};
export const getLastSpecUrl = (): string | null => {
    try { return localStorage.getItem(LAST_SPEC_KEY); } catch { return null; }
};
