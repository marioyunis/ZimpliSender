// inyector.js - VERSIÓN 5.0 (FIX ETIQUETAS + CHATS + GRUPOS)
(() => {
    // Utilitarios de log
    const log = (msg) => console.log(`%c [Inyector] ${msg}`, "color: #bada55; background: #222; font-size: 11px; padding: 2px");
    const logErr = (msg) => console.log(`%c [Inyector ERROR] ${msg}`, "color: white; background: red; font-size: 11px");

    // Función auxiliar para teléfonos (LIDs)
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

        // --- CASO 2: EXTRAER PARTICIPANTES (GRUPO) ---
        if (event.data.type === "EXTRAER_PARTICIPANTES") {
            const { idGrupo, nombreGrupo } = event.data;
            log(`👥 Analizando Grupo: '${nombreGrupo}'...`);
            if (!window.WPP) return;

            try {
                const participantes = await window.WPP.group.getParticipants(idGrupo);
                const listaFinal = [];

                for (const p of participantes) {
                    let contacto = p.contact;
                    if (!contacto) try { contacto = await window.WPP.contact.getContact(p.id._serialized); } catch(e){}
                    const telefono = await obtenerTelefonoReal(p.id, contacto);

                    const nombreAgendado = (contacto && (contacto.name || contacto.formattedName)) ? contacto.name || contacto.formattedName : "No Agendado";
                    const nickname = (contacto && contacto.pushname) ? contacto.pushname : "";

                    listaFinal.push({
                        "Grupo": nombreGrupo,
                        "Nombre Contacto": nombreAgendado,
                        "Nickname": nickname,
                        "Teléfono": "+" + telefono,
                        "Admin": p.isAdmin ? "SI" : "NO"
                    });
                }
                
                window.dispatchEvent(new CustomEvent("WA_DATOS_LISTOS_PARA_CSV", { 
                    detail: { datos: listaFinal, tipo: "Grupo" } 
                }));

            } catch (e) { logErr("Error grupo: " + e.message); }
        }

        // --- CASO 3: EXTRAER CHATS (CON ETIQUETAS REPARADAS) ---
        if (event.data.type === "EXTRAER_CHATS_AHORA") {
            log("📂 Iniciando extracción de chats...");
            
            try {
                // ==========================================
                // 1. DICCIONARIO DE ETIQUETAS (REPARADO)
                // ==========================================
                let mapaEtiquetas = {};
                try {
                    if (window.WPP.label && window.WPP.label.getAllLabels) {
                        const etiquetasRaw = await window.WPP.label.getAllLabels();
                        
                        // LOG DE DEPURACIÓN (Míralo en consola F12)
                        console.group("🏷️ DEBUG ETIQUETAS ENCONTRADAS");
                        console.log("Objetos crudos:", etiquetasRaw);
                        
                        etiquetasRaw.forEach(e => {
                            // Guardamos el ID como string para asegurar coincidencia
                            const idStr = String(e.id); 
                            mapaEtiquetas[idStr] = e.name;
                            console.log(`Mapping: ID [${idStr}] = "${e.name}"`);
                        });
                        console.groupEnd();

                        log(`✅ Diccionario cargado: ${Object.keys(mapaEtiquetas).length} etiquetas.`);
                    } else {
                        console.warn("⚠️ WPP.label no está disponible (¿Es WhatsApp Business?)");
                    }
                } catch (err) { 
                    console.error("Error cargando etiquetas:", err); 
                }

                // ==========================================
                // 2. PROCESAR CHATS
                // ==========================================
                const allChats = await window.WPP.chat.list();
                const userChats = allChats.filter(c => !c.isGroup && !c.isBroadcast && c.id.server !== 'broadcast');
                
                log(`Procesando ${userChats.length} chats...`);
                const listaFinal = [];

                for (const chat of userChats) {
                    let contacto = chat.contact;
                    if (!contacto) try { contacto = await window.WPP.contact.getContact(chat.id._serialized); } catch(e){}

                    const telefono = await obtenerTelefonoReal(chat.id, contacto);
                    
                    const nombreAgendado = (contacto && (contacto.name || contacto.formattedName)) ? contacto.name || contacto.formattedName : "No Agendado";
                    const nickname = (contacto && contacto.pushname) ? contacto.pushname : (chat.pushname || "");

                    // 3. TRADUCCIÓN DE ETIQUETAS
                    let etiquetasTexto = "";
                    if (chat.labels && chat.labels.length > 0) {
                        etiquetasTexto = chat.labels
                            .map(id => {
                                const idStr = String(id); // Convertimos a texto por si acaso
                                return mapaEtiquetas[idStr] || `ID:${idStr}`; // Si no halla nombre, pone ID:...
                            })
                            .join(', ');
                    }

                    listaFinal.push({
                        "Etiquetas": etiquetasTexto, 
                        "Nombre Contacto": nombreAgendado,
                        "Nickname": nickname,
                        "Teléfono": "+" + telefono,
                        "Mensajes sin leer": chat.unreadCount
                    });
                }

                log(`✅ ¡Listo! ${listaFinal.length} filas generadas.`);

                window.dispatchEvent(new CustomEvent("WA_DATOS_LISTOS_PARA_CSV", { 
                    detail: { datos: listaFinal, tipo: "MisChats" } 
                }));

            } catch (e) {
                logErr("Error en chats: " + e.message);
                console.error(e);
            }
        }
    });
})();