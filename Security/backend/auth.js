import jwt from 'jsonwebtoken';
const secret = process.env.JWT_SECRET || 'dev-only-secret';
export function signUser(user){ 
  const data = {sub:user.id,role:user.role,consentVersion:user.consentVersion};
  return jwt.sign(data, secret, {expiresIn:'7d'}); 
}
export function auth(req,res,next){
  const header=req.headers.authorization || '';
  const token=header.startsWith('Bearer ') ? header.slice(7) : null;
  if(!token) return res.status(401).json({message:'Authentication required'});
  try { 
    req.user=jwt.verify(token,secret); 
    if(!req.user.consentVersion) return res.status(403).json({message:'Consent required'});
    next(); 
  } catch { return res.status(401).json({message:'Invalid or expired token'}); }
}
