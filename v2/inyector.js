// inyector.js - VERSIÓN 3.0 (TRADUCTOR MULTI-ESTRATEGIA)
(() => {
    // Utilitarios de log con colores para diferenciar
    const log = (msg) => console.log(`%c [Inyector] ${msg}`, "color: #bada55; background: #222; font-size: 11px; padding: 2px");
    const logErr = (msg) => console.log(`%c [Inyector ERROR] ${msg}`, "color: white; background: red; font-size: 11px");

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

        // --- CASO 2: EXTRAER PARTICIPANTES (EL NÚCLEO DEL PROBLEMA) ---
        if (event.data.type === "EXTRAER_PARTICIPANTES") {
            const { idGrupo, nombreGrupo } = event.data;
            log(`Analizando grupo: '${nombreGrupo}'...`);
            
            if (!window.WPP) return;

            try {
                const participantes = await window.WPP.group.getParticipants(idGrupo);
                log(`Encontrados ${participantes.length} miembros. Iniciando descifrado de LIDs...`);

                // Usamos un bucle for-of para poder usar await cómodamente
                const listaFinal = [];

                for (const p of participantes) {
                    let numeroReal = p.id.user; // Empezamos con el ID (aunque sea LID)
                    let esLid = (p.id.server === 'lid' || p.id._serialized.includes('@lid'));

                    if (esLid) {
                        try {
                            // ESTRATEGIA A: getPhoneNumber pasando el Objeto ID (no el string)
                            let result = await window.WPP.contact.getPhoneNumber(p.id);
                            
                            // ESTRATEGIA B: Si falla, buscar en el objeto Contacto completo
                            if (!result) {
                                const contact = await window.WPP.contact.getContact(p.id._serialized);
                                if (contact && contact.phoneNumber) {
                                    result = contact.phoneNumber;
                                }
                            }

                            // Si alguna estrategia funcionó, actualizamos el número
                            if (result && result.user) {
                                numeroReal = result.user;
                                // log(`✅ LID descifrado: ...${p.id.user.slice(-4)} -> ${numeroReal}`);
                            } else {
                                console.warn(`⚠️ No se pudo traducir el LID: ${p.id.user}`);
                            }

                        } catch (err) {
                            console.error("Error intentando traducir LID:", err);
                        }
                    }

                    listaFinal.push({
                        grupo: nombreGrupo,
                        telefono: "+" + numeroReal // Formato para que Excel no lo rompa
                    });
                }

                log(`✅ Proceso terminado. Enviando ${listaFinal.length} registros.`);

                window.dispatchEvent(new CustomEvent("WA_DATOS_LISTOS_PARA_CSV", { 
                    detail: listaFinal 
                }));

            } catch (e) {
                logErr("❌ ERROR FATAL: " + e.message);
                console.error(e);
            }
        }
    });
})();