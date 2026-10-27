cargarCompras();
function escaparHTML(texto) {

    return String(texto)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}
async function cargarCompras() {

    try {

        const respuesta = await fetch(
    '/mis-compras'
);

        const compras = await respuesta.json();

        const contenedor =
            document.getElementById('compras');

        if (!respuesta.ok) {

            contenedor.innerHTML =
                JSON.stringify(compras);

            return;

        }

        if (compras.length === 0) {

            contenedor.innerHTML = `
                <div class="vacio">
                    <h3>No tienes compras registradas</h3>
                    <br>
                    <p>
                        Los tratos que reserves aparecerán aquí.
                    </p>
                </div>
            `;

            return;

        }

        let html = '';

        compras.forEach(trato => {

            let claseEstado = 'estado-creado';

            if (trato.estado === 'reservado') {

                claseEstado = 'estado-reservado';

            }

            if (trato.estado === 'completado') {

                claseEstado = 'estado-completado';

            }

            html += `

                <div class="card">

                    <h3>${escaparHTML(trato.producto)}</h3>

                    <div class="info">
                        <b>Código:</b>
                        <span class="codigo">
    ${escaparHTML(trato.codigo)}
</span>
                    </div>

                    <div class="info">
                        <b>Monto protegido:</b>
                        $${Number(
                            trato.monto_protegido
                        ).toLocaleString('es-MX')} MXN
                    </div>

                    <div class="info">
                        <b>Estado:</b>
                    </div>
<div class="estado ${claseEstado}">

    ${
        trato.estado === 'creado'
            ? 'Creado'
            : trato.estado === 'reservado'
            ? 'Reservado'
            : trato.estado === 'completado'
            ? 'Completado'
            : 'Desconocido'
    }

</div>

                    <a
                        class="link-btn"
                        href="/trato/${encodeURIComponent(String(trato.codigo))}"
                        target="_blank">
                        Ver trato
                    </a>

                </div>

            `;

        });

        contenedor.innerHTML = html;

    } catch (error) {

        document.getElementById('compras').innerHTML =
            error.toString();

    }

}
document.addEventListener('click', function(evento) {

    const boton = evento.target.closest('button[data-accion]');

    if (!boton) {
        return;
    }

    if (boton.dataset.accion === 'volver-dashboard') {
        window.location.href = 'dashboard.html';
    }

});