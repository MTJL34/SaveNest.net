import express from 'express';
import cors from "cors";
import dotenv from "dotenv";
import categoriesRoutes from "./BackEnd/routes/categories.js";
import authRoutes from "./BackEnd/routes/auth.js";
import favsRoutes from "./BackEnd/routes/favs.js";

const app = express();
dotenv.config();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello, Friend!');
});

app.use("/api/categories", categoriesRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/favs", favsRoutes);


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
