// Simple global fetch proxy that rewrites insecure HTTP requests to go
// through an HTTPS proxy. This avoids browser "Mixed Content" blocks when
// libraries attempt to access `http://` resources while the page itself is
// served over HTTPS.

const PROXY_BASE =
        import.meta.env.VITE_HTTP_PROXY || 'https://cors.isomorphic-git.org/';

const originalFetch = globalThis.fetch.bind(globalThis);

globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
        let url: string;
        if (typeof input === 'string') url = input;
        else if (input instanceof URL) url = input.toString();
        else url = input.url;

        if (url.startsWith('http://')) {
                return originalFetch(PROXY_BASE + url, init);
        }
        return originalFetch(input as any, init);
};

export {}; // ensure this file is treated as a module

