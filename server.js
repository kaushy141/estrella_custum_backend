const express = require("express");
const session = require("express-session");
const sessionConfig = require("./config/session");
const cors = require("cors");
const helmet = require("helmet");
const { initializeDatabase } = require("./config/database-init");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3002;

// Security middleware
app.use(helmet());
app.use(cors({ 
  origin: true,  // Allows all origins and supports credentials
  credentials: true 
}));

// Body parsing middleware
app.use(express.json());

app.use(express.urlencoded({ extended: true }));

// Session middleware (must be before routes)
app.use(session(sessionConfig));

// API routes
const apiRoutes = require("./routers/index-router");
app.use("/api/v1", apiRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    sessionId: req.sessionID,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Global error handler:", err);
  res.status(500).json({
    status: "error",
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : {},
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    status: "error",
    message: "Route not found",
  });
});

// Initialize database and start server
async function startServer() {
  try {
    // Initialize database first
    await initializeDatabase();

    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 Estrella Custom Backend server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔐 API endpoints: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Start the server
startServer();

module.exports = app;
