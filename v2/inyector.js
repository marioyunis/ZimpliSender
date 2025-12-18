// inyector.js - VERSIÓN 7.0 (EXTRACCIÓN PROFUNDA DE ETIQUETAS)
(() => {
    // Logs
    const log = (msg) => console.log(`%c [Inyector] ${msg}`, "color: #bada55; background: #222; font-size: 11px; padding: 2px");
    const logErr = (msg) => console.log(`%c [Inyector ERROR] ${msg}`, "color: white; background: red; font-size: 11px");

    // --- NUEVA LÓGICA DE ETIQUETAS (ACCESO DIRECTO A STORE) ---
    function forzarDiccionarioEtiquetas() {
        const mapa = {};
        let encontrados = [];

        try {
            // INTENTO 1: Vía API oficial (la que fallaba)
            if (window.WPP.label && window.WPP.label.getAllLabels) {
                try { encontrados = window.WPP.label.getAllLabels(); } catch(e){}
            }

            // INTENTO 2: Acceso directo al Store (La "Bóveda")
            // Si el Intento 1 falló o devolvió 0, buscamos aquí
            if ((!encontrados || encontrados.length === 0) && window.WPP.whatsapp && window.WPP.whatsapp.Store) {
                console.log("⚠️ API Labels vacía. Buscando en Store interno...");
                
                const Store = window.WPP.whatsapp.Store;
                
                // Buscamos en LabelCollection o LabelStore
                const LabelStore = Store.Label || Store.LabelCollection;
                
                if (LabelStore) {
                    // Los modelos suelen estar en .models o ._models
                    encontrados = LabelStore.models || LabelStore._models || LabelStore.getModelsArray();
                }
            }

            // PROCESAR RESULTADOS
            if (encontrados && encontrados.length > 0) {
                encontrados.forEach(e => {
                    // Aseguramos capturar ID y Nombre
                    if (e.id && e.name) {
                        mapa[String(e.id)] = e.name;
                    }
                });
                log(`✅ Diccionario reconstruido: ${Object.keys(mapa).length} etiquetas encontradas.`);
                // DEBUG: Muestra lo que encontró
                console.log("Diccionario:", mapa);
            } else {
                console.warn("❌ No se encontraron etiquetas en la memoria. ¿Es WhatsApp Business?");
            }

        } catch (error) {
            console.error("Error forzando etiquetas:", error);
        }

        return mapa;
    }

    // --- FUNCIÓN TELÉFONOS (TU HALLAZGO) ---
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
            try {
                if (!window.WPP) throw new Error("WPP no cargado");
                const chats = await window.WPP.chat.list();
                const grupos = chats.filter(c => c.isGroup).map(g => ({ id: g.id._serialized, name: g.name || "Sin Nombre" }));
                window.dispatchEvent(new CustomEvent("WA_GRUPOS_EXTRAIDOS", { detail: grupos }));
            } catch(e) { logErr(e.message); }
        }

        // CASO 2: EXTRAER PARTICIPANTES
        if (event.data.type === "EXTRAER_PARTICIPANTES") {
            try {
                const { idGrupo, nombreGrupo } = event.data;
                log(`Analizando grupo: ${nombreGrupo}`);
                const participantes = await window.WPP.group.getParticipants(idGrupo);
                
                const listaFinal = [];
                for (const p of participantes) {
                    let contacto = p.contact;
                    if (!contacto) try { contacto = await window.WPP.contact.getContact(p.id._serialized); } catch(e){}
                    const telefono = await obtenerTelefonoReal(p.id, contacto);
                    const nombre = (contacto && (contacto.name || contacto.formattedName)) ? contacto.name || contacto.formattedName : "No Agendado";
                    
                    listaFinal.push({ 
                        "Grupo": nombreGrupo, 
                        "Nombre": nombre, 
                        "Teléfono": "+" + telefono, 
                        "Admin": p.isAdmin ? "SI" : "NO" 
                    });
                }
                window.dispatchEvent(new CustomEvent("WA_DATOS_LISTOS_PARA_CSV", { detail: { datos: listaFinal, tipo: "Grupo" } }));
            } catch (e) { logErr(e.message); }
        }

        // ==========================================
        // CASO 3: EXTRAER CHATS (CON DICCIONARIO FORZADO)
        // ==========================================
        if (event.data.type === "EXTRAER_CHATS_AHORA") {
            log("📂 Iniciando extracción de chats...");
            
            try {
                // PASO 1: OBTENER ETIQUETAS (SIN ASYNC/AWAIT PORQUE ACCEDEMOS DIRECTO A MEMORIA)
                const mapaEtiquetas = forzarDiccionarioEtiquetas();

                // PASO 2: OBTENER CHATS
                const allChats = await window.WPP.chat.list();
                const userChats = allChats.filter(c => !c.isGroup && !c.isBroadcast && c.id.server !== 'broadcast');
                
                log(`Procesando ${userChats.length} chats...`);
                const listaFinal = [];

                for (const chat of userChats) {
                    // Contacto
                    let contacto = chat.contact;
                    if (!contacto) try { contacto = await window.WPP.contact.getContact(chat.id._serialized); } catch(e){}

                    // Datos
                    const telefono = await obtenerTelefonoReal(chat.id, contacto);
                    const nombreAgendado = (contacto && (contacto.name || contacto.formattedName)) ? contacto.name || contacto.formattedName : "No Agendado";
                    const nickname = (contacto && contacto.pushname) ? contacto.pushname : (chat.pushname || "");

                    // TRADUCCIÓN DE ETIQUETAS
                    let etiquetasTexto = "";
                    if (chat.labels && chat.labels.length > 0) {
                        etiquetasTexto = chat.labels
                            .map(id => {
                                // Aquí ocurre la magia: buscamos el ID en el mapa que forzamos
                                const nombre = mapaEtiquetas[String(id)];
                                return nombre ? nombre : `[ID:${id}]`;
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

                log(`✅ ¡Éxito! Generando archivo...`);

                window.dispatchEvent(new CustomEvent("WA_DATOS_LISTOS_PARA_CSV", { 
                    detail: { datos: listaFinal, tipo: "MisChats" } 
                }));

            } catch (e) {
                logErr("Error fatal en chats: " + e.message);
            }
        }
    });
})();