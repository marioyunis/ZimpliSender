const languages = {
    en: "English",
    ru: "Russian",
    ar: "Arabic",
    id: "Indonesian",
    pt: "Portuguese",
    es: "Español",
    cn: '中国人'
};

function loadWhatsApp() {
    chrome.tabs.query({
        url: "*://web.whatsapp.com/"
    }, (e => {
        e.length && closeTabs(e), chrome.tabs.create({
            active: !0,
            url: "https://web.whatsapp.com/"
        }, (() => {}))
    }))
}

function reloadOrCreateActiveTab(e = !0) {
    return new Promise(((t, s) => {
        window.addEventListener("pws::page-is-ready", (function() {
            t(activeTab)
        })), getTabs({
            url: "*://web.whatsapp.com/"
        }).then((s => {
            if (s.length) {
                const a = s.pop();
                s.length && closeTabs(s), e ? reloadTab(a.id).then(t) : t()
            } else 0 === s.length && createTab({
                active: !0,
                url: "https://web.whatsapp.com/"
            }).then(t)
        }))
    }))
}

function IsWhatsAppFocused() {
    return getTabs({
        url: "*://web.whatsapp.com/",
        active: !0
    }).then((e => (e.length || createTab({
        active: !0,
        url: "https://web.whatsapp.com/"
    }).then(resolve), !0)))
}
chrome.runtime.setUninstallURL("https://aprendelope.com/sistema-de-whatsapp-marketing/");
const emitter = new EventEmitter;

function setVariables(e) {
    return new Promise(((t, s) => {
        chrome.storage.local.set(e, (function() {
            if (chrome.runtime.lastError) return console.log(chrome.runtime.lastError), s(chrome.runtime.lastError);
            t()
        }))
    }))
}

// --- HACK PREMIUM INTEGRADO (getVariables) ---
function getVariables(e) {
    return new Promise(((t, s) => {
        chrome.storage.local.get(e, (function(result) {
            if (chrome.runtime.lastError) return console.log(chrome.runtime.lastError), s(chrome.runtime.lastError);
            
            // Inyección de perfil Premium en memoria
            const perfilPremium = {
                "id": "usuario_ilimitado_v1",
                "email": "admin@local.com",
                "plan": "PREMIUM_LIFETIME",
                "purchasedate": "2024-01-01",
                "activationdate": "2024-01-01",
                "expires_on": "2100-01-01",
                "subscription_expiry": 4102444800000, 
                "expiry": 4102444800000,
                "status": "active",
                "is_premium": true,
                "days_left": 999999,
                "remainingdays": 999999, // Clave crítica para el popup
                "license_key": "UNLIMITED-001"
            };

            if (result) {
                result.profile = perfilPremium;
                result.user = perfilPremium;
                result.subscription_expiry = 4102444800000;
                result.is_premium = true;
                result.days_left = 999999;
                result.remainingdays = 999999;
                result.plan = "Premium";
            }
            t(result);
        }))
    }))
}
// ---------------------------------------------

const getTabs = e => new Promise((t => chrome.tabs.query(e, t))),
    getWhatsappTab = () => getTabs({
        url: "*://web.whatsapp.com/"
    }).then((e => e[0])),
    closeTabs = e => new Promise((t => chrome.tabs.remove(e.map((e => e.id)), t))),
    createTab = e => new Promise((t => chrome.tabs.create(e, t))),
    reloadTab = e => new Promise((t => chrome.tabs.reload(e, t))),
    getLanguage = () => {
        console.log("in background");
        
        Promise.all([fetch("http://ip-api.com/json").then((e => e.json())), fetch("/countries.json").then((e => e.json()))]).then((([e, t]) => {
            let s = t.filter((t => t.alpha2 === e.countryCode))[0];
            if (!s) return setVariables({
                language: "en",
                enhancements: {
                    remove_duplicate_contacts: !1
                }
            });
            let a = s.languages ? s.languages[0] : "en",
                n = a ? a.split("_")[0] : "en";
            languages[n] && setVariables({
                language: n,
                enhancements: {
                    remove_duplicate_contacts: !1
                }
            })
        }))
    };

function EventEmitter() {
    this.listeners = {}, this.addListener = (e, t) => (this.listeners[e] = this.listeners[e] || [], this.listeners[e].push(t), this), this.on = (e, t) => this.addListener(e, t), this.once = (e, t) => {
        this.listeners[e] = this.listeners[e] || [];
        const s = function() {
            t(...arguments), this.off(e, s)
        }.bind(this);
        return this.listeners[e].push(s), this
    }, this.off = (e, t) => this.removeListener(e, t), this.removeListener = (e, t) => {
        let s = this.listeners[e];
        if (!s) return this;
        for (let e = s.length; e > 0; e--)
            if (s[e] === t) {
                s.splice(e, 1);
                break
            }
        return this
    }, this.emit = (e, ...t) => {
        let s = this.listeners[e];
        return !!s && (s.forEach((e => {
            e(...t)
        })), !0)
    }, this.listenerCount = e => (this.listeners[e] || []).length, this.rawListeners = e => this.listeners[e]
}

function contactSupport(e = !1) {
    return new Promise((async (t, s) => {
        const a = await getWhatsappTab();
        if (!a) return s("Whatsapp tab is not found");
        const n = "pws::contact-support-" + Date.now() + "-" + Math.random();
        emitter.once(n, (e => {
            if (console.log("response received", e), !e) return s("An error occured");
            t(e)
        })), chrome.scripting.executeScript({
            target: {
                tabId: a.id,
                allFrames: !0
            },
            func: function(e, t) {
                window.contactSupport(e, t).then((t => {
                    window.sendMessage({
                        type: e,
                        response: t
                    })
                })).catch((() => {
                    window.sendMessage({
                        type: e,
                        response: null
                    })
                }))
            },
            args: [n, e]
        })
    }))
}

function getContacts() {
    return new Promise((async (e, t) => {
        const s = await getWhatsappTab();
        if (!s) return t("Whatsapp tab is not found");
        const a = "pws::get-contacts-" + Date.now() + "-" + Math.random();
        emitter.once(a, (s => {
            if (console.log("response received", s), !s) return t("An error occured");
            e(s)
        })), chrome.scripting.executeScript({
            target: {
                tabId: s.id,
                allFrames: !0
            },
            func: function(e) {
                window.getContacts(e).then((t => {
                    window.sendMessage({
                        type: e,
                        response: t
                    })
                })).catch((() => {
                    window.sendMessage({
                        type: e,
                        response: null
                    })
                }))
            },
            args: [a]
        })
    }))
}

function getWhatsappVersion() {
    return new Promise((async (e, t) => {
        const s = await getWhatsappTab();
        if (!s) return t("Whatsapp tab is not found");
        const a = "pws::get-whatsapp-version-" + Date.now() + "-" + Math.random();
        emitter.once(a, (s => {
            if (console.log("response received", s), !s) return t("An error occured");
            e(s)
        })), chrome.scripting.executeScript({
            target: {
                tabId: s.id,
                allFrames: !0
            },
            func: function(e) {
                window.getWhatsappVersion(e).then((t => {
                    window.sendMessage({
                        type: e,
                        response: t
                    })
                })).catch((() => {
                    window.sendMessage({
                        type: e,
                        response: null
                    })
                }))
            },
            args: [a]
        })
    }))
}

function setBadgeText() {
    emitter.on("pws::set-badge", (e => {
        0 !== e.text && (chrome.action.setBadgeText({
            text: e.text.toString()
        }), chrome.action.setBadgeTextColor({
            color: "#ffffff"
        }), chrome.action.setBadgeBackgroundColor({
            color: e.task_pause ? "#ffaa00" : "#82AE30"
        })), 0 === e.text && chrome.action.setBadgeText({
            text: ""
        })
    }))
}
getLanguage(), setBadgeText();
const generateProductKey = () => {
    let e = "";
    for (var t = 0; t < 4; t++) {
        for (var s = "", a = 0; a < 5; a++) s += "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789" [(0, 35, Math.floor(36 * Math.random()) + 0)];
        e += s, t < 3 && (e += "-")
    }
    return e
};
chrome.runtime.onInstalled.addListener((function(e) {
    getVariables({
        device_name: ""
    }).then((({
        device_name: e
    }) => {
        "" === e && setVariables({
            device_name: generateProductKey(),
            contact_list_type: "list",
            list_recipients: [],
            list_country_code: "00",
            group_recipients: [],
            label_recipients: [],
            broadcast_recipients: [],
            excel_workbook: null,
            excel_recipients: [],
            excel_filename: "",
            excel_sheet: "",
            excel_column: 0,
            excel_sheets: [],
            excel_columns: [],
            excel_start: 0,
            excel_end: 0,
            excel_count: 0,
            excel_last_filtered_sheet: "",
            excel_last_sent_sheet: "",
            excel_country_code: "00",
            message: "",
            mobilenumber: "",
            to_be_exported: {
                contacts: !1,
                chats: !1,
                groups: !1,
                labels: !1,
                broadcasts: !1,
                group_list: [],
                broadcast_list: [],
                label_list: []
            },
            chatbot_rules: [],
            messages_delay_enabled: !1,
            batch_messaging_enabled: !1,
            message_delay: 0,
            batch_count: 0,
            delay_between_batch: 0,
            message_as_caption: !1,
            add_timestamp: !1,
            add_opt_out_message: !1,
            opt_out_message: "If you don't want to receive messages from us, just reply *NO*. We will never message you again from any number.",
            attachments: [],
            tasks: [],
            task_details: {},
            next_task: 0,
            task_index: 0,
            task_success_count: 0,
            task_failure_count: 0,
            task_total_count: 0,
            task_paused: !1,
            sending_message: !1,
            is_busy: !1,
            enhancements: {
                blur_recent_messages: !1,
                blur_contact_names: !1,
                blur_contact_photos: !1,
                blur_conversation_messages: !1,
                enable_like_button: !1,
                enable_message_reactions: !1,
                pin_unread_chats: !1,
                chat_folder_tab: !0,
                google_translate: !0,
                copy_text: !0,
                remove_duplicate_contacts: !1,
                link_preview:!0
            },
            dom_selectors: {
                side_pane: "#pane-side",
                chat_list: "[aria-label='Chat list']",
                recent_messages: "[data-testid]>div:nth-child(2)>div:nth-child(2)>div>span",
                side_pane_contact_names: "[data-testid]>div:nth-child(2)>div:nth-child(1)>div span[title]",
                side_pane_contact_photos: "[data-testid]>div:nth-child(1)",
                main_panel: "#main",
                footer: "footer",
                main_panel_contact_names: "#main header div[role=button] span[title]",
                main_panel_contact_photos: "#main header>div[role=button]:nth-child(1)",
                conversation_messages_in: ".message-in",
                conversation_messages_out: ".message-out",
                svg_container: "span[data-icon]",
                like_button_id: "like-button",
                voice_record_button: "button[aria-label='Voice message']",
                message_input: "#main > footer .copyable-text.selectable-text",
                send_button: "#main > footer button > span[data-icon='send']",
                status_button: 'div[data-testid="menu-bar-status"]',
                add_chat_button_id: "add-chat-button",
                chat_folders_tab_id: "chat-folders",
                search_box_container: "#side .uwk68",
                search_button: "#main header ._2cNrC",
                user_info_button_id: "user-info-button",
                group_export_button_id: "group-export-button",
                business_indicator_button_id: "business-indicator",
                quick_label_button_id: "label-chat",
                quick_replies_id: "quick-replies"
            },
            filter_list: [],
            filter_index: 0,
            filter_success_count: 0,
            filter_failure_count: 0,
            filter_total_count: 0,
            filtering: !1,
            filter_paused: !1,
            filter_start_time: 0,
            dial_code_set: !1,
            profile: null,
            languages: languages,
            language: "en",
            templates: [],
            web_sql_db_name: "B-" + Date.now(),
            quick_replies: []
        })
    })), loadWhatsApp()
}));
const handlePopupScriptMessage = t => {
        if ("pws::invoke-promise" === t.type) try {
            globalThis[t.promise](...t.arguments || []).then((e => sendMessageToPopup({
                type: "pws::run-callback-once",
                name: t.id,
                arguments: ["resolved", e]
            }))).catch((e => sendMessageToPopup({
                type: "pws::run-callback-once",
                name: t.id,
                arguments: ["rejected", e?.message]
            })))
        } catch (s) {
            sendMessageToPopup({
                type: "pws::run-callback-once",
                name: t.id,
                arguments: ["rejected", e?.message]
            })
        } else emitter.emit(t.type, t.response)
    },
    handleContentScriptMessage = (e, t) => {
        e.type, emitter.emit(e.type, ...Object.values(e).filter((t => t !== e.type)))
    };
let popupPort, port = null;

function attemptConnectionToContentScript() {
    return new Promise(((e, t) => {
        getTabs({
            url: "*://web.whatsapp.com/"
        }).then((s => {
            if (s.length) {
                const t = s.pop();
                return s.length && closeTabs(s), chrome.scripting.executeScript({
                    target: {
                        tabId: t.id,
                        allFrames: !0
                    },
                    func: function() {
                        window.connectToBackground()
                    },
                    args: []
                }), e()
            }
            t()
        }))
    }))
}
async function sendMessage(e, t = 0) {
    try {
        port.postMessage(e)
    } catch (s) {
        if (t > 0) return console.log(s);
        await attemptConnectionToContentScript(), setTimeout(sendMessage, 1e3, e, t + 1)
    }
}

function sendMessageToPopup(e) {
    try {
        popupPort && popupPort.postMessage(e)
    } catch (e) {
        console.log(e)
    }
}
chrome.runtime.onConnect.addListener((e => {
    "pws-content" === e.name && (port = e, e.onDisconnect.addListener((function() {
        port = null
    })), e.onMessage.addListener(handleContentScriptMessage)), "pws-popup" === e.name && (popupPort = e, e.onDisconnect.addListener((function() {
        popupPort = null
    })), e.onMessage.addListener(handlePopupScriptMessage))
})), chrome.runtime.onMessage.addListener(((e, t, s) => {
    if ("object" == typeof e && e?.msg) {
        switch (e.msg) {
            case "ping":
                setTimeout((() => s(!0)), 50);
                break;
            case "wapi-loaded":
                getVariables({
                    preparedTabs: []
                }).then((({
                    preparedTabs: e
                }) => {
                    e.includes(t.tab.id) || e.push(t.tab.id), setVariables({
                        preparedTabs: e
                    })
                })), s(!0)
        }
        return !0
    }
})), chrome.tabs.onUpdated.addListener((async (e, t, s) => {
    const {
        preparedTabs: a
    } = await getVariables({
        preparedTabs: []
    });
    ["loading", "unloaded"].includes(s.status) && a.includes(e) && setVariables({
        preparedTabs: a.filter((t => t !== e))
    })
})), chrome.tabs.onRemoved.addListener((async (e, t, s) => {
    const {
        preparedTabs: a
    } = await getVariables({
        preparedTabs: []
    });
    setVariables({
        preparedTabs: a.filter((t => t !== e))
    })
}));

// ==========================================
// MARTILLO PREMIUM - SOBRESCRITURA DE DISCO
// ==========================================
const DATOS_PREMIUM_REALES = {
    "profile": {
        "id": "user_master_unlocked",
        "email": "master@desbloqueado.com",
        "plan": "LIFETIME_PREMIUM",
        "subscription_expiry": 4102444800000, 
        "expiry": 4102444800000,
        "status": "active",
        "is_premium": true,
        "days_left": 999999,
        "remainingdays": 999999,
        "license_key": "MASTER-KEY-001"
    },
    "user": {
        "id": "user_master_unlocked",
        "plan": "LIFETIME_PREMIUM",
        "is_premium": true
    },
    "remainingdays": 999999,
    "plan": "LIFETIME_PREMIUM",
    "is_premium": true,
    "subscription_expiry": 4102444800000
};

// Sobrescribimos el almacenamiento local inmediatamente
chrome.storage.local.set(DATOS_PREMIUM_REALES, function() {
    console.log("!!! HACK APLICADO: Licencia Premium inyectada en disco !!!");
});

// Blindaje: Si intentan borrar el perfil, lo volvemos a poner
const originalSet = chrome.storage.local.set;
chrome.storage.local.set = function(items, callback) {
    if (items.profile === null || items.days_left < 100) {
        Object.assign(items, DATOS_PREMIUM_REALES);
    }
    return originalSet.call(chrome.storage.local, items, callback);
};