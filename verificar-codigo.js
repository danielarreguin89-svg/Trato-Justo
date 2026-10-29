async function verificarCodigo() {

    const codigo = document.getElementById('codigo').value.trim();

    const email = localStorage.getItem('email_verificacion');

    if (!codigo) {

        alert('Ingresa el código');

        return;

    }

    const respuesta = await fetch('/verificar-codigo', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email,
            codigo
        })
    });

    const datos = await respuesta.json();

    if (respuesta.ok) {

        alert('Cuenta verificada correctamente');

        localStorage.removeItem('email_verificacion');

        window.location.href = '/login.html';

    } else {

        alert(datos.error);

    }

}
async function reenviarCodigo() {

    const email = localStorage.getItem('email_verificacion');

    if (!email) {
        alert('No se encontró el correo de verificación.');
        return;
    }

    const respuesta = await fetch('/enviar-codigo', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email
        })
    });

    const datos = await respuesta.json();

    alert(datos.mensaje || datos.error);

}
document.addEventListener("click", function (event) {
    const boton = event.target.closest("[data-accion]");

    if (!boton) return;

    switch (boton.dataset.accion) {
        case "verificar-codigo":
            verificarCodigo();
            break;

        case "reenviar-codigo":
            reenviarCodigo();
            break;
    }
});