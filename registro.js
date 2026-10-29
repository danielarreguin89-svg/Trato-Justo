async function registrar() {

    const nombre = document.getElementById('nombre').value.trim();
    const email = document.getElementById('email').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const fechaNacimiento = document.getElementById('fechaNacimiento').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!nombre || !email || !telefono || !fechaNacimiento || !password || !confirmPassword) {
        alert('Completa todos los campos');
        return;
    }

    if (telefono.length !== 10) {
        alert('El teléfono debe tener 10 dígitos');
        return;
    }

    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);

    let edad = hoy.getFullYear() - nacimiento.getFullYear();

    const mes = hoy.getMonth() - nacimiento.getMonth();

    if (
        mes < 0 ||
        (mes === 0 && hoy.getDate() < nacimiento.getDate())
    ) {
        edad--;
    }

    if (edad < 18) {
        alert('Debes ser mayor de edad para utilizar Trato Justo');
        return;
    }

    if (password !== confirmPassword) {
        alert('Las contraseñas no coinciden');
        return;
    }

    const respuesta = await fetch('/registro', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            nombre,
            email,
            telefono: '+52' + telefono,
            fecha_nacimiento: fechaNacimiento,
            password
        })
    });

    const datos = await respuesta.json();

    if (respuesta.ok) {

    localStorage.setItem('email_verificacion', email);

    alert('Te enviamos un código de verificación a tu correo');

    window.location.href = '/verificar-codigo.html';

} else {

        alert(datos.error);

    }

}
document.addEventListener("click", function (event) {
    const boton = event.target.closest("[data-accion]");

    if (!boton) return;

    switch (boton.dataset.accion) {
        case "registrar":
            registrar();
            break;

        case "ir-login":
            window.location.href = "login.html";
            break;
    }
});