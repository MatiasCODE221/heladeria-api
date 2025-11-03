
import express from 'express';
import { prisma } from '../db.js';
import { authRequired, requireRole } from '../middleware.js';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

const router = express.Router();
router.use(authRequired);
router.use(requireRole('ADMIN'));

async function getSales({ from, to, productId, userId }) {
  const orderWhere = { status: { in: ['PREPARATION','ON_THE_WAY','DELIVERED'] } };
  if (from || to) {
    orderWhere.createdAt = {};
    if (from) orderWhere.createdAt.gte = new Date(from);
    if (to) orderWhere.createdAt.lte = new Date(to);
  }
  const itemWhere = { order: orderWhere };
  if (productId) itemWhere.productId = Number(productId);
  if (userId) itemWhere.order = { ...itemWhere.order, userId: Number(userId) };

  const items = await prisma.orderItem.findMany({
    where: itemWhere,
    include: { product: true, order: true },
  });
  return items.map(it => ({
    date: it.order.createdAt,
    productId: it.productId,
    product: it.product.name,
    userId: it.order.userId,
    units: it.quantity,
    total: it.lineTotal,
  }));
}

router.get('/sales', async (req, res) => {
  const { from, to, productId, userId, groupBy } = req.query;
  const rows = await getSales({ from, to, productId, userId });
  if (!groupBy || groupBy === 'none') return res.json(rows);

  const groupKey = (d) => {
    const dt = new Date(d);
    if (groupBy === 'day') return dt.toISOString().slice(0,10);
    if (groupBy === 'month') return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth()+1).padStart(2,'0')}`;
    return 'all';
  };
  const agg = {};
  for (const r of rows) {
    const key = groupKey(r.date);
    if (!agg[key]) agg[key] = { period: key, units: 0, total: 0 };
    agg[key].units += r.units;
    agg[key].total += r.total;
  }
  const result = Object.values(agg).sort((a,b)=>a.period.localeCompare(b.period));
  res.json(result);
});

router.get('/sales.xlsx', async (req, res) => {
  const { from, to, productId, userId, groupBy } = req.query;
  const rows = await getSales({ from, to, productId, userId });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Ventas');

  if (!groupBy || groupBy === 'none') {
    ws.columns = [
      { header: 'Fecha', key: 'date', width: 20 },
      { header: 'Producto', key: 'product', width: 30 },
      { header: 'Usuario (ID)', key: 'userId', width: 12 },
      { header: 'Unidades', key: 'units', width: 12 },
      { header: 'Total (CLP)', key: 'total', width: 15 },
    ];
    rows.forEach(r => ws.addRow({
      date: new Date(r.date).toISOString().slice(0,10),
      product: r.product,
      userId: r.userId,
      units: r.units,
      total: r.total,
    }));
  } else {
    const groupKey = (d) => {
      const dt = new Date(d);
      if (groupBy === 'day') return dt.toISOString().slice(0,10);
      if (groupBy === 'month') return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth()+1).padStart(2,'0')}`;
      return 'all';
    };
    const agg = {};
    rows.forEach(r => {
      const k = groupKey(r.date);
      if (!agg[k]) agg[k] = { period:k, units:0, total:0 };
      agg[k].units += r.units;
      agg[k].total += r.total;
    });
    ws.columns = [
      { header: groupBy==='day'?'Día':'Mes', key: 'period', width: 12 },
      { header: 'Unidades', key: 'units', width: 12 },
      { header: 'Total (CLP)', key: 'total', width: 15 },
    ];
    Object.values(agg).sort((a,b)=>a.period.localeCompare(b.period)).forEach(r => ws.addRow(r));
  }

  res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition','attachment; filename="reporte_ventas.xlsx"');
  await wb.xlsx.write(res);
  res.end();
});

router.get('/sales.pdf', async (req, res) => {
  const { from, to, productId, userId, groupBy } = req.query;
  const rows = await getSales({ from, to, productId, userId });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="reporte_ventas.pdf"');

  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  doc.pipe(res);
  doc.fontSize(20).text('Reporte de Ventas', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).text(`Rango: ${from || '—'} a ${to || '—'}`, { align: 'center' });
  doc.moveDown();

  const colX = [40, 160, 360, 460];
  if (!groupBy || groupBy === 'none') {
    const headers = ['Fecha', 'Producto', 'Unidades', 'Total (CLP)'];
    doc.fontSize(12);
    headers.forEach((h, i) => doc.text(h, colX[i], doc.y, { continued: i < headers.length-1 }));
    doc.moveDown(0.5); doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke(); doc.fontSize(10);
    rows.forEach(r => {
      const y = doc.y + 4;
      doc.text(new Date(r.date).toISOString().slice(0,10), colX[0], y, { continued: true });
      doc.text(r.product, colX[1], y, { width: 180, continued: true });
      doc.text(String(r.units), colX[2], y, { width: 80, align: 'right', continued: true });
      doc.text(String(r.total), colX[3], y, { width: 100, align: 'right' });
      doc.moveDown(0.3);
    });
  } else {
    const header = groupBy==='day' ? 'Día' : 'Mes';
    const headers = [header, 'Unidades', 'Total (CLP)'];
    const gx = [40, 360, 460];
    doc.fontSize(12);
    headers.forEach((h,i)=> doc.text(h, gx[i], doc.y, { continued: i<headers.length-1 }));
    doc.moveDown(0.5); doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke(); doc.fontSize(10);
    const groupKey = (d) => {
      const dt = new Date(d);
      if (groupBy === 'day') return dt.toISOString().slice(0,10);
      if (groupBy === 'month') return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth()+1).padStart(2,'0')}`;
      return 'all';
    };
    const agg = {};
    rows.forEach(r => {
      const k = groupKey(r.date);
      if (!agg[k]) agg[k] = { period:k, units:0, total:0 };
      agg[k].units += r.units;
      agg[k].total += r.total;
    });
    Object.values(agg).sort((a,b)=>a.period.localeCompare(b.period)).forEach(r=>{
      const y = doc.y + 4;
      doc.text(r.period, gx[0], y, { continued: true });
      doc.text(String(r.units), gx[1], y, { width: 80, align: 'right', continued: true });
      doc.text(String(r.total), gx[2], y, { width: 100, align: 'right' });
      doc.moveDown(0.3);
    });
  }
  doc.end();
});
export default router;
