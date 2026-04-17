import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoute from "./src/features/auth/auth.route.js";
import postRoute from "./routes/post.route.js";
import testRoute from "./routes/test.route.js";
import userRoute from "./routes/user.route.js";
import chatRoute from "./src/features/chat/chat.route.js";
import messageRoute from "./src/features/messages/message.route.js";
import inquiryRoute from "./src/features/inquiry/inquiry.route.js";
import reportRoute from "./src/features/report/report.route.js";
import sakithChatRoute from "./src/features/sakithChat/sakithChat.route.js";
import { initSocketServer } from "./src/shared/lib/socket.js";
import boardingRoutes from './routes/boardingRoutes.js';


const app = express();
const port = process.env.PORT || 8800;
const server = http.createServer(app);

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoute);
app.use("/api/users", userRoute);
app.use("/api/posts", postRoute);
app.use("/api/test", testRoute);
app.use("/api/chats", chatRoute);
app.use("/api/messages", messageRoute);
app.use("/api/inquiry", inquiryRoute);
app.use("/api/report", reportRoute);
app.use("/api/sakith-chat", sakithChatRoute);
app.use('/api/boardings', boardingRoutes);

initSocketServer(server, process.env.CLIENT_URL);

server.listen(port, () => {
  console.log(`Server is running on port ${port}!`);
});
