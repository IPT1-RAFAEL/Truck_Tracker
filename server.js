const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const pool = require('./db');

const app = express();
const PORT = 8080;

const server = http.createServer(app);
const io = new Server(server);
const clientRoles = {};

app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);
  
  socket.on('registerRole', ({ role, id }) => {
    clientRoles[socket.id] = { role, id };
    console.log(`🔖 ${socket.id} registered as ${role} (${id || 'no id'})`);
    
  });


  socket.on('gpsUpdate', (data) => {
    const roleInfo = clientRoles[socket.id];
    if (!roleInfo || roleInfo.role !== 'truck') return;
    // Ensure sender's ID is included
    const fullData = {
      id: socket.id,
      lat: data.lat,
      lon: data.lon
    };
    io.emit('gpsUpdate', fullData);
  });

  socket.on('disconnect', () => {
    delete clientRoles[socket.id];
    console.log('❌ Client disconnected:', socket.id);
  });
});
/*
// POST route to save driver registration
app.post('/register', async (req, res) => {
  const { name, barangay } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO drivers (name, barangay) VALUES ($1, $2) RETURNING *',
      [name, barangay]
    );

    console.log('✅ Driver registered:', result.rows[0]);
    res.redirect('/register.html'); // Or wherever you want to go after
  } catch (error) {
    console.error('❌ Failed to register driver:', error);
    res.status(500).send('Error saving to database');
  }
});
*/
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

