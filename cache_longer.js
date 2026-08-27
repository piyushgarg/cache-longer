// https://www.kishorenewton.com/posts/http_headers_deep_dive_boosting_efficiency_with_cache_control_etag_and_last_modified/

console.log("Loading Cache Longer");

const DEBUG = false;
// var currentDate = new Date();
// currentDate.setMonth(currentDate.getMonth() + 6);
// new_expires = currentDate.toUTCString();  //6 months in the future
// var maxAge = 'public, max-age=15780000'; //6 months in seconds
const MAX_AGE_SECONDS = 15768000;
const CACHE_CONTROL_VALUE = `public, max-age=${MAX_AGE_SECONDS}, immutable`;

function getFutureExpiresHeader() {
    const currentDate = new Date();
    currentDate.setMonth(currentDate.getMonth() + 6);
    return currentDate.toUTCString();
}

// STEP 1: Prevent browser from sending conditional revalidation requests
// Strip conditional request headers to prevent HTTP 304 revalidation trips
browser.webRequest.onBeforeSendHeaders.addListener(
    function (details) {
        let headers = details.requestHeaders.filter(header => {
            const name = header.name.toLowerCase();
            return name !== 'if-none-match' &&
                name !== 'if-modified-since' &&
                name !== 'cache-control';
        });

        return { requestHeaders: headers };
    },
    {
        urls: ["<all_urls>"],
        types: ["font", "image", "script", "stylesheet"]
    },
    ["blocking", "requestHeaders"]
);

// STEP 2: Rewrite response headers to force disk caching
browser.webRequest.onHeadersReceived.addListener(
    function (details) {
        if (DEBUG) {
            console.log("----");
            console.log("URL:", details.url);
            console.log("Type:", details.type);
            console.log("From Cache:", details.fromCache);
        }

        // Filter out headers that prevent caching
        let headers = details.responseHeaders.filter(header => {
            const name = header.name.toLowerCase();
            return name !== 'cache-control' &&
                name !== 'expires' &&
                name !== 'pragma' &&
                name !== 'vary' && // Removing vary prevents cache invalidation across origin states
                name !== 'access-control-allow-origin';
        });

        // Add our overriding caching directives
        // Enforce max caching directives
        headers.push({ name: 'Cache-Control', value: CACHE_CONTROL_VALUE });
        headers.push({ name: 'Expires', value: getFutureExpiresHeader() });
        headers.push({ name: 'Access-Control-Allow-Origin', value: '*' });

        if (DEBUG) {
            console.log("Applied Modified Headers for:", details.url);
        }

        return { responseHeaders: headers };
    },
    { urls: ["<all_urls>"], types: ["font", "image", "script", "stylesheet"] }, ["blocking", "responseHeaders"]
);

/*browser.webRequest.onHeadersReceived.addListener(
    function (details) {
        if (debug) {
            console.log("----");
            console.log("url:" + details.url);
            console.log("type:" + details.type);
            console.log("cache:" + details.fromCache)
        }
        if (!details.fromCache) {
            var expires_found = false;
            var cache_control_found = false;
            var lmd = new Date();
            lmd.setHours(lmd.getHours() - 48);
            var lms = lmd.toUTCString();
            for (var header of details.responseHeaders) {
                if (header.name.toLowerCase() === 'expires') {
                    expires_found = true;
                    if (debug) console.log("oexpires:" + header.value);
                    header.value = new_expires;
                    if (debug) console.log("nexpires:" + header.value);
                } else if (header.name.toLowerCase() === 'cache-control') {
                    cache_control_found = true;
                    if (debug) console.log("ocache-control:" + header.value);
                    header.value = maxAge;
                    if (debug) console.log("ncache-control:" + header.value);
                    // } else if (header.name.toLowerCase() === 'last-modified') {
                    //     header.value = lms;
                    //     if (debug ) console.log("last-modified:" + header.value);
                }
            }
            if (!expires_found) {
                // If we are here, we didn't find any existing matching header.
                if (debug) console.log("adding expires");
                details.responseHeaders.push({name: "Expires", value: new_expires});
            }
            if (!cache_control_found) {
                if (debug) console.log("adding cache-control");
                details.responseHeaders.push({name: "Cache-Control", value: maxAge});
            }
        }
        return {responseHeaders: details.responseHeaders};
    },
    {urls: ["<all_urls>"], types: ["font", "image", "script", "stylesheet"]},
    ["blocking", "responseHeaders"]
);*/
