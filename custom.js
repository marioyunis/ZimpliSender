// Selecciona el elemento a observar
const targetNode = document.querySelector("body > div");

// Configura las opciones del observador
const config = { childList: true, subtree: true };

// Callback que se ejecuta cuando se detectan mutaciones
const callback = function(mutationsList, observer) {
    for (let mutation of mutationsList) {
        if (mutation.type === 'childList') {
            const targetElement = document.querySelector(".nav-links.opensans-regular");

            if (targetElement && !targetElement.querySelector(".noticia-link")) {
                console.log("Hola Mundo, Elemento:", targetElement);

                // Crear el enlace
                const link = document.createElement("a");
                link.href = "#";
                link.className = "opensans-regular noticia-link";
                link.textContent = "Noticias";

                // Insertar el enlace antes del primer hijo de targetElement
                targetElement.insertBefore(link, targetElement.firstChild);

                // Evento de clic para abrir la ventana flotante
                link.addEventListener("click", function(event) {
                    event.preventDefault();
                    openFloatingWindow();
                });

                // **Esperar a que `localStorage` tenga el valor correcto**
                const checkLocalStorage = setInterval(() => {
                    let noticia = localStorage.getItem('noticia');
                    console.log("Noticia:", noticia);
                    if (noticia === "1") {
                        link.textContent = localStorage.getItem('titulo') ;
                        link.classList.add('blink');
                        clearInterval(checkLocalStorage);
                    }
                }, 2000); // Verifica cada 500ms

                // Dejar de observar para evitar ejecuciones innecesarias
                observer.disconnect();
                break;
            }
        }
    }
};

// Función para abrir una ventana flotante
async function openFloatingWindow() {
    
    const noticias = await getNews();
    console.log(noticias);

    const width = 700;
    const height = 500;
    const left = (screen.width / 2) - (width / 2);
    const top = (screen.height / 2) - (height / 2);
    const newWindow = window.open("", "Noticias", `width=${width},height=${height},top=${top},left=${left}`);
    if (newWindow) {
        newWindow.document.write(noticias.html);
    } else {
        console.error("No se pudo abrir la ventana flotante.");
    }
}

// Crea una instancia de MutationObserver con el callback
const observer = new MutationObserver(callback);

// Comienza a observar el nodo objetivo con las opciones configuradas
observer.observe(targetNode, config);


// Funcion para obtener datos de un API
async function getNews() {
    try {
        const response = await fetch("https://sistemasapiape.apecorp.online/noticias/wm");
        if (!response.ok) {
            throw new Error("No se pudo obtener los datos");
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(error);
    }
}

// Recuperar datos de localStorage

( async () => {
    let data = await getNews();
    localStorage.setItem('noticia', JSON.stringify(data.alerta));
    localStorage.setItem('titulo', JSON.stringify(data.titulo));
}
)();
