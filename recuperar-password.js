async function recuperarPassword(){

    const email = document.getElementById("correo").value.trim();

    if(email===""){

        alert("Ingresa tu correo electrónico.");

        return;

    }

    try{

        const respuesta = await fetch("/recuperar-password",{

            method:"POST",

            headers:{
                "Content-Type":"application/json"
            },

            body:JSON.stringify({
                email
            })

        });

        const datos = await respuesta.json();

        alert(datos.mensaje || datos.error);

        if(respuesta.ok){

            document.getElementById("correo").value="";

        }

    }

    catch(error){

        console.error(error);

        alert("No fue posible conectar con el servidor.");

    }

}
document.addEventListener("click", function (event) {
    const boton = event.target.closest(
        '[data-accion="recuperar-password"]'
    );

    if (!boton) return;

    recuperarPassword();
});