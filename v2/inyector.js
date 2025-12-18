// inyector.js - VERSIÓN CHATS + INSPECTOR
(() => {
    const log = (msg) => console.log(`%c [Inyector] ${msg}`, "color: #bada55; background: #222; font-size: 11px; padding: 2px");
    const logErr = (msg) => console.log(`%c [Inyector ERROR] ${msg}`, "color: white; background: red; font-size: 11px");

    // Función auxiliar para sacar el teléfono real (Reutilizamos tu hallazgo)
    async function obtenerTelefonoReal(idObject, contactObj) {
        let numero = idObject.user;
        
        // 1. Si es LID, intentamos sacar el dato interno
        if (idObject.server === 'lid' || idObject._serialized.includes('@lid')) {
            if (contactObj && (contactObj.__x_phoneNumber || contactObj.phoneNumber)) {
                const data = contactObj.__x_phoneNumber || contactObj.phoneNumber;
                if (data && data.user) return data.user;
            }
            // 2. Si falla, intentamos consulta WAPI
            try {
                const res = await window.WPP.contact.getPhoneNumber(idObject._serialized);
                if (res && res.user) return res.user;
            } catch (e) {}
        }
        return numero;
    }

    window.addEventListener("message", async (event) => {
        if (!event.data || !event.data.type) return;

        // --- CASO 1: EXTRAER GRUPOS (IGUAL) ---
        if (event.data.type === "EXTRAER_GRUPOS_AHORA") {
            if (!window.WPP || !window.WPP.isReady) return;
            const chats = await window.WPP.chat.list();
            window.dispatchEvent(new CustomEvent("WA_GRUPOS_EXTRAIDOS", { 
                detail: chats.filter(c => c.isGroup).map(g => ({ id: g.id._serialized, name: g.name || "Sin Nombre" }))
            }));
        }

        // --- CASO 2: EXTRAER PARTICIPANTES DE GRUPO (IGUAL) ---
        if (event.data.type === "EXTRAER_PARTICIPANTES") {
            // (Tu lógica anterior aquí, simplificada para no repetir código gigante, 
            //  pero asegúrate de mantener la lógica de __x_phoneNumber del paso anterior)
            const { idGrupo, nombreGrupo } = event.data;
            const parts = await window.WPP.group.getParticipants(idGrupo);
            const lista = [];
            for (const p of parts) {
                // Buscamos el contacto completo para tener acceso a __x_phoneNumber
                const contactFull = await window.WPP.contact.getContact(p.id._serialized);
                const tel = await obtenerTelefonoReal(p.id, contactFull || p.contact);
                lista.push({ Grupo: nombreGrupo, Telefono: "+" + tel });
            }
            window.dispatchEvent(new CustomEvent("WA_DATOS_LISTOS_PARA_CSV", { 
                detail: { datos: lista, tipo: "Grupo" } 
            }));
        }

        // --- CASO 3: EXTRAER TODOS LOS CHATS (NUEVO) ---
        if (event.data.type === "EXTRAER_CHATS_AHORA") {
            log("Iniciando extracción de chats personales...");
            
            try {
                // 1. Obtenemos TODOS los chats
                const allChats = await window.WPP.chat.list();
                
                // 2. Filtramos: NO grupos, NO listas de difusión, SOLO usuarios
                const userChats = allChats.filter(c => !c.isGroup && !c.isBroadcast && c.id.server !== 'broadcast');
                
                log(`Encontrados ${userChats.length} chats personales.`);

                const listaFinal = [];
                let inspeccionado = false;

                for (const chat of userChats) {
                    // Obtenemos el objeto contacto asociado al chat
                    const contacto = chat.contact || await window.WPP.contact.getContact(chat.id._serialized);

                    // --- ZONA DE INSPECCIÓN (Se ejecuta 1 vez) ---
                    if (!inspeccionado) {
                        console.group("🔍 INSPECCIÓN DE CHAT (Para verificar variables)");
                        console.log("Chat Obj:", chat);
                        console.log("Contact Obj:", contacto);
                        console.groupEnd();
                        inspeccionado = true;
                    }

                    // --- EXTRACCIÓN DE DATOS ---
                    // 1. Teléfono (Usando tu hallazgo)
                    const telefono = await obtenerTelefonoReal(chat.id, contacto);

                    // 2. Nombre de Contacto (Como tú lo guardaste)
                    // WPP suele usar 'name' para el nombre agendado, y 'pushname' para el público
                    // Si no está agendado, 'name' suele ser el teléfono o el pushname.
                    const nombreAgendado = contacto.name || contacto.formattedName || "Sin Nombre";

                    // 3. Nickname (El nombre que el usuario se puso)
                    const nickname = contacto.pushname || chat.pushname || "";

                    listaFinal.push({
                        "Nombre Contacto": nombreAgendado,
                        "Nickname": nickname,
                        "Teléfono": "+" + telefono
                    });
                }

                log(`✅ Procesados ${listaFinal.length} contactos.`);

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