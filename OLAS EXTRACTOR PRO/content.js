// content.js
console.log("[Content] Puente activo v3.0");

// Inyección de scripts
const scriptLib = document.createElement('script');
scriptLib.src = chrome.runtime.getURL('wppconnect-wa.js');
scriptLib.onload = function() {
    this.remove();
    const scriptIny = document.createElement('script');
    scriptIny.src = chrome.runtime.getURL('inyector.js');
    scriptIny.onload = function() { this.remove(); };
    (document.head || document.documentElement).appendChild(scriptIny);
};
(document.head || document.documentElement).appendChild(scriptLib);

// --- ESCUCHAR AL POPUP ---
chrome.runtime.onMessage.addListener((request) => {
    if (request.accion === "pedir_grupos") {
        window.postMessage({ type: "EXTRAER_GRUPOS_AHORA" }, "*");
    }
    if (request.accion === "pedir_participantes") {
        window.postMessage({ 
            type: "EXTRAER_PARTICIPANTES",
            idGrupo: request.idGrupo,
            nombreGrupo: request.nombreGrupo
        }, "*");
    }
    // NUEVA ORDEN
    if (request.accion === "pedir_todos_chats") {
        window.postMessage({ type: "EXTRAER_CHATS_AHORA" }, "*");
    }
});

// --- ESCUCHAR AL INYECTOR ---
window.addEventListener("WA_GRUPOS_EXTRAIDOS", (e) => {
    chrome.runtime.sendMessage({ accion: "datos_grupos", datos: e.detail });
});

window.addEventListener("WA_DATOS_LISTOS_PARA_CSV", (e) => {
    chrome.runtime.sendMessage({ 
        accion: "descargar_csv", 
        datos: e.detail.datos,
        tipo: e.detail.tipo // Para nombrar el archivo distinto
    });
});