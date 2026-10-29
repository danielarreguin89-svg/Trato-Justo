const parametros = new URLSearchParams(window.location.search);

const token = parametros.get("token");

async function guardarPassword(){

    const password =
        document.getElementById("password").value.trim();

    const confirmar =
        document.getElementById("confirmar").value.trim();

    if(password==="" || confirmar===""){

        alert("Completa todos los campos.");

        return;

    }

    if(password!==confirmar){

        alert("Las contraseñas no coinciden.");

        return;

    }

    try{

        const respuesta = await fetch("/restablecer-password",{

            method:"POST",

            headers:{

                "Content-Type":"application/json"

            },

            body:JSON.stringify({

                token,

                password

            })

        });

        const datos = await respuesta.json();

        alert(datos.mensaje || datos.error);

        if(respuesta.ok){

            window.location.href="login.html";

        }

    }

    catch(error){

        console.error(error);

        alert("No fue posible conectar con el servidor.");

    }

}
document.addEventListener("click", function (event) {
    const boton = event.target.closest(
        '[data-accion="guardar-password"]'
    );

    if (!boton) return;

    guardarPassword();
});