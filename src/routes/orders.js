
import express from 'express';
import { prisma } from '../db.js';
import { authRequired } from '../middleware.js';
const router = express.Router();
router.use(authRequired);
router.get('/:id', async (req,res)=>{
  const id = Number(req.params.id);
  const order = await prisma.order.findUnique({ where:{ id }, include:{ items:{ include:{ product:true, toppings:{ include:{ topping:true } } } }, payment:true } });
  if (!order) return res.status(404).json({ error:'Pedido no existe' });
  if (order.userId !== req.user.sub) return res.status(403).json({ error:'No autorizado' });
  res.json(order);
});
router.get('/:id/status', async (req,res)=>{
  const id = Number(req.params.id);
  const order = await prisma.order.findUnique({ where:{ id } });
  if (!order) return res.status(404).json({ error:'Pedido no existe' });
  if (order.userId !== req.user.sub) return res.status(403).json({ error:'No autorizado' });
  res.json({ status: order.status });
});
router.get('/:id/receipt', async (req,res)=>{
  const id = Number(req.params.id);
  const order = await prisma.order.findUnique({ where:{ id }, include:{ items:{ include:{ product:true } }, payment:true, user:true } });
  if (!order) return res.status(404).json({ error:'Pedido no existe' });
  if (order.userId !== req.user.sub) return res.status(403).json({ error:'No autorizado' });
  const receipt = { tienda:'Heladería Frío Natural', cliente:order.user.name, fecha:new Date(order.createdAt).toISOString(), totalCLP:order.total, items:order.items.map(it=>({ producto:it.product.name, cantidad:it.quantity, subtotal:it.lineTotal })) };
  res.json(receipt);
});
export default router;
