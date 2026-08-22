const MAX_INTERNAL_RESPONSE_BYTES = 128 * 1024;
export function parseInternalApiOrigin(value) {
    let url;
    try {
        url = new URL(value);
    }
    catch {
        throw new Error('META_AUTOMATION_API_URL must be an absolute origin URL');
    }
    if ((url.protocol !== 'http:' && url.protocol !== 'https:')
        || url.username !== ''
        || url.password !== ''
        || url.search !== ''
        || url.hash !== ''
        || url.pathname !== '/') {
        throw new Error('META_AUTOMATION_API_URL must contain an origin only');
    }
    return new URL(url.origin);
}
export function joinInternalApiRoute(origin, route) {
    if (!route.startsWith('/') || route.startsWith('//')) {
        throw new Error('Internal API route must be an absolute path');
    }
    const pathEnd = route.search(/[?#]/);
    const pathname = pathEnd === -1 ? route : route.slice(0, pathEnd);
    if (pathname.includes('//') || pathname.includes('/./') || pathname.includes('/../')) {
        throw new Error('Internal API route must be a canonical absolute path');
    }
    const target = new URL(route, origin.origin);
    if (target.origin !== origin.origin) {
        throw new Error('Internal API route must be a canonical absolute path');
    }
    return target;
}
function outputTooLarge() {
    return { ok: false, error: { code: 'OUTPUT_TOO_LARGE', message: 'Internal API response exceeded the output limit' } };
}
async function readBoundedResponse(response) {
    const contentLength = response.headers.get('content-length');
    if (contentLength !== null && Number.parseInt(contentLength, 10) > MAX_INTERNAL_RESPONSE_BYTES) {
        try {
            await response.body?.cancel();
        }
        catch {
            // The response is already oversized even if transport cancellation fails.
        }
        return outputTooLarge();
    }
    if (response.body === null)
        return '';
    const reader = response.body.getReader();
    const chunks = [];
    let bytesRead = 0;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            if (value === undefined)
                continue;
            if (value.byteLength > MAX_INTERNAL_RESPONSE_BYTES - bytesRead) {
                try {
                    await reader.cancel();
                }
                catch {
                    // The response is already oversized even if transport cancellation fails.
                }
                return outputTooLarge();
            }
            chunks.push(value);
            bytesRead += value.byteLength;
        }
    }
    finally {
        reader.releaseLock();
    }
    return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), bytesRead).toString('utf8');
}
export function createInternalApiClient(apiUrl, token, authMode = 'mcp-token') {
    const origin = parseInternalApiOrigin(apiUrl);
    return {
        async call(route, method = 'GET', body) {
            const url = joinInternalApiRoute(origin, route);
            const headers = { 'Content-Type': 'application/json' };
            if (token !== '') {
                if (authMode === 'bearer')
                    headers.Authorization = `Bearer ${token}`;
                else
                    headers['x-mcp-token'] = token;
            }
            try {
                const response = await fetch(url, {
                    method,
                    headers,
                    body: body === undefined ? undefined : JSON.stringify(body),
                });
                const text = await readBoundedResponse(response);
                if (typeof text !== 'string')
                    return text;
                if (text === '') {
                    return { ok: response.ok, status: response.status };
                }
                try {
                    return JSON.parse(text);
                }
                catch {
                    return { ok: false, error: { code: 'INVALID_INTERNAL_RESPONSE', message: 'Internal API returned invalid JSON' } };
                }
            }
            catch {
                return { ok: false, error: { code: 'INTERNAL_API_UNAVAILABLE', message: 'Internal API request failed' } };
            }
        },
    };
}
export { MAX_INTERNAL_RESPONSE_BYTES };
//# sourceMappingURL=internal-api-client.js.map