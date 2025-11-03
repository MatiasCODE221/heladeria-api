
import express from 'express';
import { prisma } from '../db.js';
const router = express.Router();
router.get('/products', async (req,res)=>{
  const products = await prisma.product.findMany({ where:{ isActive:true } });
  res.json(products);
});
router.get('/toppings', async (req,res)=>{
  const toppings = await prisma.topping.findMany();
  res.json(toppings);
});
export default router;
