const dotenv = require("dotenv");
dotenv.config();

const http = require("http");
const mongoose = require("mongoose");
const app = require("./app");

// Stop early with a clear message if a setting is missing
for (const key of ["MONGODB_URI", "JWT_SECRET"]) {
  if (!process.env[key]) {
    console.error(
      `Missing ${key} in .env. Copy .env.example to .env and fill it in.`,
    );
    process.exit(1);
  }
}

const port = process.env.PORT || 3000;

// An HTTP server (not app.listen) so the Notifications service can attach Socket.io here
const server = http.createServer(app);

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log(`Connected to MongoDB ${mongoose.connection.name}.`);
    server.listen(port, () => {
      console.log(`The eBeba API is ready on port ${port}!`);
    });
  })
  .catch((err) => {
    console.error("Could not connect to MongoDB:", err.message);
    process.exit(1);
  });
