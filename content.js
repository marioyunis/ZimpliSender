! function() {
    const e = "https://wabiz.in";

    function t(e) {
        try {
            var t = document.createElement("script");
            t.type = "text/javascript", t.src = e, (document.head || document.body || document.documentElement).appendChild(t)
        } catch (e) {
            console.log(e)
        }
    }

    function n(e, t) {
        var n = document.createElement("meta");
        n.name = e, n.content = t, document.getElementsByTagName("head")[0].appendChild(n)
    }
    const o = async (e, t = "GET", n) => {
        let o = {
            method: t,
            body: JSON.stringify(n),
            redirect: "follow",
            headers: {
                "Content-Type": "application/json"
            }
        };
        "GET" === t && delete o.body;
        return await fetch(e, o).then((e => e.json()))
    };
    window.addEventListener("pws::get-dom-selectors", (async function(t) {
        const {
            name: n
        } = t.detail;
        o(`${e}/welcome/domSelectorsCrm`).then((e => {
            a(n, [e])
        })).catch((e => {
            a(n, [{}])
        }))
    })), window.addEventListener("pws::get-general-data", (async function(t) {
        const {
            name: n
        } = t.detail;
        o(`${e}/welcome/getGeneralData`).then((e => {
            a(n, [e])
        })).catch((e => {
            console.log(e)
        }))
    }));
    const a = (e, t) => {
        window.dispatchEvent(new CustomEvent("pws-event-emitter", {
            detail: {
                name: e,
                args: t
            }
        }))
    };

    function s(e, t, n) {
        return new Promise(((o, s) => {
            window.addEventListener(n, (function e(t) {
                window.removeEventListener(n, e), o(t)
            })), a(e, t)
        }))
    }
    window.addEventListener("pws::set-variables", (async function(e) {
        const {
            name: t,
            variables: n
        } = e.detail;
        await
        function(e) {
            return new Promise(((t, n) => {
                chrome.storage.local.set(e, (function() {
                    if (chrome.runtime.lastError) return console.log(chrome.runtime.lastError), n(chrome.runtime.lastError);
                    t()
                }))
            }))
        }(n), a(t)
    })), window.addEventListener("pws::get-variables", (async function(e) {
        const {
            name: t,
            variables: n
        } = e.detail, o = await
        function(e) {
            return new Promise(((t, n) => {
                chrome.storage.local.get(e, (function(e) {
                    if (chrome.runtime.lastError) return console.log(chrome.runtime.lastError), n(chrome.runtime.lastError);
                    t(e)
                }))
            }))
        }(n);
        a(t, [o])
    })), window.addEventListener("pws::remove-variables", (async function(e) {
        const {
            name: t,
            keys: n
        } = e.detail;
        await
        function(e) {
            return new Promise(((t, n) => {
                chrome.storage.local.remove(e, (function() {
                    if (chrome.runtime.lastError) return console.log(chrome.runtime.lastError), n(chrome.runtime.lastError);
                    t()
                }))
            }))
        }(n), a(t)
    })), window.addEventListener("pws::ping-background", (async function(e) {
        const t = await chrome.runtime.sendMessage({
            msg: "ping"
        });
        a("pws::tw-tw", [t])
    })), window.addEventListener("pws::send-msg", (async function(e) {
        const {
            name: t,
            msg: n
        } = e.detail, o = await chrome.runtime.sendMessage(n);
        a(t, [o])
    })), window.addEventListener("pws::translate", (async function(e) {
        const {
            name: t,
            text: n,
            language: o
        } = e.detail;
        fetch("https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=" + o + "&dt=t&dj=1&q=" + n).then((e => e.json())).then((e => {
            a(t, [e])
        })).catch((e => {
            a(t, ["Error"])
        }))
    })), chrome.storage.onChanged.addListener(((e, t) => {
        a("pws::storage-change", [e])
    })), window.addEventListener("pws::client-ready", (function(e) {
        c({
            type: "pws::client-ready",
            contacts: e.detail.contacts
        })
    })), window.addEventListener("pws::set-badge", (function(e) {
        c({
            type: "pws::set-badge",
            value: e.detail
        })
    })), window.getContacts = async function(e) {
        const t = await s("pws::get-contacts", [e], e);
        return console.log(t.detail ?.data), t.detail ?.data
    }, window.getWhatsappVersion = async function(e) {
        const t = await s("pws::get-whatsapp-version", [e], e);
        return console.log(t.detail ?.data), t.detail?.data
    }, window.contactSupport = async function(e, t) {
        const n = await s("pws::contact-support", [e, t], e);
        return n.detail?.success
    };
    let r = null;

    function c(e, t = 0) {
        try {
            r.postMessage(e)
        } catch (n) {
            if (t > 0) return console.log(n);
            i(), setTimeout(c, 1e3, e, t + 1)
        }
    }

    function i() {
        r = chrome.runtime.connect({
            name: "pws-content"
        }), r.onDisconnect.addListener((function() {
            i()
        })), r.onMessage.addListener(((...e) => {
            console.log(e)
        }))
    }
    window.sendMessage = c, window.connectToBackground = i, i(), chrome.storage.onChanged.addListener((function(e) {
        a("pws::store-changed", [e])
    }));
    const d = setInterval((() => {
        if (null !== document.querySelector("#side")) {
            clearInterval(d), n("pws-id", chrome.runtime.id), n("pws-version", chrome.runtime.getManifest().version), n("pws-url", chrome.runtime.getURL(""));
            const e = document.createElement("div");
            e.id = "pws-provider", document.body.append(e), t(chrome.runtime.getURL("lib.js")),
                function(e, t) {
                    if (null === document.getElementById(e)) {
                        var n = document.createElement("link");
                        n.rel = "stylesheet", n.type = "text/css", n.href = t, n.id = e, (document.head || document.body || document.documentElement).appendChild(n)
                    }
                }("pws-custom-css", chrome.runtime.getURL("css/page.css"))
        }
    }), 1e3);
    window.addEventListener("pws::lib-loaded", (() => {
        t(chrome.runtime.getURL("page.min.js"))
    }))
}();