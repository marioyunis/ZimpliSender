// inyector.js - VERSIÓN MAESTRA (Con Logs de Depuración)
(() => {
    const log = (msg) => console.log(`%c [Inyector] ${msg}`, "color: #bada55; background: #222; font-size: 12px; padding: 2px");
    const logErr = (msg) => console.log(`%c [Inyector ERROR] ${msg}`, "color: white; background: red; font-size: 12px");

    window.addEventListener("message", async (event) => {
        // Ignoramos mensajes que no sean nuestros
        if (!event.data || !event.data.type) return;

        // --- CASO 1: EXTRAER GRUPOS ---
        if (event.data.type === "EXTRAER_GRUPOS_AHORA") {
            log("Orden recibida: Listar grupos.");
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

        // --- CASO 2: EXTRAER PARTICIPANTES (Aquí es donde se te colgaba) ---
        if (event.data.type === "EXTRAER_PARTICIPANTES") {
            const { idGrupo, nombreGrupo } = event.data;
            log(`Orden recibida: Extraer gente de '${nombreGrupo}' (${idGrupo})`);
            
            // 1. Verificación de seguridad
            if (!window.WPP) { logErr("WPP no existe"); return; }

            try {
                log("⏳ Consultando a WAPI los participantes...");
                
                // 2. Llamada a WAPI
                const participantes = await window.WPP.group.getParticipants(idGrupo);
                
                log(`✅ WAPI respondió: ${participantes.length} participantes encontrados.`);

                // ... dentro del inyector.js ...

                // 3. Limpieza de datos
                const listaLimpia = participantes.map(p => ({
                    grupo: nombreGrupo,
                    // ANTES: telefono: p.id.user 
                    // AHORA (Con el truco del +):
                    telefono: "+" + p.id.user 
                }));

                // 4. Enviar de vuelta
                log("📤 Enviando datos listos al Content Script...");
                window.dispatchEvent(new CustomEvent("WA_DATOS_LISTOS_PARA_CSV", { 
                    detail: listaLimpia 
                }));

            } catch (e) {
                logErr("❌ FALLÓ LA EXTRACCIÓN: " + e.message);
                console.error(e);
                alert("Error extrayendo: " + e.message);
            }
        }
    });
})();