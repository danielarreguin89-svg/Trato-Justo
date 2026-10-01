const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.db');

db.serialize(() => {

  // USUARIOS
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS codigos_verificacion (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      codigo TEXT NOT NULL,
      creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    ALTER TABLE usuarios
    ADD COLUMN telefono TEXT
  `, () => {});

  db.run(`
    ALTER TABLE usuarios
    ADD COLUMN fecha_nacimiento TEXT
  `, () => {});

  // ====== STRIPE ======

  db.run(`
    ALTER TABLE usuarios
    ADD COLUMN stripe_account_id TEXT
  `, () => {});

  db.run(`
    ALTER TABLE usuarios
    ADD COLUMN stripe_onboarding_complete INTEGER DEFAULT 0
  `, () => {});
  db.run(`
  ALTER TABLE usuarios
  ADD COLUMN estado TEXT DEFAULT 'activo'
`, () => {});


  // ====================

  // USUARIOS PENDIENTES
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios_pendientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT NOT NULL,
      telefono TEXT NOT NULL,
      fecha_nacimiento TEXT NOT NULL,
      password TEXT NOT NULL
    )
  `);

  // TRATOS
  db.run(`
    CREATE TABLE IF NOT EXISTS tratos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT UNIQUE NOT NULL,
      producto TEXT NOT NULL,
      descripcion TEXT,
      monto_protegido REAL NOT NULL,
      vendedor_id INTEGER,
      comprador_id INTEGER,
      estado TEXT DEFAULT 'creado',
      fecha DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
db.run(`
ALTER TABLE tratos
ADD COLUMN comision REAL DEFAULT 0
`,()=>{});

db.run(`
ALTER TABLE tratos
ADD COLUMN monto_vendedor REAL DEFAULT 0
`,()=>{});

db.run(`
ALTER TABLE tratos
ADD COLUMN codigo_liberacion TEXT
`,()=>{});
 db.run(`
ALTER TABLE tratos
ADD COLUMN stripe_payment_intent TEXT
`,()=>{});

db.run(`
ALTER TABLE tratos
ADD COLUMN stripe_transfer_id TEXT
`,()=>{});
  // CALIFICACIONES
  db.run(`
    CREATE TABLE IF NOT EXISTS calificaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trato_id INTEGER NOT NULL,
      calificador_id INTEGER NOT NULL,
      calificado_id INTEGER NOT NULL,
      estrellas INTEGER NOT NULL,
      fecha DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // NOTIFICACIONES
db.run(`
CREATE TABLE IF NOT EXISTS notificaciones (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    usuario_id INTEGER NOT NULL,

    titulo TEXT NOT NULL,

    mensaje TEXT NOT NULL,

    leida INTEGER DEFAULT 0,

    fecha DATETIME DEFAULT CURRENT_TIMESTAMP

)
`);
// ADMINISTRADORES
db.run(`
CREATE TABLE IF NOT EXISTS administradores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    rol TEXT DEFAULT 'admin',
    activo INTEGER DEFAULT 1,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP
)
`);
db.run(`
CREATE TABLE IF NOT EXISTS administradores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    rol TEXT DEFAULT 'admin',
    activo INTEGER DEFAULT 1,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP
)
`, (err) => {
    if (err) {
        console.log("❌ Error creando administradores:", err.message);
    } else {
        console.log("✅ Tabla administradores verificada");
    }
});
db.run(`
CREATE TABLE IF NOT EXISTS recuperacion_password(

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    email TEXT NOT NULL,

    token TEXT NOT NULL,

    fecha_expiracion DATETIME NOT NULL

)
`);
});

module.exports = db;