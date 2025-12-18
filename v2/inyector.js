// inyector.js - VERSIÓN MAESTRA V2 (Grupos y Chats con Nombres Completos)
(() => {
    // Utilitarios de log
    const log = (msg) => console.log(`%c [Inyector] ${msg}`, "color: #bada55; background: #222; font-size: 11px; padding: 2px");
    const logErr = (msg) => console.log(`%c [Inyector ERROR] ${msg}`, "color: white; background: red; font-size: 11px");

    /**
     * FUNCIÓN MAESTRA PARA DESCIFRAR NÚMEROS
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

        // ==========================================
        // CASO 1: LISTAR LOS GRUPOS
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
        // CASO 2: EXTRAER PARTICIPANTES (GRUPOS) - MEJORADO
        // ==========================================
        if (event.data.type === "EXTRAER_PARTICIPANTES") {
            const { idGrupo, nombreGrupo } = event.data;
            log(`👥 Analizando Grupo: '${nombreGrupo}'...`);
            
            if (!window.WPP) return;

            try {
                const participantes = await window.WPP.group.getParticipants(idGrupo);
                log(`Encontrados ${participantes.length} miembros.`);

                const listaFinal = [];

                for (const p of participantes) {
                    // Obtenemos contacto completo
                    let contacto = p.contact;
                    if (!contacto) {
                        try { contacto = await window.WPP.contact.getContact(p.id._serialized); } catch(e){}
                    }

                    // 1. Teléfono Real
                    const telefono = await obtenerTelefonoReal(p.id, contacto);

                    // 2. Nombres (Nueva Lógica)
                    const nombreAgendado = (contacto && (contacto.name || contacto.formattedName)) ? contacto.name || contacto.formattedName : "No Agendado";
                    const nickname = (contacto && contacto.pushname) ? contacto.pushname : "";

                    listaFinal.push({
                        "Grupo": nombreGrupo,
                        "Nombre Contacto": nombreAgendado,
                        "Nickname": nickname,
                        "Teléfono": "+" + telefono,
                        "Admin": p.isAdmin ? "SI" : "NO",
                        "SuperAdmin": p.isSuperAdmin ? "SI" : "NO"
                    });
                }

                log(`✅ Procesado completo: ${listaFinal.length} registros.`);
                
                window.dispatchEvent(new CustomEvent("WA_DATOS_LISTOS_PARA_CSV", { 
                    detail: { datos: listaFinal, tipo: "Grupo" } 
                }));

            } catch (e) {
                logErr("❌ Error extrayendo grupo: " + e.message);
                console.error(e);
            }
        }

        // ==========================================
        // CASO 3: EXTRAER TODOS MIS CHATS
        // ==========================================
        if (event.data.type === "EXTRAER_CHATS_AHORA") {
            log("📂 Iniciando extracción masiva de chats...");
            
            try {
                const allChats = await window.WPP.chat.list();
                const userChats = allChats.filter(c => !c.isGroup && !c.isBroadcast && c.id.server !== 'broadcast');
                
                log(`Encontrados ${userChats.length} chats personales.`);

                const listaFinal = [];

                for (const chat of userChats) {
                    let contacto = chat.contact;
                    if (!contacto) {
                        try { contacto = await window.WPP.contact.getContact(chat.id._serialized); } catch(e){}
                    }

                    const telefono = await obtenerTelefonoReal(chat.id, contacto);
                    
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