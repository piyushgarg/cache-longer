// https://www.kishorenewton.com/posts/http_headers_deep_dive_boosting_efficiency_with_cache_control_etag_and_last_modified/

console.log("Loading Cache Longer");

var debug = false;
var currentDate = new Date();
currentDate.setMonth(currentDate.getMonth() + 6);
new_expires = currentDate.toUTCString();  //6 months in the future
var maxAge = 'public, max-age=15780000'; //6 months in seconds

browser.webRequest.onHeadersReceived.addListener(
    function (details) {
        if (debug) {
            console.log("----");
            console.log("url:"+details.url);
            console.log("type:"+details.type);
            console.log("cache:"+details.fromCache)
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
                    if (debug ) console.log("oexpires:" + header.value);
                    header.value = new_expires;
                    if (debug ) console.log("nexpires:" + header.value);
                } else if (header.name.toLowerCase() === 'cache-control') {
                    cache_control_found = true;
                    if (debug ) console.log("ncache-control:" + header.value);
                    header.value = maxAge;
                    if (debug ) console.log("ocache-control:" + header.value);
                // } else if (header.name.toLowerCase() === 'last-modified') {
                //     header.value = lms;
                //     if (debug ) console.log("last-modified:" + header.value);
                }
            }
            if (!expires_found) {
                // If we are here, we didn't find any existing matching header.
                details.responseHeaders.push({name: "Expires", value: new_expires});
            }
            if (!cache_control_found) {
                details.responseHeaders.push({name: "Cache-Control", value: maxAge});
            }
        }
        return {responseHeaders: details.responseHeaders};
    },
    {urls: ["<all_urls>"], types: ["font", "image", "script", "stylesheet"]},
    ["blocking", "responseHeaders"]
);