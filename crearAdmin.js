const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");

const db = new sqlite3.Database("./database.db");

async function crearAdmin() {
    try {

        const password = "Admin123*"; // Cámbiala si quieres

        const hash = await bcrypt.hash(password, 10);

        db.run(
            `INSERT INTO administradores (nombre, email, password, rol)
             VALUES (?, ?, ?, ?)`,
            [
                "Administrador",
                "admin@tratojusto.com",
                hash,
                "superadmin"
            ],
            function(err) {

                if (err) {
                    console.error(err.message);
                } else {
                    console.log("✅ Administrador creado correctamente.");
                    console.log("Correo: admin@tratojusto.com");
                    console.log("Contraseña:", password);
                }

                db.close();

            }
        );

    } catch (error) {
        console.error(error);
        db.close();
    }
}

crearAdmin();