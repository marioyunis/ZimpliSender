// inyector.js - VERSIÓN TRADUCTORA DE LIDs
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

        // --- CASO 2: EXTRAER PARTICIPANTES (CON TRADUCCIÓN) ---
        if (event.data.type === "EXTRAER_PARTICIPANTES") {
            const { idGrupo, nombreGrupo } = event.data;
            log(`Extrayendo y descifrando participantes de: '${nombreGrupo}'...`);
            
            if (!window.WPP) return;

            try {
                // 1. Obtenemos participantes (pueden venir mezclados: teléfonos reales y LIDs)
                const participantes = await window.WPP.group.getParticipants(idGrupo);
                
                // 2. Procesamos UNO POR UNO para traducir los LIDs
                // Usamos Promise.all porque la traducción es asíncrona
                const listaLimpia = await Promise.all(participantes.map(async (p) => {
                    let numeroReal = p.id.user; // Por defecto asumimos que es el número
                    
                    // DETECCIÓN DE LID: Si es un ID de privacidad, lo traducimos
                    if (p.id.server === 'lid' || p.id._serialized.includes('@lid')) {
                        try {
                            // Función mágica de WPPConnect para buscar el teléfono real
                            const mapping = await WPP.contact.getPhoneNumber(p.id);
                            if (mapping && mapping.user) {
                                numeroReal = mapping.user;
                                // log(`Traducción: LID ${p.id.user} -> TEL ${numeroReal}`);
                            }
                        } catch (err) {
                            // Si falla la traducción, nos quedamos con el ID (mejor que nada)
                            console.warn("No se pudo traducir LID:", p.id.user);
                        }
                    }

                    return {
                        grupo: nombreGrupo,
                        telefono: "+" + numeroReal // Agregamos el + para Excel
                    };
                }));

                log(`✅ Finalizado: ${listaLimpia.length} contactos procesados.`);

                window.dispatchEvent(new CustomEvent("WA_DATOS_LISTOS_PARA_CSV", { 
                    detail: listaLimpia 
                }));

            } catch (e) {
                logErr("❌ ERROR: " + e.message);
                console.error(e);
            }
        }
    });
})();