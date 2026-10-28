function lanzarConfeti(){

    confetti({

        particleCount:180,

        spread:90,

        origin:{ y:0.6 }

    });

    setTimeout(()=>{

        const duracion=2500;

        const fin=Date.now()+duracion;

        (function frame(){

            confetti({

                particleCount:3,

                angle:60,

                spread:60,

                origin:{x:0},

                startVelocity:30

            });

            confetti({

                particleCount:3,

                angle:120,

                spread:60,

                origin:{x:1},

                startVelocity:30

            });

            if(Date.now()<fin){

                requestAnimationFrame(frame);

            }

        })();

    },250);

}

window.addEventListener("load", () => {

    if (navigator.vibrate) {
        navigator.vibrate([120, 50, 120]);
    }

    setTimeout(lanzarConfeti, 1400);

});
document.addEventListener("click", function (event) {
    const boton = event.target.closest("[data-accion]");

    if (!boton) return;

    switch (boton.dataset.accion) {
        case "ir-mis-compras":
            window.location.href = "mis-compras.html";
            break;

        case "ir-dashboard":
            window.location.href = "dashboard.html";
            break;
    }
});