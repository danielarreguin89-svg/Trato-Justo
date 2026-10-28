let datosOriginales = {};

const nombre = document.getElementById("nombre");
const email = document.getElementById("email");
const telefono = document.getElementById("telefono");
const fechaNacimiento = document.getElementById("fechaNacimiento");

const btnEditar = document.getElementById("btnEditar");
const btnCancelar = document.getElementById("btnCancelar");
const btnGuardar = document.getElementById("btnGuardar");

const mensaje = document.getElementById("mensaje");

async function cargarPerfil(){

    const respuesta = await fetch("/perfil");

    const datos = await respuesta.json();

    if(!respuesta.ok){

        alert(datos.error);
        return;

    }

    nombre.value = datos.nombre || "";
    email.value = datos.email || "";
    telefono.value = datos.telefono || "";
    fechaNacimiento.value = datos.fecha_nacimiento || "";

    datosOriginales = {

        nombre:nombre.value,
        telefono:telefono.value,
        fechaNacimiento:fechaNacimiento.value

    };

}

cargarPerfil();

function activarEdicion(){

    nombre.disabled = false;
    telefono.disabled = false;
    fechaNacimiento.disabled = false;

    btnEditar.style.display = "none";
    btnCancelar.style.display = "block";

}

function cancelarEdicion(){

    nombre.value = datosOriginales.nombre;
    telefono.value = datosOriginales.telefono;
    fechaNacimiento.value = datosOriginales.fechaNacimiento;

    nombre.disabled = true;
    telefono.disabled = true;
    fechaNacimiento.disabled = true;

    btnGuardar.disabled = true;

    btnEditar.style.display = "block";
    btnCancelar.style.display = "none";

    mensaje.style.display = "none";

}

function revisarCambios(){

    const cambio =

        nombre.value !== datosOriginales.nombre ||

        telefono.value !== datosOriginales.telefono ||

        fechaNacimiento.value !== datosOriginales.fechaNacimiento;

    btnGuardar.disabled = !cambio;

}

btnEditar.addEventListener("click", activarEdicion);

btnCancelar.addEventListener("click", cancelarEdicion);

nombre.addEventListener("input", revisarCambios);

telefono.addEventListener("input", revisarCambios);

fechaNacimiento.addEventListener("input", revisarCambios);

btnGuardar.addEventListener("click", async ()=>{

    const respuesta = await fetch("/perfil",{

        method:"PUT",

        headers:{
    "Content-Type":"application/json"
},

        body:JSON.stringify({

            nombre:nombre.value,
            telefono:telefono.value,
            fecha_nacimiento:fechaNacimiento.value

        })

    });

    const datos = await respuesta.json();

    if(!respuesta.ok){

        alert(datos.error);
        return;

    }

    if(!respuesta.ok){

        alert(datos.error);
        return;

    }

    datosOriginales = {

        nombre:nombre.value,
        telefono:telefono.value,
        fechaNacimiento:fechaNacimiento.value

    };

    nombre.disabled = true;
    telefono.disabled = true;
    fechaNacimiento.disabled = true;

    btnGuardar.disabled = true;

    btnCancelar.style.display = "none";
    btnEditar.style.display = "block";

    mensaje.innerText = datos.mensaje;
    mensaje.style.display = "block";

    setTimeout(()=>{

        mensaje.style.display="none";

    },3000);

});
document.addEventListener("click", function (event) {
    const boton = event.target.closest(
        '[data-accion="ir-dashboard"]'
    );

    if (!boton) return;

    window.location.href = "dashboard.html";
});