// Protección CSRF para solicitudes de la aplicación
(() => {
    const fetchOriginal = window.fetch.bind(window);
    const metodosSeguros = new Set(["GET", "HEAD", "OPTIONS"]);

    window.fetch = async (input, init = {}) => {
        const esRequest = input instanceof Request;

        const url = new URL(
            esRequest ? input.url : input.toString(),
            window.location.href
        );

        const metodo = (
            init.method || (esRequest ? input.method : "GET")
        ).toUpperCase();

        // No enviar el token a otros sitios ni en consultas de lectura
        if (
            url.origin !== window.location.origin ||
            metodosSeguros.has(metodo)
        ) {
            return fetchOriginal(input, init);
        }

        // Solicitar un token nuevo para la sesión actual
        const respuestaCsrf = await fetchOriginal("/csrf-token", {
            method: "GET",
            credentials: "same-origin"
        });

        if (!respuestaCsrf.ok) {
            throw new Error("No se pudo obtener el token CSRF.");
        }

        const datos = await respuestaCsrf.json();

        if (!datos.csrfToken) {
            throw new Error("El servidor no devolvió el token CSRF.");
        }

        const headers = new Headers(
            esRequest ? input.headers : undefined
        );

        new Headers(init.headers || {}).forEach((valor, nombre) => {
            headers.set(nombre, valor);
        });

        headers.set("x-csrf-token", datos.csrfToken);

        return fetchOriginal(input, {
            ...init,
            headers
        });
    };
})();