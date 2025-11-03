
import express from 'express';
import { prisma } from '../db.js';
import { authRequired } from '../middleware.js';
const router = express.Router();
router.use(authRequired);
router.post('/', async (req,res)=>{
  const { orderId, method='Tarjeta' } = req.body;
  const order = await prisma.order.findUnique({ where:{ id:Number(orderId) } });
  if (!order) return res.status(404).json({ error:'Pedido no existe' });
  if (order.userId !== req.user.sub) return res.status(403).json({ error:'No autorizado' });
  if (order.status !== 'PENDING') return res.status(400).json({ error:'Pedido no está listo para pago' });
  const payment = await prisma.payment.create({ data:{ orderId:order.id, amount:order.total, status:'PAID', method } });
  await prisma.order.update({ where:{ id:order.id }, data:{ status:'PREPARATION' } });
  res.json(payment);
});
export default router;
