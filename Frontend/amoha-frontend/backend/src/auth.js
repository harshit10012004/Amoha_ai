import jwt from 'jsonwebtoken';
const secret = process.env.JWT_SECRET || 'dev-only-secret';
export function signUser(user){ return jwt.sign({sub:user.id,role:user.role}, secret, {expiresIn:'7d'}); }
export function auth(req,res,next){
  const header=req.headers.authorization || '';
  const token=header.startsWith('Bearer ') ? header.slice(7) : null;
  if(!token) return res.status(401).json({message:'Authentication required'});
  try { req.user=jwt.verify(token,secret); next(); } catch { return res.status(401).json({message:'Invalid or expired token'}); }
}
