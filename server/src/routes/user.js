import express from 'express';
import { getProfile, registerUser } from '../controllers/user.js';
const router = express.Router();


router.post('/register', registerUser);
router.get('/user/:id', getProfile);

export default router;