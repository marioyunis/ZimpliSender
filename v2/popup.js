// popup.js - GENERADOR DE EXCEL (.xlsx)

// 1. Botón Cargar Grupos
document.getElementById('btnCargar').addEventListener('click', () => {
    const status = document.getElementById('status');
    status.innerText = "Conectando...";
    status.style.color = "orange";
    
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { accion: "pedir_grupos" });
    });
});

// 2. Botón Extraer
document.getElementById('btnExtraer').addEventListener('click', () => {
    const select = document.getElementById('listaGrupos');
    const idGrupo = select.value;
    const nombreGrupo = select.options[select.selectedIndex].text;
    const status = document.getElementById('status');

    if (!idGrupo) {
        status.innerText = "❌ Selecciona un grupo primero";
        return;
    }

    status.innerText = "⏳ Extrayendo contactos...";
    status.style.color = "blue";

    // Pedimos los datos al content.js
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { 
            accion: "pedir_participantes",
            idGrupo: idGrupo,
            nombreGrupo: nombreGrupo
        });
    });
});

// 3. Escuchar respuestas
chrome.runtime.onMessage.addListener((request) => {
    const status = document.getElementById('status');

    // Llenar el Combobox
    if (request.accion === "datos_grupos") {
        const grupos = request.datos;
        const select = document.getElementById('listaGrupos');
        select.innerHTML = '<option value="">-- Selecciona un Grupo --</option>';
        grupos.forEach(g => {
            const option = document.createElement('option');
            option.value = g.id; 
            option.text = g.name; 
            select.appendChild(option);
        });
        status.innerText = `✅ ${grupos.length} grupos cargados.`;
        status.style.color = "green";
        document.getElementById('btnExtraer').style.display = 'block';
    }

    // DESCARGAR EXCEL (MODIFICADO)
    if (request.accion === "descargar_csv") {
        const datos = request.datos; // Array original {grupo, telefono}
        status.innerText = `✅ Generando Excel (${datos.length} filas)...`;
        
        generarExcel(datos);
    }
});

// --- FUNCIÓN MAESTRA PARA EXCEL ---
function generarExcel(datos) {
    try {
        // 1. Preparamos los datos para que tengan títulos de columna bonitos
        const datosFormateados = datos.map(item => ({
            "Nombre del Grupo": item.grupo,
            "Número de Teléfono": item.telefono
        }));

        // 2. Crear una Hoja de trabajo (Worksheet)
        const hoja = XLSX.utils.json_to_sheet(datosFormateados);

        // 3. Ajustar ancho de columnas automáticamente (Opcional, estética)
        const anchoMax = datosFormateados.reduce((w, r) => Math.max(w, r["Nombre del Grupo"].length), 10);
        hoja["!cols"] = [ { wch: anchoMax + 5 }, { wch: 20 } ];

        // 4. Crear un Libro de trabajo (Workbook)
        const libro = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(libro, hoja, "Participantes");

        // 5. Descargar el archivo .xlsx
        const fecha = new Date().toISOString().slice(0,10);
        XLSX.writeFile(libro, `Reporte_Grupo_${fecha}.xlsx`);

        document.getElementById('status').innerText = "✅ ¡Descarga completada!";

    } catch (error) {
        console.error("Error generando Excel:", error);
        document.getElementById('status').innerText = "❌ Error creando archivo Excel";
    }
}