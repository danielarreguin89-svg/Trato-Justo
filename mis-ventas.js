let ventasTodas = [];
function copiarLink(codigo) {

    const link =
        window.location.origin +
        '/trato/' +
        codigo;

    navigator.clipboard.writeText(link);

    alert('Enlace copiado correctamente');

}
function cambiarFiltro(nuevoFiltro){

    document.querySelectorAll(".filtro-btn").forEach(boton => {

        boton.classList.remove("activo");

        if(boton.dataset.filtro === nuevoFiltro){

            boton.classList.add("activo");

        }

    });

    const ventasFiltradas = nuevoFiltro
        ? ventasTodas.filter(trato => trato.estado === nuevoFiltro)
        : ventasTodas;

    mostrarVentas(ventasFiltradas);

}
function compartirWhatsApp(codigo) {

    const link =
        window.location.origin +
        '/trato/' +
        codigo;

    const mensaje =
        `Hola, te comparto mi trato protegido de Trato Justo:%0A%0A${link}`;

    window.open(
        `https://wa.me/?text=${mensaje}`,
        '_blank'
    );

}
const parametros = new URLSearchParams(window.location.search);
const filtro = parametros.get('filtro');

document.querySelectorAll(".filtro-btn").forEach(boton => {

    if (boton.dataset.filtro === (filtro || "")) {

        boton.classList.add("activo");

    }

});
function mostrarVentas(ventas){

    const contenedor =
        document.getElementById('ventas');

    if(ventas.length === 0){

        contenedor.innerHTML = `
            <div class="vacio">
                <h3>No hay tratos en esta categoría</h3>
                <br>
                <p>
                    Prueba seleccionando otro filtro.
                </p>
            </div>
        `;

        return;

    }

    let html = '';

    ventas.forEach(trato => {

        let claseEstado = 'estado-creado';

        if(trato.estado === 'reservado'){

            claseEstado = 'estado-reservado';

        }

        if(trato.estado === 'completado'){

            claseEstado = 'estado-completado';

        }

        html += `

            <div class="card">

                <div class="venta-encabezado">

                    <div>

    <div class="venta-producto">
    ${escaparHTML(trato.producto)}
</div>

                    </div>

                    <div
                        class="estado ${claseEstado}"
                    >

                        ${
                            trato.estado=="creado"
                            ? "Creado"
                            : trato.estado=="reservado"
                            ? "Reservado"
                            : "Completado"
                        }

                    </div>

                </div>

                <div class="info">

                    <b>Código:</b>

                   <span class="codigo">
    ${escaparHTML(trato.codigo)}
</span>

                </div>

                <div class="venta-monto-contenedor">
    <div class="venta-monto-etiqueta">
    Monto protegido
</div>

    <div class="venta-monto-cantidad">
        $${Number(trato.monto_protegido).toLocaleString('es-MX')} MXN
    </div>

</div>

                <div class="info">

                    <b>Fecha:</b>

                    ${new Date(trato.fecha).toLocaleString("es-MX")}

                </div>

                <a
    class="link-btn"
    href="/trato/${encodeURIComponent(String(trato.codigo))}"
    target="_blank"
>
    Ver trato
</a>

                <button
    class="btn btn-secundario-trato"
    data-accion="copiar"
    data-codigo="${escaparHTML(trato.codigo)}"
>
    <span class="material-icons">
        content_copy
    </span>

    Copiar enlace
</button>

                <button
    class="btn btn-secundario-trato"
    data-accion="compartir"
    data-codigo="${escaparHTML(trato.codigo)}"
>
    <span class="material-icons">
        share
    </span>
    Compartir
</button>

            </div>

        `;

    });

    contenedor.innerHTML = html;

}
cargarVentas();
function escaparHTML(texto) {

    return String(texto)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}
async function cargarVentas(){

    try{

        const respuesta = await fetch(
    '/mis-ventas',
    {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store"
    }
);

        const datos = await respuesta.json();

        if(!respuesta.ok){

    document.getElementById('ventas').textContent =
        JSON.stringify(datos);

    return;

}

        ventasTodas = Array.isArray(datos)
    ? datos
    : [];

if(filtro){
    cambiarFiltro(filtro);
}else{
    cambiarFiltro('');
}

    } catch(error){

    document.getElementById('ventas').textContent =
        error.toString();

}

}

document.addEventListener('click', function(evento) {

    const boton = evento.target.closest('button[data-accion]');

    if (!boton) {
        return;
    }

    const accion = boton.dataset.accion;
    const codigo = boton.dataset.codigo;

    if (accion === 'copiar') {

        copiarLink(codigo);

    } else if (accion === 'compartir') {

        compartirWhatsApp(codigo);

    } else if (accion === 'filtrar') {

        cambiarFiltro(boton.dataset.filtro);

    } else if (accion === 'volver-dashboard') {

        window.location.href = 'dashboard.html';

    }

});