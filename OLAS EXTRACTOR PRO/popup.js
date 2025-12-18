// popup.js - VERSIÓN FINAL (Grupos + Chats)

// --- LÓGICA DE GRUPOS (EXISTENTE) ---
document.getElementById('btnCargar').addEventListener('click', () => {
    msg("Escaneando memoria...", "orange");
    enviarAlTab({ accion: "pedir_grupos" });
});

document.getElementById('btnExtraer').addEventListener('click', () => {
    const select = document.getElementById('listaGrupos');
    if (!select.value) { msg("❌ Selecciona un grupo", "red"); return; }
    msg("⏳ Extrayendo miembros...", "blue");
    enviarAlTab({ 
        accion: "pedir_participantes",
        idGrupo: select.value,
        nombreGrupo: select.options[select.selectedIndex].text
    });
});

// --- LÓGICA DE CHATS (NUEVA) ---
document.getElementById('btnExtraerChats').addEventListener('click', () => {
    msg("⏳ Escaneando todos tus chats...", "#6f42c1");
    // Enviamos la nueva orden al content.js
    enviarAlTab({ accion: "pedir_todos_chats" });
});

// --- ESCUCHAR RESPUESTAS ---
chrome.runtime.onMessage.addListener((request) => {
    // 1. Respuesta de Grupos
    if (request.accion === "datos_grupos") {
        const select = document.getElementById('listaGrupos');
        select.innerHTML = '<option value="">-- Selecciona un Grupo --</option>';
        request.datos.forEach(g => {
            const opt = document.createElement('option');
            opt.value = g.id; opt.text = g.name;
            select.appendChild(opt);
        });
        msg(`✅ ${request.datos.length} grupos encontrados.`, "green");
        document.getElementById('btnExtraer').style.display = 'block';
    }

    // 2. Respuesta de Excel (Sirve para grupos y chats)
    if (request.accion === "descargar_csv") {
        const datos = request.datos; 
        const tipo = request.tipo || "Reporte";
        msg(`✅ Generando Excel (${datos.length} filas)...`, "green");
        generarExcel(datos, tipo);
    }
});

// --- FUNCIONES AUXILIARES ---
function msg(texto, color) {
    const s = document.getElementById('status');
    s.innerText = texto; s.style.color = color || "#666";
}

function enviarAlTab(mensaje) {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, mensaje);
    });
}

function generarExcel(datos, prefijoNombre) {
    try {
        // Hoja de trabajo
        const hoja = XLSX.utils.json_to_sheet(datos);
        
        // Ajuste automático de ancho de columnas
        const colAnchos = Object.keys(datos[0] || {}).map(k => ({ wch: 25 }));
        hoja["!cols"] = colAnchos;

        // Libro
        const libro = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(libro, hoja, "Contactos");

        // Descarga
        const fecha = new Date().toISOString().slice(0,10);
        XLSX.writeFile(libro, `${prefijoNombre}_${fecha}.xlsx`);
        msg("✅ ¡Descarga completada!", "green");
    } catch (e) {
        console.error(e);
        msg("❌ Error creando Excel", "red");
    }
}