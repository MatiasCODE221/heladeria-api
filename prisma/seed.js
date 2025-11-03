
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const products = [
    { name: 'Helado de Chocolate', price: 200000, imageUrl: '', description: 'Cremoso y clásico.'},
    { name: 'Helado de Frutilla',  price: 200000, imageUrl: '', description: 'Refrescante.'},
    { name: 'Helado de Vainilla',  price: 200000, imageUrl: '', description: 'Suave y dulce.'},
    { name: 'Dulce de leche',      price: 220000, imageUrl: '', description: 'Favorito.'}
  ];
  for (const p of products) await prisma.product.create({ data: p });
  const toppings = [
    { name: 'Chips de chocolate', price: 30000 },
    { name: 'Maní', price: 20000 },
    { name: 'Frutilla picada', price: 25000 },
    { name: 'Salsa de caramelo', price: 20000 }
  ];
  for (const t of toppings) await prisma.topping.create({ data: t });
  const bcrypt = await import('bcryptjs');
  const hash = bcrypt.hashSync('admin123', 10);
  await prisma.user.create({ data: { name:'Administrador', email:'admin@frionatural.cl', passwordHash:hash, role:'ADMIN' } });
}
main().then(()=>console.log('Seed done')).catch(e=>{console.error(e);process.exit(1)}).finally(async()=>{await prisma.$disconnect()});
