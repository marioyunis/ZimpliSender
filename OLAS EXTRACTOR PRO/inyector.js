// inyector.js - VERSIÓN "SABUESO" 8.0 (BÚSQUEDA PROFUNDA DE ETIQUETAS)
(() => {
    const log = (msg) => console.log(`%c [OLAS Extractor] ${msg}`, "color: #bada55; background: #222; font-size: 11px; padding: 2px");
    const logErr = (msg) => console.log(`%c [OLAS ERROR] ${msg}`, "color: white; background: red; font-size: 11px");

    // --- EL SABUESO DE ETIQUETAS ---
    function encontrarDiccionarioEtiquetas() {
        const mapa = {};
        let encontrados = [];
        let fuente = "Ninguna";

        // 1. Intento Oficial (API)
        try {
            if (window.WPP.label && window.WPP.label.getAllLabels) {
                encontrados = window.WPP.label.getAllLabels();
                if (encontrados.length > 0) fuente = "API Oficial (WPP.label)";
            }
        } catch(e) {}

        // 2. Intento "Sabueso" (Escanear Memoria Store)
        if ((!encontrados || encontrados.length === 0) && window.WPP.whatsapp && window.WPP.whatsapp.Store) {
            const Store = window.WPP.whatsapp.Store;
            
            // Recorremos TODAS las colecciones del Store buscando algo que parezca una etiqueta
            // Una etiqueta suele tener las propiedades: "id", "name" y "color" (o "hexColor")
            const posiblesNombres = ["Label", "LabelCollection", "Tag", "TagCollection"];
            
            // A. Buscamos por nombre conocido
            for (const nombre of posiblesNombres) {
                if (Store[nombre] && (Store[nombre].models || Store[nombre]._models)) {
                    encontrados = Store[nombre].models || Store[nombre]._models;
                    if (encontrados.length > 0) {
                        fuente = `Store.${nombre}`;
                        break;
                    }
                }
            }

            // B. Si falla, ESCANEO BRUTO (Buscamos en TODO el Store)
            if (!encontrados || encontrados.length === 0) {
                console.log("🕵️ Iniciando escaneo profundo de memoria para hallar etiquetas...");
                for (const key in Store) {
                    const modulo = Store[key];
                    if (modulo && (modulo.models || modulo._models)) {
                        const items = modulo.models || modulo._models;
                        if (items.length > 0) {
                            const muestra = items[0];
                            // ¿Tiene pinta de etiqueta? (Tiene nombre y color)
                            if (muestra.id && muestra.name && (muestra.color !== undefined || muestra.hexColor !== undefined)) {
                                encontrados = items;
                                fuente = `Store.${key} (Detectado Automáticamente)`;
                                break;
                            }
                        }
                    }
                }
            }
        }

        // 3. Construir Mapa
        if (encontrados && encontrados.length > 0) {
            encontrados.forEach(e => {
                if (e.id && e.name) {
                    mapa[String(e.id)] = e.name; // ID como texto para evitar errores
                }
            });
            console.log(`✅ ETIQUETAS ENCONTRADAS en [${fuente}]:`, mapa);
        } else {
            console.warn("❌ NO se encontraron etiquetas. ¿Es una cuenta Business?");
        }

        return mapa;
    }

    // --- FUNCIÓN TELÉFONOS ---
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
                if (!window.WPP) throw new Error("WhatsApp no está listo");
                const chats = await window.WPP.chat.list();
                const grupos = chats.filter(c => c.isGroup).map(g => ({ id: g.id._serialized, name: g.name || "Sin Nombre" }));
                window.dispatchEvent(new CustomEvent("WA_GRUPOS_EXTRAIDOS", { detail: grupos }));
            } catch(e) { logErr(e.message); }
        }

        // CASO 2: EXTRAER PARTICIPANTES (GRUPOS)
        if (event.data.type === "EXTRAER_PARTICIPANTES") {
            try {
                const { idGrupo, nombreGrupo } = event.data;
                log(`Extrayendo grupo: ${nombreGrupo}`);
                const participantes = await window.WPP.group.getParticipants(idGrupo);
                const listaFinal = [];

                for (const p of participantes) {
                    let contacto = p.contact;
                    if (!contacto) try { contacto = await window.WPP.contact.getContact(p.id._serialized); } catch(e){}
                    const telefono = await obtenerTelefonoReal(p.id, contacto);
                    const nombre = (contacto && (contacto.name || contacto.formattedName)) ? contacto.name || contacto.formattedName : "No Agendado";
                    const nickname = (contacto && contacto.pushname) ? contacto.pushname : "";
                    
                    listaFinal.push({ 
                        "Grupo": nombreGrupo, 
                        "Nombre": nombre, 
                        "Nickname": nickname,
                        "Teléfono": "+" + telefono, 
                        "Admin": p.isAdmin ? "SI" : "NO" 
                    });
                }
                window.dispatchEvent(new CustomEvent("WA_DATOS_LISTOS_PARA_CSV", { detail: { datos: listaFinal, tipo: "Grupo" } }));
            } catch (e) { logErr(e.message); }
        }

        // ==========================================
        // CASO 3: EXTRAER CHATS 
        // ==========================================
        if (event.data.type === "EXTRAER_CHATS_AHORA") {
            log("🚀 Iniciando extracción OLAS PRO...");
            
            try {
                // 1. BUSCAR ETIQUETAS (El Sabueso)
                const mapaEtiquetas = encontrarDiccionarioEtiquetas();

                // 2. BUSCAR CHATS
                const allChats = await window.WPP.chat.list();
                const userChats = allChats.filter(c => !c.isGroup && !c.isBroadcast && c.id.server !== 'broadcast');
                
                log(`Procesando ${userChats.length} leads...`);
                const listaFinal = [];

                for (const chat of userChats) {
                    let contacto = chat.contact;
                    if (!contacto) try { contacto = await window.WPP.contact.getContact(chat.id._serialized); } catch(e){}

                    const telefono = await obtenerTelefonoReal(chat.id, contacto);
                    const nombreAgendado = (contacto && (contacto.name || contacto.formattedName)) ? contacto.name || contacto.formattedName : "No Agendado";
                    const nickname = (contacto && contacto.pushname) ? contacto.pushname : (chat.pushname || "");

                    // 3. MAPEO DE ETIQUETAS
                    let etiquetasTexto = "";
                    if (chat.labels && chat.labels.length > 0) {
                        etiquetasTexto = chat.labels
                            .map(id => mapaEtiquetas[String(id)] || `[ID:${id}]`) 
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

                log(`✅ ¡Éxito! ${listaFinal.length} leads exportados.`);

                window.dispatchEvent(new CustomEvent("WA_DATOS_LISTOS_PARA_CSV", { 
                    detail: { datos: listaFinal, tipo: "OLAS_Leads" } 
                }));

            } catch (e) {
                logErr("Error fatal: " + e.message);
                alert("Error: " + e.message);
            }
        }
    });
})();