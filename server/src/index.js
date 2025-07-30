import express from 'express';
import userRoutes from './routes/user.js';
const app = express();
app.use(express.json());
import dotenv from 'dotenv';
import connect from './db/connect.js';
connect()
dotenv.config()
const PORT = process.env.PORT || 8080;

app.use(userRoutes)
app.listen(PORT, ()=> {
    console.log(`Server is running on http://localhost:${PORT}`);
})