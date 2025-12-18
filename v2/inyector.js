// inyector.js - MODO INSPECTOR DE ETIQUETAS
(() => {
    // Utilitarios de log
    const log = (msg) => console.log(`%c [Inyector] ${msg}`, "color: #bada55; background: #222; font-size: 11px; padding: 2px");
    const logErr = (msg) => console.log(`%c [Inyector ERROR] ${msg}`, "color: white; background: red; font-size: 11px");
    const logDebug = (titulo, obj) => {
        console.group(`🔥 INSPECCIÓN: ${titulo}`);
        console.dir(obj); // Imprime el objeto interactivo
        console.groupEnd();
    };

    /**
     * FUNCIÓN MAESTRA PARA TELÉFONOS (Igual que antes)
     */
    async function obtenerTelefonoReal(idObject, contactObj) {
        let numero = idObject.user; 
        if (idObject.server === 'lid' || idObject._serialized.includes('@lid')) {
            if (contactObj) {
                const data = contactObj.__x_phoneNumber || contactObj.phoneNumber;
                if (data && data.user) return data.user;
            }
            try {
                const res = await window.WPP.contact.getPhoneNumber(idObject._serialized);
                if (res && res.user) return res.user;
            } catch (e) {}
        }
        return numero;
    }

    // --- LISTENER PRINCIPAL ---
    window.addEventListener("message", async (event) => {
        if (!event.data || !event.data.type) return;

        // CASO 1: EXTRAER GRUPOS
        if (event.data.type === "EXTRAER_GRUPOS_AHORA") {
            if (!window.WPP || !window.WPP.isReady) { logErr("WPP no listo."); return; }
            const chats = await window.WPP.chat.list();
            const grupos = chats.filter(c => c.isGroup).map(g => ({ id: g.id._serialized, name: g.name || "Sin Nombre" }));
            window.dispatchEvent(new CustomEvent("WA_GRUPOS_EXTRAIDOS", { detail: grupos }));
        }

        // CASO 2: EXTRAER PARTICIPANTES
        if (event.data.type === "EXTRAER_PARTICIPANTES") {
            const { idGrupo, nombreGrupo } = event.data;
            log(`Analizando grupo: ${nombreGrupo}`);
            const participantes = await window.WPP.group.getParticipants(idGrupo);
            const listaFinal = [];
            for (const p of participantes) {
                let contacto = p.contact;
                if (!contacto) try { contacto = await window.WPP.contact.getContact(p.id._serialized); } catch(e){}
                const telefono = await obtenerTelefonoReal(p.id, contacto);
                const nombre = (contacto && (contacto.name || contacto.formattedName)) ? contacto.name || contacto.formattedName : "No Agendado";
                listaFinal.push({ "Grupo": nombreGrupo, "Nombre": nombre, "Teléfono": "+" + telefono, "Admin": p.isAdmin ? "SI" : "NO" });
            }
            window.dispatchEvent(new CustomEvent("WA_DATOS_LISTOS_PARA_CSV", { detail: { datos: listaFinal, tipo: "Grupo" } }));
        }

        // ==========================================
        // CASO 3: EXTRAER CHATS (ZONA DE INSPECCIÓN)
        // ==========================================
        if (event.data.type === "EXTRAER_CHATS_AHORA") {
            log("📂 Iniciando extracción de chats con MODO INSPECTOR...");
            
            try {
                // 1. INSPECCIONAR DICCIONARIO DE ETIQUETAS
                let mapaEtiquetas = {};
                
                // Verificamos si la función existe
                if (window.WPP.label && window.WPP.label.getAllLabels) {
                    const etiquetasRaw = await window.WPP.label.getAllLabels();
                    
                    // --- AQUÍ ESTÁ LO QUE PEDISTE ---
                    logDebug("DICCIONARIO CRUDO DESDE WHATSAPP", etiquetasRaw);
                    // --------------------------------

                    if (etiquetasRaw && etiquetasRaw.length > 0) {
                        etiquetasRaw.forEach(e => {
                            // Guardamos AMBOS: ID como número y como string por si acaso
                            mapaEtiquetas[e.id] = e.name;
                            mapaEtiquetas[String(e.id)] = e.name;
                        });
                        log(`✅ Diccionario procesado: ${Object.keys(mapaEtiquetas).length} entradas.`);
                    } else {
                        logErr("⚠️ La función getAllLabels() devolvió una lista vacía. ¿Tienes etiquetas creadas?");
                    }
                } else {
                    logErr("❌ La función WPP.label.getAllLabels NO existe. ¿Versión antigua de librería?");
                }

                // 2. PROCESAR CHATS
                const allChats = await window.WPP.chat.list();
                const userChats = allChats.filter(c => !c.isGroup && !c.isBroadcast && c.id.server !== 'broadcast');
                
                const listaFinal = [];
                let firstChatWithLabelFound = false; // Para no saturar la consola

                for (const chat of userChats) {
                    let contacto = chat.contact;
                    if (!contacto) try { contacto = await window.WPP.contact.getContact(chat.id._serialized); } catch(e){}

                    const telefono = await obtenerTelefonoReal(chat.id, contacto);
                    const nombreAgendado = (contacto && (contacto.name || contacto.formattedName)) ? contacto.name || contacto.formattedName : "No Agendado";
                    const nickname = (contacto && contacto.pushname) ? contacto.pushname : "";

                    // 3. INSPECCIÓN DE ETIQUETAS EN EL CHAT
                    let etiquetasTexto = "";
                    
                    if (chat.labels && chat.labels.length > 0) {
                        // SI ENCONTRAMOS UN CHAT CON ETIQUETAS, LO IMPRIMIMOS
                        if (!firstChatWithLabelFound) {
                            logDebug(`CHAT DE EJEMPLO CON ETIQUETAS (${nombreAgendado})`, {
                                chatName: nombreAgendado,
                                rawLabels: chat.labels, // ¿Qué hay aquí? ¿IDs numéricos? ¿Strings?
                                dictionary: mapaEtiquetas // Comparar contra esto
                            });
                            firstChatWithLabelFound = true;
                        }

                        // INTENTO DE TRADUCCIÓN
                        etiquetasTexto = chat.labels.map(id => {
                            // Intentamos buscar el ID directo o convertido a string
                            return mapaEtiquetas[id] || mapaEtiquetas[String(id)] || `[ID:${id}]`;
                        }).join(', ');
                    }

                    listaFinal.push({
                        "Etiquetas": etiquetasTexto, 
                        "Nombre Contacto": nombreAgendado,
                        "Nickname": nickname,
                        "Teléfono": "+" + telefono,
                        "Mensajes sin leer": chat.unreadCount
                    });
                }

                log(`✅ ¡Listo! Enviando datos.`);
                window.dispatchEvent(new CustomEvent("WA_DATOS_LISTOS_PARA_CSV", { detail: { datos: listaFinal, tipo: "MisChats" } }));

            } catch (e) {
                logErr("Error fatal: " + e.message);
                console.error(e);
            }
        }
    });
})();