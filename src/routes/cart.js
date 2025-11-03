
import express from 'express';
import { prisma } from '../db.js';
import { authRequired } from '../middleware.js';
const router = express.Router();
async function getOrCreateCart(userId) {
  let cart = await prisma.order.findFirst({ where:{ userId, status:'CART' } });
  if (!cart) cart = await prisma.order.create({ data:{ userId, status:'CART' } });
  return cart;
}
router.use(authRequired);
router.get('/', async (req,res)=>{
  const cart = await getOrCreateCart(req.user.sub);
  const full = await prisma.order.findUnique({ where:{ id:cart.id }, include:{ items:{ include:{ product:true, toppings:{ include:{ topping:true } } } } } });
  res.json(full);
});
router.post('/items', async (req,res)=>{
  const userId = req.user.sub;
  const { productId, quantity=1, baseFlavor=null, notes=null, toppingIds=[] } = req.body;
  const cart = await getOrCreateCart(userId);
  const product = await prisma.product.findUnique({ where:{ id:productId } });
  if (!product) return res.status(404).json({ error:'Producto no encontrado' });
  const item = await prisma.orderItem.create({ data:{ orderId:cart.id, productId, quantity, baseFlavor, notes } });
  for (const tid of toppingIds) await prisma.orderItemTopping.create({ data:{ orderItemId:item.id, toppingId:tid } });
  await recomputeOrderTotal(cart.id);
  const updated = await prisma.order.findUnique({ where:{ id:cart.id }, include:{ items:{ include:{ product:true, toppings:{ include:{ topping:true } } } } } });
  res.json(updated);
});
router.post('/checkout', async (req,res)=>{
  const cart = await getOrCreateCart(req.user.sub);
  await recomputeOrderTotal(cart.id);
  const order = await prisma.order.update({ where:{ id:cart.id }, data:{ status:'PENDING' } });
  res.json(order);
});
async function recomputeOrderTotal(orderId){
  const items = await prisma.orderItem.findMany({ where:{ orderId }, include:{ product:true, toppings:{ include:{ topping:true } } } });
  let total = 0;
  for (const it of items){
    const toppingsSum = it.toppings.reduce((s,t)=>s + t.topping.price, 0);
    const line = (it.product.price + toppingsSum) * it.quantity;
    await prisma.orderItem.update({ where:{ id:it.id }, data:{ lineTotal:line } });
    total += line;
  }
  await prisma.order.update({ where:{ id:orderId }, data:{ total } });
}
export default router;
