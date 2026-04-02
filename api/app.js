import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoute from "./src/features/auth/auth.route.js";
import postRoute from "./routes/post.route.js";
import testRoute from "./routes/test.route.js";
import userRoute from "./routes/user.route.js";
import chatRoute from "./src/features/chat/chat.route.js";
import messageRoute from "./src/features/messages/message.route.js";

const app = express();
const port = process.env.PORT || 8800;

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoute);
app.use("/api/users", userRoute);
app.use("/api/posts", postRoute);
app.use("/api/test", testRoute);
app.use("/api/chats", chatRoute);
app.use("/api/messages", messageRoute);
app.use("/api/inquiry", require("./features/inquiry/inquiry.route"));
app.use("/api/report", require("./features/report/report.route"));
app.use("/api/sakith-chat", require("./features/sakithChat/sakithChat.route"));


app.listen(port, () => {
  console.log(`Server is running on port ${port}!`);
});
