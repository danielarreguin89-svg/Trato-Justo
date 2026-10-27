let linkActual = '';

async function crearTrato() {

    const producto =
        document.getElementById('producto').value;

    const descripcion =
        document.getElementById('descripcion').value;

    const monto_protegido =
        document.getElementById('monto').value;

    const respuesta = await fetch(
        '/crear-trato',
        {
            method:'POST',
           headers:{
    'Content-Type':'application/json'
},
            body:JSON.stringify({
                producto,
                descripcion,
                monto_protegido
            })
        }
    );

    const datos = await respuesta.json();

    if(respuesta.ok){

        linkActual =
            `${window.location.origin}/trato/${datos.codigo}`;

        document.getElementById(
            'codigoGenerado'
        ).innerText = datos.codigo;

        document.getElementById(
            'linkGenerado'
        ).innerText = linkActual;

        document.getElementById(
            'modalExito'
        ).style.display = 'flex';

    }else{

        alert(datos.error);

    }

}

function copiarLink(){

    navigator.clipboard.writeText(linkActual);

    alert('Enlace copiado');

}
function compartirWhatsApp(){

    const mensaje =
        `Hola, te comparto mi trato protegido de Trato Justo:%0A%0A${linkActual}`;

    window.open(
        `https://wa.me/?text=${mensaje}`,
        '_blank'
    );

}
function actualizarMonto() {

    const monto =
        document.getElementById('monto').value;

    const vista =
        document.getElementById('vistaMonto');

    if (!monto) {

        vista.innerHTML = '';

        return;

    }

    vista.innerHTML =
        '$' +
        Number(monto).toLocaleString('es-MX') +
        ' MXN';

}
document.addEventListener('click', function(evento) {

    const elemento = evento.target.closest('[data-accion]');

    if (!elemento) {
        return;
    }

    const accion = elemento.dataset.accion;

    if (accion === 'crear-trato') {

        crearTrato();

    } else if (accion === 'volver-dashboard') {

        window.location.href = 'dashboard.html';

    } else if (accion === 'compartir-whatsapp') {

        compartirWhatsApp();

    } else if (accion === 'copiar-link') {

        copiarLink();

    }

});

document.addEventListener('input', function(evento) {

    if (evento.target.dataset.accion === 'actualizar-monto') {

        actualizarMonto();

    }

});