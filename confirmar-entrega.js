async function confirmar() {

    const codigo = document.getElementById('codigo').value;

    const respuesta = await fetch('/confirmar-entrega', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            codigo
        })
    });

    const datos = await respuesta.json();

    alert(datos.mensaje || datos.error);

}

document.addEventListener('click', function(evento) {

    const boton = evento.target.closest('button[data-accion]');

    if (!boton) {
        return;
    }

    if (boton.dataset.accion === 'confirmar-entrega') {
        confirmar();
    }

});