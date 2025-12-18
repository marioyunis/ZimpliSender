// inyector.js - VERSIÓN FINAL CON TRADUCTOR DE LIDs
(() => {
    const log = (msg) => console.log(`%c [Inyector] ${msg}`, "color: #bada55; background: #222; font-size: 12px; padding: 2px");
    const logErr = (msg) => console.log(`%c [Inyector ERROR] ${msg}`, "color: white; background: red; font-size: 12px");

    window.addEventListener("message", async (event) => {
        if (!event.data || !event.data.type) return;

        // --- CASO 1: EXTRAER GRUPOS ---
        if (event.data.type === "EXTRAER_GRUPOS_AHORA") {
            if (!window.WPP || !window.WPP.isReady) { logErr("WPP no listo."); return; }
            try {
                const chats = await window.WPP.chat.list();
                const grupos = chats.filter(c => c.isGroup).map(g => ({
                    id: g.id._serialized,
                    name: g.name || "Sin Nombre"
                }));
                window.dispatchEvent(new CustomEvent("WA_GRUPOS_EXTRAIDOS", { detail: grupos }));
            } catch (e) { logErr("Error listando grupos: " + e.message); }
        }

        // --- CASO 2: EXTRAER PARTICIPANTES ---
        if (event.data.type === "EXTRAER_PARTICIPANTES") {
            const { idGrupo, nombreGrupo } = event.data;
            log(`Procesando participantes de: '${nombreGrupo}'`);
            
            if (!window.WPP) { logErr("WPP no existe"); return; }

            try {
                // 1. Obtenemos participantes (mezcla de LIDs y teléfonos)
                const participantes = await window.WPP.group.getParticipants(idGrupo);
                log(`Total participantes: ${participantes.length}. Iniciando traducción...`);

                // 2. TRADUCCIÓN ASÍNCRONA (Promise.all)
                // Usamos 'map' asíncrono para preguntar uno por uno el número real
                const listaLimpia = await Promise.all(participantes.map(async (p) => {
                    let numeroReal = p.id.user;

                    // Si detectamos que es un LID (código oculto)
                    if (p.id.server === 'lid' || p.id._serialized.includes('@lid')) {
                        try {
                            // Consultamos a la base de datos interna de WA
                            const result = await window.WPP.contact.getPhoneNumber(p.id._serialized);
                            if (result && result.user) {
                                numeroReal = result.user;
                            }
                        } catch (err) {
                            console.warn("No se pudo traducir LID:", p.id.user);
                        }
                    }

                    return {
                        grupo: nombreGrupo,
                        telefono: "+" + numeroReal // Formato para Excel
                    };
                }));

                log(`✅ Traducción finalizada.`);

                // 3. Enviar datos listos
                window.dispatchEvent(new CustomEvent("WA_DATOS_LISTOS_PARA_CSV", { 
                    detail: listaLimpia 
                }));

            } catch (e) {
                logErr("❌ Error: " + e.message);
                alert("Error extrayendo: " + e.message);
            }
        }
    });
})();