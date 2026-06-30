const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./database');

const app = express();
const PORT = 3000;

const SECRET = 'mi_clave_secreta';

app.use(express.json());
app.use(express.static('.'));

// Página principal
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// REGISTRO
app.post('/registro', async (req, res) => {

  const { nombre, email, password } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({
      error: 'Todos los campos son obligatorios'
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  db.run(
    'INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)',
    [nombre, email, passwordHash],
    function(err) {

      if (err) {
        return res.status(400).json({
          error: 'El correo ya existe'
        });
      }

      res.json({
        mensaje: 'Usuario registrado correctamente'
      });

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

      const token = jwt.sign(
        { id: usuario.id },
        SECRET
      );

      res.json({
        mensaje: 'Login correcto',
        token
      });

    }
  );

});

// GUARDAR PRODUCTO
app.post('/productos', (req, res) => {

  const { titulo, precio } = req.body;

  db.run(
    'INSERT INTO productos (titulo, precio) VALUES (?, ?)',
    [titulo, precio],
    function(err) {

      if (err) {
        return res.status(400).json({
          error: 'Error al guardar producto'
        });
      }

      res.json({
        mensaje: 'Producto publicado correctamente'
      });

    }
  );

});

// LISTAR PRODUCTOS
app.get('/productos', (req, res) => {

  db.all(
    'SELECT * FROM productos ORDER BY id DESC',
    [],
    (err, rows) => {

      if (err) {
        return res.status(500).json({
          error: 'Error al obtener productos'
        });
      }

      res.json(rows);

    }
  );

});

// CREAR TRATO
app.post('/comprar', (req, res) => {

  const { producto_id } = req.body;

  db.run(
    `INSERT INTO tratos
    (producto_id, comprador_id, vendedor_id, estado)
    VALUES (?, 1, 1, 'pendiente')`,
    [producto_id],
    function(err) {

      if (err) {
        return res.status(400).json({
          error: 'No se pudo crear el trato'
        });
      }

      res.json({
        mensaje: 'Trato creado correctamente'
      });

    }
  );

});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});