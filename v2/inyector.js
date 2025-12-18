// inyector.js - VERSIÓN FINAL "CIRUJANO" (Basada en tu hallazgo)
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
            log(`Analizando grupo: '${nombreGrupo}'`);
            
            if (!window.WPP) return;

            try {
                const participantes = await window.WPP.group.getParticipants(idGrupo);
                log(`Miembros encontrados: ${participantes.length}`);

                const listaFinal = [];

                for (const p of participantes) {
                    let numeroReal = p.id.user; 
                    let esLid = (p.id.server === 'lid' || p.id._serialized.includes('@lid'));

                    // Si es un código oculto (LID), aplicamos tu descubrimiento
                    if (esLid) {
                        let encontrado = false;

                        // ESTRATEGIA PRIORITARIA (Tu hallazgo): Buscar en p.contact.__x_phoneNumber
                        // A veces la propiedad 'contact' está oculta o es un getter.
                        const contactoInterno = p.contact; 
                        
                        if (contactoInterno) {
                            // Buscamos donde dijiste: __x_phoneNumber o phoneNumber
                            const dataTelefono = contactoInterno.__x_phoneNumber || contactoInterno.phoneNumber;
                            
                            if (dataTelefono && dataTelefono.user) {
                                numeroReal = dataTelefono.user;
                                encontrado = true;
                                // console.log(`🎯 ¡Bingo! LID descifrado desde __x_phoneNumber: ${numeroReal}`);
                            }
                        }

                        // ESTRATEGIA SECUNDARIA: Si la anterior falla, preguntamos a la base de datos
                        if (!encontrado) {
                            try {
                                const result = await window.WPP.contact.getPhoneNumber(p.id._serialized);
                                if (result && result.user) {
                                    numeroReal = result.user;
                                }
                            } catch (err) { /* Silencio */ }
                        }
                    }

                    listaFinal.push({
                        grupo: nombreGrupo,
                        telefono: "+" + numeroReal
                    });
                }

                log(`✅ Proceso terminado. ${listaFinal.length} contactos listos.`);

                window.dispatchEvent(new CustomEvent("WA_DATOS_LISTOS_PARA_CSV", { 
                    detail: listaFinal 
                }));

            } catch (e) {
                logErr("❌ ERROR: " + e.message);
                console.error(e);
            }
        }
    });
})();