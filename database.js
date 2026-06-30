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

  // PRODUCTOS
  db.run(`
    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      precio REAL NOT NULL,
      usuario_id INTEGER
    )
  `);

  // TRATOS
  db.run(`
    CREATE TABLE IF NOT EXISTS tratos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      producto_id INTEGER NOT NULL,
      comprador_id INTEGER,
      vendedor_id INTEGER,
      estado TEXT DEFAULT 'pendiente',
      fecha DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

});

module.exports = db;