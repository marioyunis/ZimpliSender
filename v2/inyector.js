// inyector.js - MODO DIAGNÓSTICO PROFUNDO
(() => {
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

        // --- CASO 2: EXTRAER PARTICIPANTES ---
        if (event.data.type === "EXTRAER_PARTICIPANTES") {
            const { idGrupo, nombreGrupo } = event.data;
            log(`ANALIZANDO GRUPO: '${nombreGrupo}'`);
            
            if (!window.WPP) return;

            try {
                // 1. Obtener participantes
                const participantes = await window.WPP.group.getParticipants(idGrupo);
                log(`Total miembros: ${participantes.length}`);

                // 2. DIAGNÓSTICO: Verificamos si existe la función de traducción
                if (typeof window.WPP.contact.getPhoneNumber !== 'function') {
                    logErr("⚠️ ALERTA CRÍTICA: La función 'getPhoneNumber' NO EXISTE en esta versión de WAPI.");
                    // Intentamos buscar alternativas si existen
                    console.log("Funciones disponibles en WPP.contact:", Object.keys(window.WPP.contact));
                }

                const listaFinal = [];
                let contadores = { lids: 0, traducidos: 0, fallidos: 0 };

                // Procesamos uno por uno
                for (const p of participantes) {
                    let numeroReal = p.id.user; 
                    let esLid = (p.id.server === 'lid' || p.id._serialized.includes('@lid'));

                    if (esLid) {
                        contadores.lids++;
                        
                        // LOG DETALLADO PARA EL PRIMER LID QUE ENCONTREMOS
                        if (contadores.lids === 1) {
                            console.group("🔍 INSPECCIÓN DE LID (Primer caso encontrado)");
                            console.log("Datos crudos del participante:", p);
                            console.log("ID Serialized:", p.id._serialized);
                        }

                        try {
                            // INTENTO 1: getPhoneNumber
                            let result = await window.WPP.contact.getPhoneNumber(p.id._serialized);
                            
                            if (contadores.lids === 1) console.log("Resultado intento 1 (getPhoneNumber):", result);

                            // INTENTO 2: getContact (Si el 1 falla)
                            if (!result || !result.user) {
                                const contact = await window.WPP.contact.getContact(p.id._serialized);
                                if (contact) {
                                     if (contadores.lids === 1) console.log("Resultado intento 2 (getContact):", contact);
                                     if (contact.phoneNumber) result = contact.phoneNumber;
                                     // A veces el número está en `contact.id` si el contacto redirige
                                     if (!result && contact.id && contact.id.server === 'c.us') result = contact.id; 
                                }
                            }

                            // APLICAR RESULTADO
                            if (result && result.user) {
                                numeroReal = result.user;
                                contadores.traducidos++;
                            } else {
                                contadores.fallidos++;
                                if (contadores.lids === 1) console.warn("❌ FALLÓ LA TRADUCCIÓN para este LID");
                            }
                            
                            if (contadores.lids === 1) console.groupEnd();

                        } catch (err) {
                            console.error("Error en traducción:", err);
                        }
                    }

                    listaFinal.push({
                        grupo: nombreGrupo,
                        telefono: "+" + numeroReal
                    });
                }

                log(`RESUMEN: LIDs encontrados: ${contadores.lids} | Traducidos: ${contadores.traducidos} | Fallidos: ${contadores.fallidos}`);

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