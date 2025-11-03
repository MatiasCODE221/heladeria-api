
import jwt from 'jsonwebtoken';
export function authRequired(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { return res.status(401).json({ error: 'Token inválido' }); }
}
export function requireRole(role) {
  return (req,res,next)=>{
    if (!req.user || req.user.role !== role) return res.status(403).json({ error: 'No autorizado' });
    next();
  };
}
