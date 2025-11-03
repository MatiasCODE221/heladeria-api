
import express from 'express';
import { prisma } from '../db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
const router = express.Router();
router.post('/register', async (req,res)=>{
  const { name, email, password } = req.body;
  if (!name||!email||!password) return res.status(400).json({ error:'Datos incompletos' });
  const exists = await prisma.user.findUnique({ where:{ email } });
  if (exists) return res.status(409).json({ error:'El correo ya existe' });
  const passwordHash = bcrypt.hashSync(password,10);
  const user = await prisma.user.create({ data:{ name,email,passwordHash } });
  res.json({ id:user.id, name:user.name, email:user.email });
});
router.post('/login', async (req,res)=>{
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where:{ email } });
  if (!user) return res.status(401).json({ error:'Credenciales inválidas' });
  const ok = bcrypt.compareSync(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error:'Credenciales inválidas' });
  const token = jwt.sign({ sub:user.id, role:user.role, email:user.email }, process.env.JWT_SECRET, { expiresIn:'7d' });
  res.json({ token });
});
export default router;
