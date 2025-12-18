// content.js - VERSIÓN PUENTE COMPLETO
console.log("[Content] Puente activo.");

// Inyección (Ya la tienes, pero la repito por seguridad)
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

// --- COMUNICACIÓN DE IDA (Popup -> Inyector) ---
chrome.runtime.onMessage.addListener((request) => {
    if (request.accion === "pedir_grupos") {
        window.postMessage({ type: "EXTRAER_GRUPOS_AHORA" }, "*");
    }
    
    // ESTE BLOQUE ES CRÍTICO. ¿Lo tenías?
    if (request.accion === "pedir_participantes") {
        console.log("[Content] Pasando orden de extracción al Inyector...");
        window.postMessage({ 
            type: "EXTRAER_PARTICIPANTES",
            idGrupo: request.idGrupo,
            nombreGrupo: request.nombreGrupo
        }, "*");
    }
});

// --- COMUNICACIÓN DE VUELTA (Inyector -> Popup) ---
window.addEventListener("WA_GRUPOS_EXTRAIDOS", (e) => {
    chrome.runtime.sendMessage({ accion: "datos_grupos", datos: e.detail });
});

window.addEventListener("WA_DATOS_LISTOS_PARA_CSV", (e) => {
    console.log("[Content] Datos recibidos para Excel. Enviando al Popup...");
    chrome.runtime.sendMessage({ accion: "descargar_csv", datos: e.detail });
});