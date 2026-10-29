const codigo =
    window.location.pathname.split('/').pop();

let estrellasSeleccionadas = 0;

function seleccionarEstrella(cantidad) {

    estrellasSeleccionadas = cantidad;

    const estrellas =
        document.querySelectorAll('.estrella');

    estrellas.forEach((estrella, index) => {

        estrella.textContent =
    index < cantidad ? '★' : '☆';

estrella.classList.toggle(
    'seleccionada',
    index < cantidad
);

    });

}

function enviarCalificacion() {

    if (estrellasSeleccionadas === 0) {

        alert(
            'Selecciona una calificación'
        );

        return;

    }

    calificar(estrellasSeleccionadas);

}
async function reservarTrato() {
    try {
        const respuesta = await fetch(
            `/reservar/${encodeURIComponent(codigo)}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({})
            }
        );

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(
                datos.error ||
                datos.mensaje ||
                "No fue posible reservar el trato."
            );
        }

        alert(
            datos.mensaje ||
            "Trato reservado en modo de demostración. No se realizó ningún pago."
        );

        window.location.reload();

    } catch (error) {
        alert(
            error.message ||
            "No fue posible reservar el trato."
        );
    }
}
async function calificar(estrellas) {

    const respuesta =
        await fetch(
            `/calificar/${codigo}`,
            {
                method:'POST',
                headers:{
    'Content-Type':'application/json'
},
                body:JSON.stringify({
                    estrellas
                })
            }
        );

    const datos =
        await respuesta.json();

    alert(
        datos.mensaje ||
        datos.error
    );

    location.reload();

}
function escaparHTML(texto) {

    return String(texto)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}
async function cargarTrato() {

    const respuesta =
        await fetch(
            `/api/trato/${codigo}`, 
        );

    const trato =
        await respuesta.json();

   let claseEstado = 'estado-creado';

if (trato.estado === 'reservado') {
    claseEstado = 'estado-reservado';
}

if (trato.estado === 'completado') {
    claseEstado = 'estado-completado';
}
document.getElementById(
    'contenido'
).innerHTML = `

    <div class="card">

        <h2 class="producto">
            ${escaparHTML(trato.producto)}
        </h2>

        <div class="monto">
            $${Number(
                trato.monto_protegido
            ).toLocaleString('es-MX')}
        </div>

        <div class="espacio-monto"></div>

        <div class="info">
            <b>Vendedor:</b>
            ${escaparHTML(trato.vendedor_nombre || 'No disponible')}
        </div>

        <div class="info rating">
    <span class="material-icons">star</span>
    <strong>${Math.min(5, Math.max(0, Number(trato.comprador_rating) || 0))}</strong>
    <span>(${Math.max(0, Math.floor(Number(trato.comprador_total_calificaciones) || 0))} calificaciones)</span>
</div>

      ${trato.esVendedor && trato.comprador_nombre ? `

<div class="info">
    <b>Comprador:</b>
    ${escaparHTML(trato.comprador_nombre)}
</div>

<div class="info rating">
    <span class="material-icons">star</span>
    <strong>${Math.min(5, Math.max(0, Number(trato.vendedor_rating) || 0))}</strong>
    <span>(${Math.max(0, Math.floor(Number(trato.vendedor_total_calificaciones) || 0))} calificaciones)</span>
</div>

` : ''}

        <div class="info">
            <b>Descripción:</b>
            ${escaparHTML(trato.descripcion)}
        </div>

        <div class="info estado-row">

    <b>Estado</b>

    <span class="estado ${claseEstado}">
        ${
            trato.estado === 'creado'
                ? 'Creado'
                : trato.estado === 'reservado'
                ? 'Reservado'
                : 'Completado'
        }
    </span>

</div>

        <div class="info">
            <b>Código:</b>
            <span class="codigo">
                ${escaparHTML(trato.codigo)}
            </span>
        </div>

        <div class="separador-trato"></div>

        ${trato.esVendedor ? `

<div class="resumen-financiero">

    <div class="resumen-item">
        <span>Comisión Trato Justo</span>
        <strong>
            $${Number(
                trato.comision || 0
            ).toLocaleString('es-MX')}
        </strong>
    </div>

    <div class="resumen-item">
        <span>Monto neto vendedor</span>
        <strong>
            $${Number(
                trato.monto_vendedor || 0
            ).toLocaleString('es-MX')}
        </strong>
    </div>

</div>

` : ''}

        ${trato.estado === 'creado' ? `

<div class="card">

    <h2 class="section-title">
    <span class="material-icons">inventory_2</span>
    Trato disponible
</h2>

    <br>

    <p>
        Este trato aún no ha sido reservado.
    </p>

    <br>

    ${trato.esVendedor ? `

<button
    class="btn btn-primary"
    data-accion="volver-dashboard">

     Volver al inicio

</button>

` : `

<button
    class="btn btn-primary"
    data-accion="reservar-trato">

    <span class="material-icons">lock</span>
    Reservar trato

</button>

`}

</div>

` : ''}
${trato.estado === 'reservado' ? `

<div class="card">

    <h2 class="section-title">
    <span class="material-icons">handshake</span>
    Trato reservado
</h2>

    <br>

    ${trato.esVendedor ? `

        <p>
            Espera a que el comprador reciba el producto y te proporcione el código de liberación.
        </p>

        <div class="campo-codigo">

    <label for="codigoLiberacion">
        Código de liberación
    </label>

    <input
        id="codigoLiberacion"
        class="input"
        type="text"
        placeholder="Ingresa el código">

    <span class="ayuda-codigo">
        Escribe el código que te proporcionó el comprador.
    </span>

</div>

        <button
    class="btn btn-success"
    data-accion="liberar-pago">

    <span class="material-icons">lock_open</span>
    Liberar pago

</button>
        <button
    class="btn btn-secondary"
    data-accion="volver-dashboard">

    <span class="material-icons">arrow_back</span>
    Volver al Inicio

</button>

    ` : `

        <div class="seguridad">

    <span class="material-icons seguridad-icon">
        warning
    </span>

    <div>
        <b>Importante</b>

        <p>
            No compartas este código hasta que tengas el producto
            en tus manos y estés conforme con la compra.
        </p>
    </div>

</div>

        <div class="codigo-box">

            <p>Tu código de liberación es:</p>

            <h2>${escaparHTML(trato.codigo_liberacion)}</h2>

        </div>
        <button
    class="btn btn-secondary"
    data-accion="volver-dashboard">

    <span class="material-icons">arrow_back</span>
    Volver al Inicio

</button>

    `}

</div>

` : ''}
${trato.estado === 'completado' ? `

<div class="card">

    <h2 class="section-title">
    <span class="material-icons">check_circle</span>
    Trato completado
</h2>

    <br>

    <p>
        El pago fue liberado exitosamente al vendedor.
    </p>

    <br>

    ${trato.yaCalifico ? `

        <div class="calificacion-completada">

    <span class="material-icons">
        check_circle
    </span>

    <span>
        Ya calificaste este trato
    </span>

</div>

        <br>

        <button
    class="btn btn-secondary"
    data-accion="volver-dashboard">

    <span class="material-icons">arrow_back</span>
    Volver al Inicio

</button>

    ` : `

        <h3 class="section-title">
    <span class="material-icons">star_rate</span>
    Califica tu experiencia
</h3>

        <br>

        <div class="rating-selection">

    <span class="estrella" data-accion="seleccionar-estrella" data-calificacion="1">☆</span>
    <span class="estrella" data-accion="seleccionar-estrella" data-calificacion="2">☆</span>
    <span class="estrella" data-accion="seleccionar-estrella" data-calificacion="3">☆</span>
    <span class="estrella" data-accion="seleccionar-estrella" data-calificacion="4">☆</span>
    <span class="estrella" data-accion="seleccionar-estrella" data-calificacion="5">☆</span>

</div>

        <br>

        <button
            class="btn btn-success"
            data-accion="enviar-calificacion">

            Enviar calificación

        </button>
        <button
    class="btn btn-secondary"
    data-accion="volver-dashboard">

    <span class="material-icons">arrow_back</span>
    Volver al Inicio

</button>

    `}

</div>

` : ''}
    </div>

`;

}
async function liberarPago() {

    const codigo_liberacion =
        document.getElementById("codigoLiberacion").value.trim();

    if (!codigo_liberacion) {

        alert("Ingresa el código de liberación");

        return;

    }

    try {

        const respuesta = await fetch(

            `/confirmar-entrega/${codigo}`,

            {

                method: "POST",

                headers: {
    "Content-Type": "application/json"
},

                body: JSON.stringify({

                    codigo_liberacion

                })

            }

        );

        const datos = await respuesta.json();

        alert(datos.mensaje || datos.error);

        if (respuesta.ok) {

            cargarTrato();

        }

    } catch (error) {

        console.log(error);

        alert("Error al liberar el pago");

    }

}
cargarTrato();
// Manejar los botones sin atributos onclick
document.addEventListener("click", function (event) {
    const boton = event.target.closest("[data-accion]");

    if (!boton) return;

    switch (boton.dataset.accion) {
        case "volver-dashboard":
            window.location.href = "/dashboard.html";
            break;

        case "reservar-trato":
            reservarTrato();
            break;

        case "liberar-pago":
            liberarPago();
            break;

        case "seleccionar-estrella":
            seleccionarEstrella(Number(boton.dataset.calificacion));
            break;

        case "enviar-calificacion":
            enviarCalificacion();
            break;
    }
});