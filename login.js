document.getElementById("btnLogin").addEventListener("click", login);

async function login() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
        const respuesta = await fetch("/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                password
            })
        });

        const datos = await respuesta.json();

        if (respuesta.ok) {
            alert("Bienvenido a Trato Justo");
            window.location.href = "/dashboard.html";
        } else {
            alert(datos.error || "No fue posible iniciar sesión.");
        }
    } catch (error) {
        console.error("Error al iniciar sesión:", error);
        alert("No fue posible conectar con el servidor.");
    }
}