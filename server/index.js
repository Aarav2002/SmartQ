require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Socket.IO setup
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});
app.set('io', io);

// Socket.IO event handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Handle staff starting to serve a customer
  socket.on('startServing', (data) => {
    socket.broadcast.emit('customerBeingServed', data);
  });
  
  // Handle service time updates
  socket.on('updateServiceTime', (data) => {
    socket.broadcast.emit('serviceTimeUpdated', data);
  });
  
  // Handle service completion
  socket.on('completeService', (data) => {
    socket.broadcast.emit('serviceCompleted', data);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Placeholder for API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/providers', require('./routes/providers'));
app.use('/api/queue', require('./routes/queue'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/store', require('./routes/store'));

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.IO enabled for real-time communication`);
});


