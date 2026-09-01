const api = typeof browser !== 'undefined' ? browser : chrome;
let dnrFeedbackUnavailableWarned = false;

api.runtime.onInstalled.addListener(() => {
    console.log("Cache Extension service worker active.");
});

function initializeDNRDebugger() {
    // 1. Chromium Real-Time Logger
    if (typeof api.declarativeNetRequest?.onRuleMatchedDebug?.addListener === 'function') {
        try {
            api.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
                console.group(`[DNR Match Real-Time] Rule ID: ${info.rule.ruleId}`);
                console.log("URL:", info.request.url);
                console.log("Type:", info.request.type);
                console.groupEnd();
            });
            console.log("DNR Debugger: Real-time listener attached.");
            return;
        } catch (e) {
            console.warn("Real-time listener failed:", e);
        }
    }

    // 2. Firefox fallback. testMatchOutcome is a development-only API in Firefox:
    // set extensions.dnr.feedback=true in about:config before expecting matches.
    if (typeof api.declarativeNetRequest?.testMatchOutcome === 'function') {
        console.log(
            "DNR Debugger: Firefox test scanner enabled. " +
            "Set extensions.dnr.feedback=true in about:config to receive match results."
        );

        // This requires the webRequest API permission as well as host access.
        if (api.webRequest?.onCompleted) {
            try {
                api.webRequest.onCompleted.addListener(
                    (details) => {
                        // Skip documents: the static rules only target assets.
                        if (details.type !== 'main_frame') {
                            testDNRMatch(details);
                        }
                    },
                    { urls: ["<all_urls>"] }
                );
                console.log("DNR Debugger: Firefox request observer attached.");
            } catch (error) {
                console.warn("DNR Debugger: Firefox request observer could not be attached:", error);
            }
        }
    }
}

/**
 * Maps webRequest resource types to declarativeNetRequest ResourceType strings
 */
function mapResourceType(webRequestType) {
    const typeMap = {
        'script': 'script',
        'stylesheet': 'stylesheet',
        'image': 'image',
        'font': 'font',
        'xmlhttprequest': 'xmlhttprequest',
        'media': 'media',
        'websocket': 'websocket',
        'sub_frame': 'sub_frame'
    };
    return typeMap[webRequestType] || 'other';
}

/**
 * Manual & Automated Rule Tester using testMatchOutcome
 */
async function testDNRMatch(detailsOrUrl, resourceType = "script", requestMethod = "GET") {
    if (typeof api.declarativeNetRequest?.testMatchOutcome !== 'function') return;

    // Keep the function usable from the extension console as testDNRMatch(url).
    const details = typeof detailsOrUrl === "string"
        ? { url: detailsOrUrl, type: resourceType, method: requestMethod, tabId: -1 }
        : detailsOrUrl;
    const type = mapResourceType(details.type);
    const request = {
        url: details.url,
        type,
        method: (details.method || "GET").toLowerCase()
    };
    if (details.originUrl) request.initiator = details.originUrl;
    if (Number.isInteger(details.tabId)) request.tabId = details.tabId;

    try {
        const result = await api.declarativeNetRequest.testMatchOutcome(request);

        const matched = result.matchedRules || [];

        if (matched.length > 0) {
            console.group(`[DNR Match] ${details.url}`);
            matched.forEach((rule) => {
                console.log(`Rule ID: ${rule.ruleId} | Ruleset: ${rule.rulesetId} | Type: ${type}`);
            });
            console.groupEnd();
        }
    } catch (error) {
        // Firefox rejects this call until extensions.dnr.feedback is enabled.
        if (!dnrFeedbackUnavailableWarned) {
            dnrFeedbackUnavailableWarned = true;
            console.warn("DNR Debugger: testMatchOutcome is unavailable. In Firefox, set extensions.dnr.feedback=true in about:config.", error);
        }
    }
}

globalThis.testDNRMatch = testDNRMatch;
initializeDNRDebugger();
