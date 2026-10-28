async function cerrarSesion(){

    await fetch("/logout", {
        method: "POST"
    });

    window.location.href = "login.html";

}

// Ya no necesitamos leer el token.
// La cookie se enviará automáticamente.

const btnStripe = document.getElementById("btnStripe");

const estadoStripe = document.getElementById("estadoStripe");
async function cargarEstadoStripe(){

    try{

        const respuesta = await fetch("/stripe/status");

        const datos = await respuesta.json();

        if(datos.configurada){

            estadoStripe.textContent="● Lista para recibir pagos";
            estadoStripe.className="estado-conectada";

            btnStripe.style.pointerEvents="none";
            btnStripe.style.opacity="0.7";
            btnStripe.style.cursor="default";

        }else if(datos.tieneCuenta){

            estadoStripe.textContent="● Configuración pendiente";
            estadoStripe.className="estado-no-conectada";

        }else{

            estadoStripe.textContent="● No configurada";
            estadoStripe.className="estado-no-conectada";

        }

    }catch(error){

        console.log(error);

    }

}

btnStripe.addEventListener("click", async () => {
    if(estadoStripe.textContent.includes("Lista para recibir pagos")){

    alert("Tu cuenta ya está configurada correctamente.");

    return;

}

    btnStripe.style.pointerEvents = "none";

    estadoStripe.textContent = "● Abriendo Stripe...";

    try{

        const respuesta = await fetch("/stripe/onboarding",{

    method:"POST"

});

        const datos = await respuesta.json();

        if(!respuesta.ok){

            throw new Error(datos.error);

        }

        window.location.href = datos.url;

    }catch(error){

        console.log(error);

        estadoStripe.textContent = "● Error";

        estadoStripe.className = "estado-no-conectada";

        alert(error.message);

        btnStripe.style.pointerEvents = "auto";

    }

});
cargarEstadoStripe();
document.addEventListener("click", function (event) {
    const boton = event.target.closest("[data-accion]");

    if (!boton) return;

    switch (boton.dataset.accion) {
        case "ir-perfil":
            window.location.href = "perfil.html";
            break;

        case "ir-dashboard":
            window.location.href = "dashboard.html";
            break;

        case "cerrar-sesion":
            cerrarSesion();
            break;
    }
});