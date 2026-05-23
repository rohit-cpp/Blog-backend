import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";

export interface TokenUser {
    id: string;
    _id: string;
    name: string;
    email: string;
    image: string;
}

export interface AuthenticatedRequest extends Request{
    user?: TokenUser | null;
}

export const isAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction):Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer")) {
            res.status(401).json({
                message:"Please login - no auth errror"
            })
            return; 
        }

        const token = authHeader.split(" ")[1]
        
        if (!token) {
            res.status(401).json({
                message: "Invalid token format",
            });
            return;
        }
        
        const jwtSecret = process.env.JWT_SEC;
        
        if (!jwtSecret) {
            res.status(500).json({
                message: "Server configuration error",
            });
            return;
        }
        
        const decodeValue = jwt.verify(token, jwtSecret) as JwtPayload
        
        if (!decodeValue || !decodeValue.user) {
            res.status(401).json({
                message: "Invalid token",
            });
            return; 
        }

        req.user = decodeValue.user;
        next();
 } catch (error:any) {
    console.log("JWT verification error: ", error);
     res.status(400).json({
         message:"Please login - jwt error"
     })
 }   
}
