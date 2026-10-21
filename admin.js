// =========================
// FUNCIONES GENERALES PANEL
// =========================

function verificarSesion(respuesta){

    if(respuesta.status === 401){

    alert("Tu sesión ha expirado.");

    window.location.href = "admin-login.html";

    return false;

}

    return true;

}

async function cerrarSesion(){

    await fetch("/admin/logout",{
        method:"POST"
    });

    window.location.href = "admin-login.html";

}