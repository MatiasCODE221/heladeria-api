
import express from 'express';
import { prisma } from '../db.js';
import { authRequired, requireRole } from '../middleware.js';
const router = express.Router();
router.use(authRequired);
router.use(requireRole('ADMIN'));
router.get('/users', async (req,res)=>{
  const users = await prisma.user.findMany({ select:{ id:true, name:true, email:true, role:true } });
  res.json(users);
});
router.put('/users/:id/role', async (req,res)=>{
  const id = Number(req.params.id);
  const { role } = req.body;
  const user = await prisma.user.update({ where:{ id }, data:{ role } });
  res.json({ id:user.id, role:user.role });
});
router.get('/orders', async (req,res)=>{
  const orders = await prisma.order.findMany({ include:{ user:true } });
  res.json(orders);
});
router.patch('/orders/:id/status', async (req,res)=>{
  const id = Number(req.params.id);
  const { status } = req.body;
  const order = await prisma.order.update({ where:{ id }, data:{ status } });
  res.json(order);
});
export default router;
