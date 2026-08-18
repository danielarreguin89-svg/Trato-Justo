// =========================
// FUNCIONES GENERALES PANEL
// =========================

function verificarSesion(respuesta){

    if(respuesta.status === 401){

        localStorage.removeItem("tokenAdmin");

        alert("Tu sesión ha expirado.");

        window.location.href = "admin-login.html";

        return false;

    }

    return true;

}

function cerrarSesion(){

    localStorage.removeItem("tokenAdmin");

    window.location.href = "admin-login.html";

}