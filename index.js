import express from 'express';
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import categoriesRoutes from "./BackEnd/routes/categories.js";
import authRoutes from "./BackEnd/routes/auth.js";
import favsRoutes from "./BackEnd/routes/favs.js";

const app = express();
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontEndRoot = path.join(__dirname, "FrontEnd");
const homePagePath = path.join(frontEndRoot, "html", "index.html");

app.use(cors());
app.use(express.json());

app.use(express.static(frontEndRoot));

app.get('/', (req, res) => {
  res.sendFile(homePagePath);
});

app.use("/api/categories", categoriesRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/favs", favsRoutes);


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
