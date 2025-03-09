// https://www.kishorenewton.com/posts/http_headers_deep_dive_boosting_efficiency_with_cache_control_etag_and_last_modified/

console.log("Loading Cache Longer");

var currentDate = new Date();
currentDate.setMonth(currentDate.getMonth() + 6);
new_expires = currentDate.toUTCString();  //6 months in the future
var maxAge = 'public, max-age=15780000'; //6 months in seconds

browser.webRequest.onHeadersReceived.addListener(
    function (details) {
        if (!details.fromCache) {
            var expires_found = false;
            var cache_control_found = false;
            for (var header of details.responseHeaders) {
                if (header.name.toLowerCase() === 'expires') {
                    header.value = new_expires;
                    expires_found = true;
                } else if (header.name.toLowerCase() === 'cache-control') {
                    header.value = maxAge;
                    cache_control_found = true;
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