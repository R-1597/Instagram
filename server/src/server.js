// const app = require("./app");

// const PORT = process.env.PORT || 5000;

// app.listen(PORT, () => {
//   console.log(`Server running at http://localhost:${PORT}`);
// });


// require("dotenv").config();

// const app = require("./app");
// const connectDB = require("./config/db");

// const PORT = process.env.PORT || 5000;

// async function startServer() {
//   try {
//     await connectDB();

//     app.listen(PORT, () => {
//       console.log(`Server running at http://localhost:${PORT}`);
//     });
//   } catch (error) {
//     console.error("Startup failed:", error.message);
//     process.exit(1);
//   }
// }

// startServer();




require("dotenv").config();

const http = require("http");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");

const app = require("./app");
const connectDB = require("./config/db");

// Create one HTTP server for Express and Socket.IO.
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        credentials: true,
    },
});

// Authenticate Socket.IO connections using JWT.
io.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
        return next(new Error("Authentication required"));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, {
            issuer: "instagram-clone-api",
            audience: "instagram-clone-client",
        });

        const userId = decoded.userId || decoded.id || decoded._id;

        if (!userId) {
            return next(new Error("Invalid token"));
        }

        socket.userId = String(userId);
        next();
    } catch (error) {
        next(new Error("Invalid or expired token"));
    }
});

// Handle connected users.
const connectedUsers = new Map();

io.on("connection", (socket) => {
    const userId = socket.userId;
    const userRoom = `user:${userId}`;

    socket.join(userRoom);
    connectedUsers.set(socket.id, userId);

    console.log(`Socket connected for user: ${userId}`);

    socket.on("disconnect", () => {
        connectedUsers.delete(socket.id);
        console.log(`Socket disconnected for user: ${userId}`);
    });
});

// Make Socket.IO available to Express routes/controllers.
app.set("io", io);

const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        // Ensure the database is connected before accepting requests.
        await connectDB();

        server.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
            console.log("Socket.IO is ready");
        });
    } catch (error) {
        console.error("Startup failed:", error.message);
        process.exit(1);
    }
}

startServer();

