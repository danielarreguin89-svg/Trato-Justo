require('dotenv').config();

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require("crypto");
const db = require('./database');
const { Resend } = require('resend');
const Stripe = require('stripe');

const JWT_SECRET = process.env.JWT_SECRET;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);
function generarCodigoVerificacion() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
function reservarTratoSistema(codigo, compradorId) {

  return new Promise((resolve, reject) => {

    db.get(
      `
      SELECT *
      FROM tratos
      WHERE codigo = ?
      `,
      [codigo],
      (err, trato) => {

        if (err || !trato) {
          return reject(new Error('Trato no encontrado'));
        }

        if (trato.estado !== 'creado') {
          return reject(new Error('Este trato ya fue reservado'));
        }

        const comision =
          Number((trato.monto_protegido * 0.10).toFixed(2));

        const montoVendedor =
          Number((trato.monto_protegido - comision).toFixed(2));

        const codigoLiberacion =
          generarCodigoLiberacion();

        db.run(
          `
          UPDATE tratos
          SET
            comprador_id = ?,
            estado = 'reservado',
            comision = ?,
            monto_vendedor = ?,
            codigo_liberacion = ?
          WHERE codigo = ?
          `,
          [
            compradorId,
            comision,
            montoVendedor,
            codigoLiberacion,
            codigo
          ],
          function(error) {

            if (error) {
              return reject(error);
            }

            resolve();

          }

        );

      }

    );

  });

}
function crearNotificacion(usuarioId, titulo, mensaje){

    db.run(

        `
        INSERT INTO notificaciones
        (
            usuario_id,
            titulo,
            mensaje
        )
        VALUES
        (?, ?, ?)
        `,

        [
            usuarioId,
            titulo,
            mensaje
        ]

    );

}
const app = express();
const PORT = 3000;
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

app.use(express.static('.'));
app.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => { 

    const firma = req.headers['stripe-signature'];

    let evento;

    try {

      evento = stripe.webhooks.constructEvent(
        req.body,
        firma,
        endpointSecret
      );

    } catch (err) {

      console.log('❌ Error verificando webhook:', err.message);

      return res.sendStatus(400);

    }

    console.log('✅ Webhook recibido:', evento.type);

if (evento.type === 'checkout.session.completed') {

    const session = evento.data.object;

    console.log('🎉 Pago completado');

    try {

        await reservarTratoSistema(
            session.metadata.trato_codigo,
            Number(session.metadata.comprador_id)
        );

        await new Promise((resolve, reject) => {

             db.run(
                `
                UPDATE tratos
                SET stripe_payment_intent = ?
                WHERE codigo = ?
                `,
                [
                    session.payment_intent,
                    session.metadata.trato_codigo
                ],
                function(err){

                    if(err){
                        reject(err);
                    }else{
                        resolve();
                    }

                }
            );

        });
db.get(

    `
    SELECT vendedor_id
    FROM tratos
    WHERE codigo = ?
    `,

    [session.metadata.trato_codigo],

    (err, trato)=>{

        if(trato){

            crearNotificacion(

                trato.vendedor_id,

                "Trato reservado",

                `Tu trato ${session.metadata.trato_codigo} ha sido reservado. Ya puedes preparar la entrega del producto.`

            );
            crearNotificacion(

    trato.vendedor_id,

    "Pago recibido",

    `El comprador realizó el pago de $${Number(session.metadata.monto).toLocaleString("es-MX")} MXN. El dinero ya está protegido por Trato Justo.`

);

        }

    }

);

        console.log('✅ PaymentIntent guardado');

        console.log('✅ Trato reservado automáticamente');

    } catch (error) {

        console.log('❌ Error al reservar:', error.message);

    }

}

res.json({
    recibido: true
});

  }
);
app.use(express.json());
const SECRET = process.env.JWT_SECRET;
function verificarToken(req, res, next) {

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            error: "Debes iniciar sesión"
        });
    }

    const token = authHeader.split(" ")[1];

    try {

        const usuario = jwt.verify(token, SECRET);

        req.usuario = usuario;

        next();

    } catch (error) {

        return res.status(401).json({
            error: "Token inválido"
        });

    }

}
app.get('/perfil', verificarToken, (req, res) => {

    db.get(

        `
        SELECT
            nombre,
            email,
            telefono,
            fecha_nacimiento
        FROM usuarios
        WHERE id = ?
        `,

        [req.usuario.id],

        (err, usuario) => {

            if (err || !usuario) {

                return res.status(404).json({
                    error: "Usuario no encontrado"
                });

            }

            db.get(

                `
                SELECT

                COUNT(CASE WHEN vendedor_id=? THEN 1 END) AS creados,

                COUNT(CASE WHEN comprador_id=? THEN 1 END) AS reservados,

                COUNT(CASE
                    WHEN estado='completado'
                    AND (vendedor_id=? OR comprador_id=?)
                    THEN 1
                END) AS completados,

                IFNULL(SUM(CASE
                    WHEN vendedor_id=?
                    THEN monto_protegido
                END),0) AS dineroProtegido,

                IFNULL(SUM(CASE
                    WHEN vendedor_id=?
                    AND estado='completado'
                    THEN monto_vendedor
                END),0) AS dineroRecibido

                FROM tratos
                `,

                [

                    req.usuario.id,
                    req.usuario.id,
                    req.usuario.id,
                    req.usuario.id,
                    req.usuario.id,
                    req.usuario.id

                ],

                (err, estadisticas)=>{

                    if(err){

                        return res.status(500).json({
                            error:"Error al obtener estadísticas."
                        });

                    }

                    res.json({

                        ...usuario,

                        estadisticas

                    });

                }

            );

        }

    );

});
app.get("/notificaciones", verificarToken, (req, res) => {

    db.all(

        `
       SELECT *

FROM notificaciones

WHERE usuario_id=?

ORDER BY leida ASC, fecha DESC

LIMIT 20
        `,

        [req.usuario.id],

        (err, filas)=>{

            if(err){

                return res.status(500).json({
                    error:"Error al obtener notificaciones."
                });

            }

            res.json(filas);

        }

    );

});
app.patch("/notificaciones/leidas", verificarToken, (req, res) => {

    db.run(

        `
        UPDATE notificaciones

        SET leida=1

        WHERE usuario_id=?
        `,

        [req.usuario.id],

        function(err){

            if(err){

                return res.status(500).json({
                    error:"No fue posible actualizar."
                });

            }

            res.json({
                mensaje:"OK"
            });

        }

    );

});
app.put('/perfil', verificarToken, (req, res) => {

    const {
        nombre,
        telefono,
        fecha_nacimiento
    } = req.body;

    if (!nombre || nombre.trim() === "") {

        return res.status(400).json({
            error: "El nombre es obligatorio"
        });

    }

    db.run(

        `
        UPDATE usuarios
        SET
            nombre = ?,
            telefono = ?,
            fecha_nacimiento = ?
        WHERE id = ?
        `,

        [
            nombre.trim(),
            telefono,
            fecha_nacimiento,
            req.usuario.id
        ],

        function(err){

            if(err){

                return res.status(500).json({
                    error:"Error al actualizar el perfil"
                });

            }

            res.json({
                mensaje:"Perfil actualizado correctamente"
            });

        }

    );

});

async function generarCodigo() {

    const anio = new Date().getFullYear();

    return new Promise((resolve, reject) => {

        db.get(
            `
            SELECT codigo
            FROM tratos
            WHERE codigo LIKE ?
            ORDER BY id DESC
            LIMIT 1
            `,
            [`TJ-${anio}-%`],
            (err, row) => {

                if (err) {
                    return reject(err);
                }

                let consecutivo = 1;

                if (row) {
                    consecutivo = parseInt(row.codigo.split("-")[2]) + 1;
                }

                const codigo = `TJ-${anio}-${String(consecutivo).padStart(6, "0")}`;

                resolve(codigo);

            }
        );

    });

}

function generarCodigoLiberacion() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// INICIO
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});
// CORREO
app.get('/probar-correo', async (req, res) => {

  try {

    const resultado = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'danielarreguin89@gmail.com',
      subject: 'Prueba Trato Justo',
      html: '<h1>Correo de prueba</h1>'
    });

    res.json(resultado);

  } catch (error) {

    console.log(error);
    res.status(500).json(error);

  }

});
//ENVIAR CODIGO 
app.post('/enviar-codigo', async (req, res) => {

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      error: 'Correo requerido'
    });
  }

  const codigo = generarCodigoVerificacion();

  db.run(
    `
    INSERT INTO codigos_verificacion
    (email, codigo)
    VALUES (?, ?)
    `,
    [email, codigo],
    async function(err) {

      if (err) {
        return res.status(500).json({
          error: 'Error al guardar código'
        });
      }

      try {

        await resend.emails.send({
          from: 'onboarding@resend.dev',
          to: email,
          subject: 'Código de verificación - Trato Justo',
          html: `
            <h2>Tu código de verificación es:</h2>
            <h1>${codigo}</h1>
          `
        });

        res.json({
          mensaje: 'Código enviado'
        });

      } catch (error) {

        console.log(error);

        res.status(500).json({
          error: 'Error al enviar correo'
        });

      }

    }
  );

});
//PROBAR CODIGO 
app.get('/probar-codigo', async (req, res) => {

  const email = 'danielarreguin89@gmail.com';

  const codigo = generarCodigoVerificacion();

  db.run(
    `
    INSERT INTO codigos_verificacion
    (email, codigo)
    VALUES (?, ?)
    `,
    [email, codigo]
  );

  try {

    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: 'Código de prueba',
      html: `<h1>${codigo}</h1>`
    });

    res.json({
      mensaje: 'Código enviado',
      codigo
    });

  } catch (error) {

    console.log(error);

    res.status(500).json(error);

  }

});
// REGISTRO
app.post('/registro', async (req, res) => {

  const {
    nombre,
    email,
    telefono,
    fecha_nacimiento,
    password
  } = req.body;

  if (!nombre || !email || !telefono || !fecha_nacimiento || !password) {
    return res.status(400).json({
      error: 'Completa todos los campos'
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  
db.get(
  `
  SELECT id
  FROM usuarios
  WHERE email = ?
  `,
  [email],
  async (err, usuarioExistente) => {

    if (usuarioExistente) {
      return res.status(400).json({
        error: 'Este correo ya está registrado'
      });
    }

    continuarRegistro();

  }
);

function continuarRegistro() {
  db.run(
    `
    INSERT INTO usuarios_pendientes
    (
      nombre,
      email,
      telefono,
      fecha_nacimiento,
      password
    )
    VALUES (?, ?, ?, ?, ?)
    `,
    [
      nombre,
      email,
      telefono,
      fecha_nacimiento,
      passwordHash
    ],
    async function(err) {

      if (err) {
        return res.status(400).json({
          error: 'Error al guardar usuario'
        });
      }

      const codigo = generarCodigoVerificacion();

      db.run(
        `
        INSERT INTO codigos_verificacion
        (email, codigo)
        VALUES (?, ?)
        `,
        [email, codigo]
      );

      try {

        await resend.emails.send({
          from: 'onboarding@resend.dev',
          to: email,
          subject: 'Código de verificación - Trato Justo',
          html: `
            <h2>Tu código de verificación es:</h2>
            <h1>${codigo}</h1>
          `
        });
console.log('CORREO ENVIADO A:', email);
        res.json({
          mensaje: 'Código enviado'
        });

      } catch (error) {

        console.log(error);

        res.status(500).json({
          error: 'Error al enviar correo'
        });

      }

    }
    );

}
});
//VERIFICAR CODIGO
app.post('/verificar-codigo', (req, res) => {

  const { email, codigo } = req.body;

  db.get(
    `
    SELECT *
    FROM codigos_verificacion
    WHERE email = ?
    ORDER BY id DESC
    LIMIT 1
    `,
    [email],
    (err, codigoGuardado) => {

      if (err || !codigoGuardado) {
        return res.status(400).json({
          error: 'Código no encontrado'
        });
      }

      if (codigoGuardado.codigo !== codigo) {
        return res.status(400).json({
          error: 'Código incorrecto'
        });
      }

      db.get(
        `
        SELECT *
        FROM usuarios_pendientes
        WHERE email = ?
        `,
        [email],
        (err, usuario) => {

          if (err || !usuario) {
            return res.status(400).json({
              error: 'Usuario pendiente no encontrado'
            });
          }

          db.run(
            `
            INSERT INTO usuarios
            (
              nombre,
              email,
              telefono,
              fecha_nacimiento,
              password
            )
            VALUES (?, ?, ?, ?, ?)
            `,
            [
              usuario.nombre,
              usuario.email,
              usuario.telefono,
              usuario.fecha_nacimiento,
              usuario.password
            ],
            function(err) {

              if (err) {
                return res.status(400).json({
                  error: 'El usuario ya existe'
                });
              }

              db.run(
                `DELETE FROM usuarios_pendientes WHERE email = ?`,
                [email]
              );

              db.run(
                `DELETE FROM codigos_verificacion WHERE email = ?`,
                [email]
              );

              res.json({
                mensaje: 'Cuenta verificada correctamente'
              });

            }
          );

        }
      );

    }
  );

});
function verificarAdmin(req, res, next) {

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            error: "Token no proporcionado"
        });
    }

    const token = authHeader.replace("Bearer ", "");

    try {

        const decoded = jwt.verify(token, JWT_SECRET);

        if (decoded.tipo !== "admin") {
            return res.status(403).json({
                error: "Acceso denegado"
            });
        }

        db.get(
            `SELECT * FROM administradores
             WHERE id = ? AND activo = 1`,
            [decoded.id],
            (err, admin) => {

                if (err) {
                    return res.status(500).json({
                        error: "Error interno del servidor"
                    });
                }

                if (!admin) {
                    return res.status(403).json({
                        error: "Administrador no autorizado"
                    });
                }

                req.admin = admin;
                next();

            }
        );

    } catch (error) {

        return res.status(401).json({
            error: "Token inválido"
        });

    }

}
// LOGIN DE ADMINISTRADOR
app.post("/admin/login", async (req, res) => {

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            error: "Correo y contraseña son obligatorios"
        });
    }

    db.get(
        "SELECT * FROM administradores WHERE email = ? AND activo = 1",
        [email],
        async (err, admin) => {

            if (err) {
                console.error(err);
                return res.status(500).json({
                    error: "Error interno del servidor"
                });
            }

            if (!admin) {
                return res.status(401).json({
                    error: "Credenciales incorrectas"
                });
            }

            const coincide = await bcrypt.compare(password, admin.password);

            if (!coincide) {
                return res.status(401).json({
                    error: "Credenciales incorrectas"
                });
            }

            const token = jwt.sign(
                {
                    id: admin.id,
                    email: admin.email,
                    rol: admin.rol,
                    tipo: "admin"
                },
                JWT_SECRET,
                { expiresIn: "8h" }
            );

            res.json({
                mensaje: "Inicio de sesión exitoso",
                token,
                administrador: {
                    id: admin.id,
                    nombre: admin.nombre,
                    email: admin.email,
                    rol: admin.rol
                }
            });

        }
    );

});
// DASHBOARD ADMINISTRADOR
app.get("/admin/dashboard", verificarAdmin, (req, res) => {

    db.get( 
        `
        SELECT
            (SELECT COUNT(*) FROM usuarios) AS usuarios,
            (SELECT COUNT(*) FROM tratos WHERE estado = 'creado') AS tratos_creados,
            (SELECT COUNT(*) FROM tratos WHERE estado = 'reservado') AS tratos_reservados,
            (SELECT COUNT(*) FROM tratos WHERE estado = 'completado') AS tratos_completados,
            (SELECT IFNULL(SUM(monto_protegido),0) FROM tratos) AS dinero_protegido,
            (SELECT IFNULL(SUM(comision),0) FROM tratos WHERE estado='completado') AS comisiones
        `,
        [],
        (err, datos) => {

            if (err) {
                return res.status(500).json({
                    error: "Error al obtener estadísticas"
                });
            }

            res.json({
                administrador: req.admin.nombre,
                estadisticas: datos
            });

        }
    );

});
// LISTAR USUARIOS (ADMIN)
app.get("/admin/usuarios", verificarAdmin, (req, res) => {

    const buscar = req.query.buscar || "";
    console.log("Buscar:", buscar);

    const sql = `
        SELECT
    id,
    nombre,
    email,
    telefono,
    fecha_nacimiento,
    stripe_account_id,
    estado
FROM usuarios
        WHERE
            nombre LIKE ?
            OR email LIKE ?
            OR telefono LIKE ?
        ORDER BY id DESC
    `;

    const filtro = `%${buscar}%`;

    db.all(
        sql,
        [filtro, filtro, filtro],
        (err, usuarios) => {

            if (err) {
                return res.status(500).json({
                    error: "Error al obtener usuarios"
                });
            }

            res.json({
                total: usuarios.length,
                usuarios
            });

        }
    );

});
// DETALLE DE UN USUARIO (ADMIN)
app.get("/admin/usuario/:id", verificarAdmin, (req, res) => {

    db.get(
        `
        SELECT
            usuarios.*,

            (
                SELECT COUNT(*)
                FROM tratos
                WHERE vendedor_id = usuarios.id
            ) AS tratos_creados,

            (
                SELECT COUNT(*)
                FROM tratos
                WHERE comprador_id = usuarios.id
            ) AS tratos_comprados,

            (
                SELECT COUNT(*)
                FROM tratos
                WHERE
                    (vendedor_id = usuarios.id
                    OR comprador_id = usuarios.id)
                    AND estado = 'completado'
            ) AS tratos_completados

        FROM usuarios

        WHERE id = ?
        `,
        [req.params.id],

        (err, usuario) => {

            if (err) {
                return res.status(500).json({
                    error: "Error interno"
                });
            }

            if (!usuario) {
                return res.status(404).json({
                    error: "Usuario no encontrado"
                });
            }

            db.get(

`
SELECT

COUNT(CASE WHEN vendedor_id=? THEN 1 END) AS creados,

COUNT(CASE WHEN comprador_id=? THEN 1 END) AS reservados,

COUNT(CASE WHEN estado='completado'
AND (vendedor_id=? OR comprador_id=?)
THEN 1 END) AS completados,

IFNULL(SUM(CASE WHEN vendedor_id=? THEN monto_protegido END),0)
AS dineroProtegido,

IFNULL(SUM(CASE WHEN vendedor_id=?
AND estado='completado'
THEN monto_vendedor END),0)
AS dineroRecibido

FROM tratos
`,

[
req.usuario.id,
req.usuario.id,
req.usuario.id,
req.usuario.id,
req.usuario.id,
req.usuario.id
],

(err, estadisticas)=>{

    if(err){

        return res.status(500).json({
            error:"Error al obtener estadísticas."
        });

    }
console.log(estadisticas);
    res.json({

        ...usuario,

        estadisticas

    });

}

);

        }

    );

});
// CAMBIAR ESTADO DE USUARIO (ADMIN)
app.patch("/admin/usuario/:id/estado", verificarAdmin, (req, res) => {

    const { estado } = req.body;

    if (!["activo", "suspendido"].includes(estado)) {
        return res.status(400).json({
            error: "Estado inválido"
        });
    }

    db.run(
        `
        UPDATE usuarios
        SET estado = ?
        WHERE id = ?
        `,
        [estado, req.params.id],
        function(err){

            if(err){
                return res.status(500).json({
                    error:"Error al actualizar el estado"
                });
            }

            if(this.changes === 0){
                return res.status(404).json({
                    error:"Usuario no encontrado"
                });
            }

            res.json({
                mensaje:"Estado actualizado correctamente",
                estado
            });

        }
    );

});
// LISTAR TRATOS (ADMIN)
app.get("/admin/tratos", verificarAdmin, (req, res) => {

    const buscar = (req.query.buscar || "").trim();

    let sql = `
        SELECT
            tratos.id,
            tratos.codigo,
            tratos.producto,
            tratos.descripcion,
            tratos.monto_protegido,
            tratos.comision,
            tratos.estado,

            vendedor.nombre AS vendedor,
            vendedor.email AS vendedor_email,
            vendedor.telefono AS vendedor_telefono,

            comprador.nombre AS comprador,
            comprador.email AS comprador_email,
            comprador.telefono AS comprador_telefono

        FROM tratos

        INNER JOIN usuarios vendedor
            ON vendedor.id = tratos.vendedor_id

        LEFT JOIN usuarios comprador
            ON comprador.id = tratos.comprador_id
    `;

    let parametros = [];

    if (buscar !== "") {

        sql += `
            WHERE
                tratos.codigo LIKE ?
                OR vendedor.nombre LIKE ?
                OR vendedor.email LIKE ?
                OR vendedor.telefono LIKE ?
                OR comprador.nombre LIKE ?
                OR comprador.email LIKE ?
                OR comprador.telefono LIKE ?
        `;

        const filtro = `%${buscar}%`;

        parametros = [
            filtro,
            filtro,
            filtro,
            filtro,
            filtro,
            filtro,
            filtro
        ];

    }

    sql += `
        ORDER BY tratos.id DESC
        LIMIT 50
    `;

    db.all(sql, parametros, (err, tratos) => {

        if (err) {
            return res.status(500).json({
                error: "Error al obtener los tratos"
            });
        }

        res.json({
            total: tratos.length,
            tratos
        });

    });

});
// FINANZAS (ADMIN)
app.get("/admin/finanzas", verificarAdmin, (req, res) => {

    const buscar = (req.query.buscar || "").trim();

    db.get(
        `
        SELECT

            IFNULL(SUM(monto_protegido),0) AS dinero_protegido,

            IFNULL(SUM(comision),0) AS comisiones,

            IFNULL(SUM(monto_protegido-comision),0) AS dinero_liberado,

            COUNT(
                CASE
                    WHEN estado='completado'
                    THEN 1
                END
            ) AS tratos_completados

        FROM tratos
        `,
        [],
        (err, resumen) => {

            if(err){

                return res.status(500).json({
                    error:"Error al obtener resumen financiero"
                });

            }

            let sql = `
                SELECT

                    codigo,

                    fecha,

                    monto_protegido,

                    comision,

                    (monto_protegido - comision) AS monto_vendedor,

                    estado

                FROM tratos
            `;

            const parametros = [];

            if(buscar){

                sql += `
                    WHERE codigo LIKE ?
                `;

                parametros.push("%"+buscar+"%");

            }

            sql += `
                ORDER BY id DESC
                LIMIT 100
            `;

            db.all(sql,parametros,(err,movimientos)=>{

                if(err){

                    return res.status(500).json({
                        error:"Error al obtener movimientos"
                    });

                }

                res.json({

                    resumen,

                    movimientos

                });

            });

        }

    );

});
// CONFIGURACIÓN ADMIN
app.get("/admin/configuracion", verificarAdmin, (req, res) => {

    const stripeEstado =
        process.env.STRIPE_SECRET_KEY
        ? "✅ Configurado"
        : "❌ No configurado";

    const resendEstado =
        process.env.RESEND_API_KEY
        ? "✅ Configurado"
        : "❌ No configurado";

    res.json({

        admin:{
            nombre:req.admin.nombre,
            email:req.admin.email,
            rol:req.admin.rol
        },

        stripe:stripeEstado,

        resend:resendEstado

    });

});
// CAMBIAR CONTRASEÑA ADMIN
app.patch("/admin/cambiar-password", verificarAdmin, (req, res) => {

    const {

        passwordActual,

        passwordNueva

    } = req.body;

    if(!passwordActual || !passwordNueva){

        return res.status(400).json({

            error:"Completa todos los campos."

        });

    }

    if(!bcrypt.compareSync(passwordActual, req.admin.password)){

        return res.status(400).json({

            error:"La contraseña actual es incorrecta."

        });

    }

    const nuevaPassword =
        bcrypt.hashSync(passwordNueva,10);

    db.run(

        `
        UPDATE administradores
        SET password=?
        WHERE id=?
        `,

        [

            nuevaPassword,

            req.admin.id

        ],

        function(err){

            if(err){

                return res.status(500).json({

                    error:"Error al actualizar contraseña."

                });

            }

            res.json({

                mensaje:"Contraseña actualizada correctamente."

            });

        }

    );

});
// ACTUALIZAR DATOS DEL ADMINISTRADOR
app.patch("/admin/actualizar", verificarAdmin, (req, res) => {

    const { nombre, email, rol } = req.body;

    if (!nombre || !email || !rol) {

        return res.status(400).json({
            error: "Completa todos los campos."
        });

    }

    db.run(

        `
        UPDATE administradores
        SET nombre = ?,
            email = ?,
            rol = ?
        WHERE id = ?
        `,

        [
            nombre,
            email,
            rol,
            req.admin.id
        ],

        function(err){

            if(err){

                return res.status(500).json({
                    error:"No fue posible actualizar."
                });

            }

            res.json({
                mensaje:"Datos actualizados correctamente."
            });

        }

    );

});
// BUSCAR TRATO POR CÓDIGO (ADMIN)
app.get("/admin/trato/:codigo", verificarAdmin, (req, res) => {

    db.get(
        `
        SELECT

            tratos.id,
            tratos.codigo,
            tratos.producto,
            tratos.descripcion,
            tratos.monto_protegido,
            tratos.comision,
            tratos.estado,
           tratos.stripe_payment_intent,
tratos.stripe_transfer_id,
tratos.monto_vendedor,
tratos.codigo_liberacion,
tratos.fecha,

            vendedor.id AS vendedor_id,
            vendedor.nombre AS vendedor_nombre,
            vendedor.email AS vendedor_email,
            vendedor.telefono AS vendedor_telefono,

            comprador.id AS comprador_id,
            comprador.nombre AS comprador_nombre,
            comprador.email AS comprador_email,
            comprador.telefono AS comprador_telefono

        FROM tratos

        INNER JOIN usuarios vendedor
            ON vendedor.id = tratos.vendedor_id

        LEFT JOIN usuarios comprador
            ON comprador.id = tratos.comprador_id

        WHERE tratos.codigo = ?
        `,
        [req.params.codigo],
        (err, trato) => {

            if (err) {
                return res.status(500).json({
                    error: "Error interno"
                });
            }

            if (!trato) {
                return res.status(404).json({
                    error: "Trato no encontrado"
                });
            }

            res.json(trato);

        }

    );

});
// LOGIN
app.post('/login', (req, res) => {

  const { email, password } = req.body;

  db.get(
    'SELECT * FROM usuarios WHERE email = ?',
    [email],
    async (err, usuario) => {

      if (err || !usuario) {
        return res.status(400).json({
          error: 'Usuario no encontrado'
        });
      }

      const coincide = await bcrypt.compare(
        password,
        usuario.password
      );

      if (!coincide) {
        return res.status(400).json({
          error: 'Contraseña incorrecta'
        });
      }
      if (usuario.estado === "suspendido") {
  return res.status(403).json({
    error: "Tu cuenta ha sido suspendida. Contacta al soporte."
  });
}

      const token = jwt.sign(
    {
        id: usuario.id,
        email: usuario.email
    },
    SECRET
);

      res.json({
        mensaje: 'Login correcto',
        token
      });

    }
  );

});

app.post("/recuperar-password", (req, res) => {

    const { email } = req.body;

    if (!email) {

        return res.status(400).json({
            error: "Ingresa tu correo."
        });

    }

    db.get(

        "SELECT * FROM usuarios WHERE email = ?",

        [email],

        (err, usuario) => {

            if (err) {

                console.error(err);

                return res.status(500).json({
                    error: "Error interno."
                });

            }

            // Nunca revelar si el correo existe o no
            if (!usuario) {

                return res.json({
                    mensaje: "Si el correo existe, recibirás un enlace para recuperar tu contraseña."
                });

            }

            const token = crypto.randomBytes(32).toString("hex");

            const expiracion = new Date(
                Date.now() + (60 * 60 * 1000)
            ).toISOString();

            db.run(

                `INSERT INTO recuperacion_password
                (email, token, fecha_expiracion)
                VALUES (?, ?, ?)`,

                [
                    email,
                    token,
                    expiracion
                ],

                async function(err) {

                    if (err) {

                        console.error(err);

                        return res.status(500).json({
                            error: "No fue posible generar el enlace."
                        });

                    }

                    try {

                        const resultado = await resend.emails.send({

                            from: "onboarding@resend.dev",

                            to: email,

                            subject: "Recupera tu contraseña - Trato Justo",

                            html: `
                                <h2>Recuperación de contraseña</h2>

                                <p>Hola.</p>

                                <p>Recibimos una solicitud para cambiar tu contraseña.</p>

                                <p>
                                    Haz clic en el siguiente enlace:
                                </p>

                                <p>
                                    <a href="https://trato-justo.onrender.com/restablecer-password.html?token=${token}">
                                        Restablecer contraseña
                                    </a>
                                </p>

                                <p>
                                    Este enlace expirará en 1 hora.
                                </p>

                                <p>
                                    Si no solicitaste este cambio, puedes ignorar este correo.
                                </p>
                            `

                        });
console.log("RECUPERAR PASSWORD:", resultado);
                        return res.json({

                            mensaje: "Te enviamos un enlace para recuperar tu contraseña."

                        });

                    } catch (error) {

                        console.error(error);

                        return res.status(500).json({

                            error: "No fue posible enviar el correo."

                        });

                    }

                }

            );

        }

    );

});
app.post("/restablecer-password", (req, res) => {

    const { token, password } = req.body;

    if(!token || !password){

        return res.status(400).json({
            error:"Información incompleta."
        });

    }

    db.get(

        `SELECT * FROM recuperacion_password
         WHERE token = ?`,

        [token],

        async (err, registro)=>{

            if(err){

                console.error(err);

                return res.status(500).json({
                    error:"Error interno."
                });

            }

            if(!registro){

                return res.status(400).json({
                    error:"El enlace no es válido."
                });

            }

            if(new Date(registro.fecha_expiracion) < new Date()){

                return res.status(400).json({
                    error:"El enlace ya expiró."
                });

            }

            try{

                const passwordHash =
                    await bcrypt.hash(password,10);

                db.run(

                    `UPDATE usuarios
                     SET password=?
                     WHERE email=?`,

                    [
                        passwordHash,
                        registro.email
                    ],

                    function(err){

                        if(err){

                            console.error(err);

                            return res.status(500).json({
                                error:"No fue posible actualizar la contraseña."
                            });

                        }

                        db.run(

                            `DELETE FROM recuperacion_password
                             WHERE token=?`,

                            [token]

                        );

                        return res.json({

                            mensaje:"Contraseña actualizada correctamente."

                        });

                    }

                );

            }

            catch(error){

                console.error(error);

                return res.status(500).json({

                    error:"Error interno."

                });

            }

        }

    );

});
// CREAR TRATO
app.post('/crear-trato', verificarToken, async (req, res) => {

  const usuario = req.usuario;

  const {
    producto,
    descripcion,
    monto_protegido
  } = req.body;

  const monto = Number(monto_protegido);

  if (isNaN(monto)) {
    return res.status(400).json({
      error: 'Monto inválido'
    });
  }

  if (monto < 300) {
    return res.status(400).json({
      error: 'El monto mínimo protegido es $300'
    });
  }

  const codigo = await generarCodigo();
  const fecha = new Date().toLocaleString("sv-SE", {
    timeZone: "America/Mexico_City"
}).replace(" ", "T");

  db.run(
  `INSERT INTO tratos
  (
    codigo,
    producto,
    descripcion,
    monto_protegido,
    vendedor_id,
    estado,
    comision,
    monto_vendedor,
    fecha
  )
  VALUES (?, ?, ?, ?, ?, 'creado', 0, 0, ?)`,
    [
  codigo,
  producto,
  descripcion,
  monto,
  usuario.id,
  fecha
],
    function(err) {

      if (err) {

        return res.status(400).json({
          error: 'No se pudo crear el trato'
        });

      }

     db.run(

`INSERT INTO notificaciones
(usuario_id,titulo,mensaje)
VALUES(?,?,?)`,

[
usuario.id,
"Trato creado",
`Tu trato ${codigo} fue creado correctamente.`
],

(errNotificacion)=>{

    if(errNotificacion){

        console.error(errNotificacion);

    }

    res.json({

        mensaje:"Trato creado correctamente",

        codigo

    });

}

);

    }
  );

});

// MIS VENTAS
app.get('/mis-ventas', verificarToken, (req, res) => {

    db.all(
        `
        SELECT *
        FROM tratos
        WHERE vendedor_id=?
        ORDER BY id DESC
        `,
        [req.usuario.id],
        (err, rows)=>{

            if(err){

                return res.status(500).json({
                    error:"Error al obtener ventas"
                });

            }

            res.json(rows);

        }

    );

});
// MIS COMPRAS
app.get('/mis-compras', verificarToken, (req, res) => {

    db.all(

        `
        SELECT *
        FROM tratos
        WHERE comprador_id = ?
        ORDER BY id DESC
        `,

        [req.usuario.id],

        (err, rows) => {

            if(err){

                return res.status(500).json({
                    error:"Error al obtener compras"
                });

            }

            res.json(rows);

        }

    );

});

// RESERVAR TRATO
app.post('/reservar/:codigo', verificarToken, (req, res) => {
const usuario = req.usuario;
  db.get(
    `
    SELECT *
    FROM tratos
    WHERE codigo = ?
    `,
    [req.params.codigo],
    (err, trato) => {

      if (err || !trato) {
        return res.status(404).json({
          mensaje: 'Trato no encontrado'
        });
      }
if (trato.vendedor_id === usuario.id) {

    return res.status(400).json({
        error: 'No puedes reservar tu propio trato'
    });

}
      if (trato.estado !== 'creado') {
        return res.json({
          mensaje: 'Este trato ya fue reservado'
        });
      }

      reservarTratoSistema(
  req.params.codigo,
  usuario.id
)
.then(() => {

  res.json({
    mensaje: 'Trato reservado correctamente'
  });

})
.catch((error) => {

  res.status(500).json({
    error: error.message
  });

});
    }

  );

});

// CONFIRMAR ENTREGA
app.post('/confirmar-entrega/:codigo', verificarToken, (req, res) => {

    const { codigo_liberacion } = req.body;

    db.get(
        `
        SELECT
            tratos.*,
            usuarios.stripe_account_id
        FROM tratos
        INNER JOIN usuarios
            ON usuarios.id = tratos.vendedor_id
        WHERE tratos.codigo = ?
        `,
        [req.params.codigo],

        async (err, trato) => {

            if (err || !trato) {
                return res.status(404).json({
                    error: "Trato no encontrado"
                });
            }

            if (req.usuario.id !== trato.vendedor_id) {
                return res.status(403).json({
                    error: "Solo el vendedor puede liberar el pago"
                });
            }

            if (trato.estado !== "reservado") {
                return res.status(400).json({
                    error: "El trato no está reservado"
                });
            }

            if (trato.codigo_liberacion !== codigo_liberacion) {
                return res.status(400).json({
                    error: "Código incorrecto"
                });
            }

            if (!trato.stripe_account_id) {
                return res.status(400).json({
                    error: "El vendedor no ha configurado Stripe Connect."
                });
            }

            if (!trato.stripe_payment_intent) {
                return res.status(400).json({
                    error: "No existe un PaymentIntent asociado."
                });
            }

            if (trato.stripe_transfer_id) {
                return res.status(400).json({
                    error: "Este pago ya fue liberado."
                });
            }

            try {

               const transferencia = await stripe.transfers.create(

    {

        amount: Math.round(Number(trato.monto_vendedor) * 100),

        currency: "mxn",

        destination: trato.stripe_account_id,

        transfer_group: trato.codigo

    },

    {

        idempotencyKey: "transfer_" + trato.codigo

    }

);

                db.run(
                    `
                    UPDATE tratos
                    SET
                        estado = 'completado',
                        stripe_transfer_id = ?
                    WHERE codigo = ?
                    `,
                    [
                        transferencia.id,
                        req.params.codigo
                    ],
                    function(error){

                        if(error){

                            return res.status(500).json({
                                error:"Error al guardar la transferencia."
                            });

                        }
crearNotificacion(

    trato.vendedor_id,

    "Pago liberado",

    `El pago del trato ${trato.codigo} fue liberado correctamente. El dinero será transferido a tu cuenta Stripe.`

);
                        res.json({

                            mensaje:"Pago liberado correctamente.",

                            transferencia: transferencia.id

                        });

                    }

                );

            } catch(error){

                console.log(error);

                return res.status(500).json({

                    error:error.message

                });

            }

        }

    );

});

// CONFIGURAR CUENTA STRIPE CONNECT
app.post('/stripe/onboarding', verificarToken, async (req, res) => {

    try {

        db.get(
            `
            SELECT stripe_account_id
            FROM usuarios
            WHERE id = ?
            `,
            [req.usuario.id],
            async (err, usuario) => {

                if (err) {
                    return res.status(500).json({
                        error: 'Error al consultar el usuario'
                    });
                }

                let stripeAccountId = usuario.stripe_account_id;

                // Si aún no tiene cuenta, la creamos
                if (!stripeAccountId) {

                    const cuenta = await stripe.accounts.create({
                        type: 'express',
                        country: 'MX',
                        email: req.usuario.email
                    });

                    stripeAccountId = cuenta.id;

                    await new Promise((resolve, reject) => {

                        db.run(
                            `
                            UPDATE usuarios
                            SET stripe_account_id = ?
                            WHERE id = ?
                            `,
                            [
                                stripeAccountId,
                                req.usuario.id
                            ],
                            function(err){

                                if(err){
                                    reject(err);
                                }else{
                                    resolve();
                                }

                            }

                        );

                    });

                }

                // Crear enlace de onboarding
                const accountLink = await stripe.accountLinks.create({

                    account: stripeAccountId,

                    refresh_url: 'https://trato-justo.onrender.com/configuracion.html',

return_url: 'https://trato-justo.onrender.com/configuracion.html',

                    type: 'account_onboarding'

                });

                res.json({

                    url: accountLink.url

                });

            }

        );

    } catch(error){

        console.log(error);

        res.status(500).json({

            error: error.message

        });

    }

});
// ESTADO DE STRIPE CONNECT
app.get('/stripe/status', verificarToken, async (req, res) => {

    try {

        db.get(
            `
            SELECT stripe_account_id
            FROM usuarios
            WHERE id = ?
            `,
            [req.usuario.id],
            async (err, usuario) => {

                if (err) {
                    return res.status(500).json({
                        error: "Error al consultar el usuario"
                    });
                }

                // Aún no tiene cuenta Stripe
                if (!usuario.stripe_account_id) {
                    return res.json({
                        tieneCuenta: false,
                        configurada: false
                    });
                }

                const cuenta = await stripe.accounts.retrieve(
                    usuario.stripe_account_id
                );

                res.json({

                    tieneCuenta: true,

                    configurada:
                        cuenta.details_submitted &&
                        cuenta.charges_enabled &&
                        cuenta.payouts_enabled

                });

            }

        );

    } catch (error) {

        console.log(error);

        res.status(500).json({
            error: error.message
        });

    }

});
// CREAR SESIÓN DE STRIPE CHECKOUT
app.post('/stripe/create-checkout-session', verificarToken, async (req, res) => {

    try {

        const { codigo } = req.body;

        db.get(
            `
            SELECT *
            FROM tratos
            WHERE codigo = ?
            `,
            [codigo],
            async (err, trato) => {

                if (err || !trato) {
                    return res.status(404).json({
                        error: "Trato no encontrado"
                    });
                }

                if (trato.estado !== "creado") {
                    return res.status(400).json({
                        error: "Este trato ya no está disponible"
                    });
                }
console.log("SUCCESS URL:",
"https://trato-justo.onrender.com/pago-exitoso.html?session_id={CHECKOUT_SESSION_ID}");
   const session = await stripe.checkout.sessions.create({

                    mode: "payment",

                    payment_method_types: ["card"],

                    line_items: [

                        {
                            price_data: {

                                currency: "mxn",

                                product_data: {

                                    name: trato.producto,

                                    description: trato.descripcion

                                },

                                unit_amount: Math.round(
                                    Number(trato.monto_protegido) * 100
                                )

                            },

                            quantity: 1

                        }

                    ],

                    success_url: "https://trato-justo.onrender.com/pago-exitoso.html?session_id={CHECKOUT_SESSION_ID}",
cancel_url: "https://trato-justo.onrender.com/pago-cancelado.html",
payment_intent_data: {
    transfer_group: trato.codigo
    },
                    metadata: {

    trato_codigo: trato.codigo,
    comprador_id: req.usuario.id,
    monto: trato.monto_protegido

}

                });

                res.json({

                    sessionId: session.id

                });

            }

        );

    } catch (error) {

        console.log(error);

        res.status(500).json({

            error: error.message

        });

    }

});

// LISTAR TRATOS
app.get('/tratos', (req, res) => {

  db.all(
    'SELECT * FROM tratos ORDER BY id DESC',
    [],
    (err, rows) => {

      if (err) {

        return res.status(500).json({
          error: 'Error al obtener tratos'
        });

      }

      res.json(rows);

    }
  );

});

// PÁGINA DEL TRATO
app.get('/trato/:codigo', (req, res) => {
  res.sendFile(__dirname + '/trato.html');
});
// API DEL TRATO
app.get('/api/trato/:codigo', (req, res) => {

  const authHeader = req.headers.authorization;

let usuario = null;

if (authHeader && authHeader.startsWith("Bearer ")) {

    const token = authHeader.split(" ")[1];

    try {

        usuario = jwt.verify(token, SECRET);

    } catch {

        usuario = null;

    }

}

  db.get(
    `
    SELECT
      tratos.*,
      vendedor.nombre AS vendedor_nombre,
      comprador.nombre AS comprador_nombre
    FROM tratos
    LEFT JOIN usuarios vendedor
      ON vendedor.id = tratos.vendedor_id
    LEFT JOIN usuarios comprador
      ON comprador.id = tratos.comprador_id
    WHERE codigo = ?
    `,
    [req.params.codigo],
    (err, trato) => {

      if (err || !trato) {
        return res.status(404).json({
          error: 'Trato no encontrado'
        });
      }

      trato.esVendedor = false;
      trato.esComprador = false;

      if (usuario) {

        if (usuario.id === trato.vendedor_id) {
          trato.esVendedor = true;
        }

        if (usuario.id === trato.comprador_id) {
          trato.esComprador = true;
        }

      }

      db.get(
        `
        SELECT
          ROUND(AVG(estrellas),1) AS promedio,
          COUNT(*) AS total
        FROM calificaciones
        WHERE calificado_id = ?
        `,
        [trato.vendedor_id],
        (errorRating, rating) => {

          trato.vendedor_rating =
            rating?.promedio || 0;

          trato.vendedor_total_calificaciones =
            rating?.total || 0;

          db.get(
            `
            SELECT
              ROUND(AVG(estrellas),1) AS promedio,
              COUNT(*) AS total
            FROM calificaciones
            WHERE calificado_id = ?
            `,
            [trato.comprador_id],
            (errorComprador, ratingComprador) => {

              trato.comprador_rating =
                ratingComprador?.promedio || 0;

              trato.comprador_total_calificaciones =
                ratingComprador?.total || 0;

              if (!usuario) {
                return res.json(trato);
              }

              db.get(
                `
                SELECT *
                FROM calificaciones
                WHERE trato_id = ?
                AND calificador_id = ?
                `,
                [trato.id, usuario.id],
                (errCalificacion, yaExiste) => {

                  trato.yaCalifico = !!yaExiste;

                  res.json(trato);

                }
              );

            }
          );

        }
      );

    }
  );

});
// CALIFICAR USUARIO
app.post('/calificar/:codigo', verificarToken, (req, res) => {

  const { estrellas } = req.body;

  db.get(
    `
    SELECT *
    FROM tratos
    WHERE codigo = ?
    `,
    [req.params.codigo],
    (err, trato) => {

      if (err || !trato) {
        return res.status(404).json({
          error: 'Trato no encontrado'
        });
      }

      if (trato.estado !== 'completado') {
        return res.status(400).json({
          error: 'El trato aún no está completado'
        });
      }

      let calificadoId;

      if (req.usuario.id === trato.comprador_id) {
        calificadoId = trato.vendedor_id;
      } else if (req.usuario.id === trato.vendedor_id) {
        calificadoId = trato.comprador_id;
      } else {
        return res.status(403).json({
          error: 'No participaste en este trato'
        });
      }

      db.get(
        `
        SELECT *
        FROM calificaciones
        WHERE trato_id = ?
        AND calificador_id = ?
        `,
        [trato.id, req.usuario.id],
        (error, existe) => {

          if (existe) {
            return res.status(400).json({
              error: 'Ya calificaste este trato'
            });
          }

          db.run(
            `
            INSERT INTO calificaciones
            (
              trato_id,
              calificador_id,
              calificado_id,
              estrellas
            )
            VALUES (?, ?, ?, ?)
            `,
            [
              trato.id,
              req.usuario.id,
              calificadoId,
              estrellas
            ],
            function(errInsert) {

              if (errInsert) {
                return res.status(500).json({
                  error: 'Error al guardar calificación'
                });
              }

              res.json({
                mensaje: 'Calificación guardada'
              });

            }
          );

        }
      );

    }
  );

});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});