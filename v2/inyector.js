// inyector.js - VERSIÓN MAESTRA: GRUPOS + CHATS + LIDs
(() => {
    // Utilitarios de log
    const log = (msg) => console.log(`%c [Inyector] ${msg}`, "color: #bada55; background: #222; font-size: 11px; padding: 2px");
    const logErr = (msg) => console.log(`%c [Inyector ERROR] ${msg}`, "color: white; background: red; font-size: 11px");

    /**
     * FUNCIÓN MAESTRA PARA DESCIFRAR NÚMEROS
     * Busca el teléfono real en 3 lugares:
     * 1. Propiedad interna __x_phoneNumber (La más fiable para LIDs).
     * 2. Traducción de WAPI (getPhoneNumber).
     * 3. ID de usuario por defecto.
     */
    async function obtenerTelefonoReal(idObject, contactObj) {
        let numero = idObject.user; // Valor por defecto

        // Solo nos esforzamos si es un LID (Código oculto)
        if (idObject.server === 'lid' || idObject._serialized.includes('@lid')) {
            
            // ESTRATEGIA 1: Buscar en el objeto contacto (Memoria RAM)
            if (contactObj) {
                const data = contactObj.__x_phoneNumber || contactObj.phoneNumber;
                if (data && data.user) return data.user;
            }

            // ESTRATEGIA 2: Preguntar a la base de datos de WhatsApp
            try {
                const res = await window.WPP.contact.getPhoneNumber(idObject._serialized);
                if (res && res.user) return res.user;
            } catch (e) {
                // Si falla, seguimos con el ID original
            }
        }
        return numero;
    }

    // --- LISTENER PRINCIPAL ---
    window.addEventListener("message", async (event) => {
        if (!event.data || !event.data.type) return;

        // ==========================================
        // CASO 1: LISTAR LOS GRUPOS (Para el Combo)
        // ==========================================
        if (event.data.type === "EXTRAER_GRUPOS_AHORA") {
            if (!window.WPP || !window.WPP.isReady) { logErr("WPP no está listo. Recarga la página."); return; }
            try {
                const chats = await window.WPP.chat.list();
                const grupos = chats.filter(c => c.isGroup).map(g => ({
                    id: g.id._serialized,
                    name: g.name || "Sin Nombre"
                }));
                window.dispatchEvent(new CustomEvent("WA_GRUPOS_EXTRAIDOS", { detail: grupos }));
            } catch (e) { logErr("Error listando grupos: " + e.message); }
        }

        // ==========================================
        // CASO 2: EXTRAER PARTICIPANTES (GRUPOS) - REPARADO
        // ==========================================
        if (event.data.type === "EXTRAER_PARTICIPANTES") {
            const { idGrupo, nombreGrupo } = event.data;
            log(`👥 Analizando Grupo: '${nombreGrupo}'...`);
            
            if (!window.WPP) return;

            try {
                // 1. Obtenemos participantes
                const participantes = await window.WPP.group.getParticipants(idGrupo);
                log(`Encontrados ${participantes.length} miembros.`);

                const listaFinal = [];

                // 2. Procesamos cada miembro
                for (const p of participantes) {
                    // Optimizamos: Usamos p.contact si existe, si no, lo pedimos (pero es lento)
                    let contacto = p.contact;
                    if (!contacto) {
                        try { contacto = await window.WPP.contact.getContact(p.id._serialized); } catch(e){}
                    }

                    // Desciframos el teléfono usando la función maestra
                    const telefono = await obtenerTelefonoReal(p.id, contacto);

                    listaFinal.push({
                        "Grupo": nombreGrupo,
                        "Teléfono": "+" + telefono,
                        "Admin": p.isAdmin ? "SI" : "NO",
                        "SuperAdmin": p.isSuperAdmin ? "SI" : "NO"
                    });
                }

                log(`✅ Procesado completo: ${listaFinal.length} registros.`);
                
                // Enviamos al Popup
                window.dispatchEvent(new CustomEvent("WA_DATOS_LISTOS_PARA_CSV", { 
                    detail: { datos: listaFinal, tipo: "Grupo" } 
                }));

            } catch (e) {
                logErr("❌ Error extrayendo grupo: " + e.message);
                console.error(e);
            }
        }

        // ==========================================
        // CASO 3: EXTRAER TODOS MIS CHATS (LEADS)
        // ==========================================
        if (event.data.type === "EXTRAER_CHATS_AHORA") {
            log("📂 Iniciando extracción masiva de chats...");
            
            try {
                const allChats = await window.WPP.chat.list();
                // Filtramos solo chats de usuarios (no grupos, no listas)
                const userChats = allChats.filter(c => !c.isGroup && !c.isBroadcast && c.id.server !== 'broadcast');
                
                log(`Encontrados ${userChats.length} chats personales.`);

                const listaFinal = [];

                for (const chat of userChats) {
                    // Obtenemos contacto asociado
                    let contacto = chat.contact;
                    if (!contacto) {
                        try { contacto = await window.WPP.contact.getContact(chat.id._serialized); } catch(e){}
                    }

                    const telefono = await obtenerTelefonoReal(chat.id, contacto);
                    
                    // Lógica de nombres
                    const nombreAgendado = (contacto && (contacto.name || contacto.formattedName)) ? contacto.name || contacto.formattedName : "No Agendado";
                    const nickname = (contacto && contacto.pushname) ? contacto.pushname : (chat.pushname || "");

                    listaFinal.push({
                        "Nombre Agendado": nombreAgendado,
                        "Nickname (Público)": nickname,
                        "Teléfono": "+" + telefono,
                        "Mensajes sin leer": chat.unreadCount
                    });
                }

                log(`✅ Procesados ${listaFinal.length} chats.`);

                window.dispatchEvent(new CustomEvent("WA_DATOS_LISTOS_PARA_CSV", { 
                    detail: { datos: listaFinal, tipo: "MisChats" } 
                }));

            } catch (e) {
                logErr("❌ Error en chats: " + e.message);
                console.error(e);
            }
        }
    });
})();