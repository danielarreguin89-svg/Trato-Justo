/* =========================
   FORMATO DE DINERO
========================= */

function formatearDinero(valor){

    const numero = Number(valor);

    if (!Number.isFinite(numero)) {

        return "$0.00";

    }

    return numero.toLocaleString(
        "es-MX",
        {
            style:"currency",
            currency:"MXN",
            minimumFractionDigits:2,
            maximumFractionDigits:2
        }
    );

}
function formatearDineroCorto(valor){

    const numero = Number(valor);

    if (!Number.isFinite(numero)) {
        return "$0";
    }

    if (numero >= 1000000) {
        return "$" + (numero / 1000000).toFixed(2) + " M";
    }

    if (numero >= 1000) {
        return "$" + (numero / 1000).toFixed(1) + " mil";
    }

    return "$" + numero.toFixed(2);
}

/* =========================
   CARGAR USUARIO
========================= */

async function cargarUsuario(){

    try{

        const respuesta = await fetch('/perfil');

       if(!respuesta.ok){

    window.location.href = '/login.html';

    return;

}

        const usuario = await respuesta.json();
        console.log("DATOS QUE RECIBE EL DASHBOARD:", usuario);

        document.getElementById(
            'nombreUsuario'
        ).innerText = usuario.nombre || 'Usuario';


        const estadisticas =
            usuario.estadisticas || {};
window.estadisticasDashboard = estadisticas;

        document.getElementById(
            "tCreados"
        ).innerText =
            Number(estadisticas.creados) || 0;


        document.getElementById(
            "tReservados"
        ).innerText =
            Number(estadisticas.reservados) || 0;


        document.getElementById(
            "tCompletados"
        ).innerText =
            Number(estadisticas.completados) || 0;


        document.getElementById(
    "tProtegido"
).innerText =
    formatearDineroCorto(
        estadisticas.dineroprotegido
    );


       document.getElementById(
    "tRecibido"
).innerText =
    formatearDineroCorto(
        estadisticas.dinerorecibido
    );


    }catch(error){

        console.error(
            "Error cargando usuario:",
            error
        );

    }

}


/* =========================
   CARGAR NOTIFICACIONES
========================= */

async function cargarNotificaciones(){

    try{

        const respuesta = await fetch("/notificaciones");

        if(!respuesta.ok){

            return;

        }

        const notificaciones =
            await respuesta.json();


        window.listaNotificaciones =
            Array.isArray(notificaciones)
                ? notificaciones
                : [];


        const contador =
            document.getElementById(
                "contadorNotificaciones"
            );


        const noLeidas =
            window.listaNotificaciones.filter(
                n => Number(n.leida) === 0
            );


        if(noLeidas.length > 0){

            contador.style.display =
                "flex";

            contador.innerText =
                noLeidas.length > 99
                    ? "99+"
                    : noLeidas.length;

        }else{

            contador.style.display =
                "none";

        }


    }catch(error){

        console.error(
            "Error cargando notificaciones:",
            error
        );

    }

}


/* =========================
   MOSTRAR NOTIFICACIONES
========================= */

function verNotificaciones(){

    const panel =
        document.getElementById(
            "panelNotificaciones"
        );


    if(panel.style.display === "block"){

        panel.style.display =
            "none";

        return;

    }


    panel.style.display =
        "block";


    const lista =
        window.listaNotificaciones || [];


    if(lista.length === 0){

        document.getElementById(
            "listaNotificaciones"
        ).innerHTML = `

            <div
                style="
                    padding:30px;
                    text-align:center;
                    color:#7B8291;
                    font-size:14px;
                "
            >

                No tienes notificaciones nuevas.

            </div>

        `;

    }else{

        let html = "";


        lista.forEach(n => {

            html += `

                <div class="notification-item">

                    <div class="notification-title">

                        <span class="material-icons">
                            notifications
                        </span>

                        ${escaparHTML(n.titulo)}

                    </div>

                    <div class="notification-message">

                        ${escaparHTML(n.mensaje)}

                    </div>

                    <div class="notification-date">

                        ${escaparHTML(n.fecha)}

                    </div>

                </div>

            `;

        });


        document.getElementById(
            "listaNotificaciones"
        ).innerHTML = html;

    }


    fetch(
    "/notificaciones/leidas",
    {
        method:"PATCH"
    }
);


    document.getElementById(
        "contadorNotificaciones"
    ).style.display = "none";


    window.listaNotificaciones.forEach(
        n => n.leida = 1
    );

}


/* =========================
   PROTECCIÓN DE TEXTO
========================= */

function escaparHTML(texto){

    return String(texto ?? "")
        .replaceAll("&","&amp;")
        .replaceAll("<","&lt;")
        .replaceAll(">","&gt;")
        .replaceAll('"',"&quot;")
        .replaceAll("'","&#039;");

}


/* =========================
   INICIO
========================= */

cargarUsuario();

cargarNotificaciones();
function irAMisVentas(filtro){

    window.location.href =
        "mis-ventas.html?filtro=" + encodeURIComponent(filtro);

}
function mostrarDetalleDinero(tipo){

    const panel = document.getElementById("panelDetalleDinero");

    const titulo = document.getElementById("modalDineroTitulo");
    const monto = document.getElementById("modalDineroMonto");
    const detalle = document.getElementById("modalDineroDetalle");
    const descripcion = document.getElementById("modalDineroDescripcion");
    const icono = document.getElementById("modalDineroIcono");

    const estadisticas =
        window.estadisticasDashboard || {};

    if(tipo === "protegido"){

        titulo.innerText = "Dinero protegido";

        monto.innerText =
            formatearDinero(
                estadisticas.dineroprotegido
            );

        detalle.innerText =
            `${Number(estadisticas.reservados) || 0} tratos reservados`;

        descripcion.innerText =
            "Dinero asociado a operaciones que permanecen protegidas mientras el trato está reservado.";

        icono.innerText = "account_balance_wallet";

    }

    if(tipo === "recibido"){

        titulo.innerText = "Dinero recibido";

        monto.innerText =
            formatearDinero(
                estadisticas.dinerorecibido
            );

        detalle.innerText =
            `${Number(estadisticas.completados) || 0} tratos completados`;

        descripcion.innerText =
            "Total correspondiente a operaciones que ya fueron completadas y cuyo pago fue liberado.";

        icono.innerText = "payments";

    }

    panel.style.display = "flex";
}


function cerrarDetalleDinero(){

    document.getElementById(
        "panelDetalleDinero"
    ).style.display = "none";

}


/* =========================
   CERRAR NOTIFICACIONES
========================= */

document.addEventListener(
    "click",
    function(event){

        const panel =
            document.getElementById(
                "panelNotificaciones"
            );

        const boton =
            document.querySelector(
                ".notification-wrapper"
            );


        if(
            panel.style.display === "block" &&
            !panel.contains(event.target) &&
            !boton.contains(event.target)
        ){

            panel.style.display =
                "none";

        }

    }
);
document.addEventListener(
    "click",
    function(event){

        const panel =
            document.getElementById(
                "panelDetalleDinero"
            );

        if(
            panel.style.display === "flex" &&
            event.target === panel
        ){

            cerrarDetalleDinero();

        }

    }
);
document.addEventListener("click", function(event) {
    const elemento = event.target.closest(
        "[data-action], [data-href], [data-filtro-ventas], [data-detalle-dinero]"
    );

    if (!elemento) return;

    if (elemento.dataset.action === "ver-notificaciones") {
        verNotificaciones();
    } else if (elemento.dataset.action === "cerrar-detalle-dinero") {
        cerrarDetalleDinero();
    } else if (elemento.dataset.href) {
        window.location.href = elemento.dataset.href;
    } else if (elemento.dataset.filtroVentas) {
        irAMisVentas(elemento.dataset.filtroVentas);
    } else if (elemento.dataset.detalleDinero) {
        mostrarDetalleDinero(elemento.dataset.detalleDinero);
    }
});