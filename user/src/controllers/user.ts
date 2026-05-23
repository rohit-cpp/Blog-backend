import User from "../model/User.js";
import jwt from "jsonwebtoken";
import TryCatch from "../utils/TryCatch.js";
import type { AuthenticatedRequest } from "../middleware/isAuth.js";
import { v2 as cloudinary } from "cloudinary";
import getBuffer from "../utils/dataUrI.js";
import { oauthClient } from "../utils/GoogleConfig.js";
import axios from "axios";
import { loginSchema, updateUserSchema } from "../schemas/user.js";
import { ValidationError, NotFoundError } from "../utils/errors.js";



export const loginUser = TryCatch(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new ValidationError(parsed.error.issues.map((e: { message: string }) => e.message).join("; "));
    }
    const { code } = parsed.data;

    const googleRes = await oauthClient.getToken(code);
    
    oauthClient.setCredentials(googleRes.tokens)

    const userRes = await axios.get(`https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${googleRes.tokens.access_token}`)
    const { email, name, picture } = userRes.data;
 
    let user = await User.findOne({ email })
    if (!user) {
        try {
            user = await User.create({
                name,
                email,
                image: picture,
            });
        } catch (err: any) {
            if (err?.code === 11000) {
                user = await User.findOne({ email });
            } else {
                throw err;
            }
        }
    }

    if (!user) {
        throw new Error("Login failed");
    }

    const tokenPayload = {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        image: user.image,
    };
    const token = jwt.sign({ user: tokenPayload }, process.env.JWT_SEC as string, {
        expiresIn: "5d",
    });

    res.status(200).json({
        message: "Login Success",
        token,
        user,
    });
});
    
export const myProfile = TryCatch(async (req: AuthenticatedRequest, res) => {
    const user = await User.findById(req.user?._id);
    if (!user) {
        throw new NotFoundError("User");
    }
    res.json(user);
});

export const getUserProfile = TryCatch(async (req, res) => {
    const user = await User.findById(req.params.id)

    if (!user) {
        throw new NotFoundError("User");
    }
    res.json(user)
})

export const updateUser = TryCatch(async (req: AuthenticatedRequest, res) => {
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new ValidationError(parsed.error.issues.map((e: { message: string }) => e.message).join("; "));
    }
    const { name, instagram, facebook, linkdin, bio } = parsed.data;

    const user = await User.findByIdAndUpdate(req.user?._id, {
        name,
        instagram,
        facebook,
        linkdin,
        bio,
    }, { new: true }
    );

    if (!user) {
        throw new NotFoundError("User");
    }

    const tokenPayload = {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        image: user.image,
    };
    const token = jwt.sign({ user: tokenPayload }, process.env.JWT_SEC as string, {
        expiresIn: "5d"
    });
    res.json({
        message: "User Updated",
        token,
        user,
    })
})

export const updateProfilePic = TryCatch(async (req: AuthenticatedRequest, res) => {
    const file = req.file
    
    if (!file) {
        throw new ValidationError("No file to upload");
    }

    const fileBuffer = getBuffer(file)
    if (!fileBuffer || !fileBuffer.content) {
        throw new ValidationError("Failed to process file");
    }
    const cloud = await cloudinary.uploader.upload(fileBuffer.content, {
        folder: "blogs",
    });

    const user = await User.findByIdAndUpdate(req.user?._id, {
        image: cloud.secure_url
    }, {
        new: true
    });

    if (!user) {
        throw new NotFoundError("User");
    }

    const tokenPayload = {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        image: user.image,
    };
    const token = jwt.sign({ user: tokenPayload }, process.env.JWT_SEC as string, {
        expiresIn: "5d"
    });
    res.json({
        message: "User Profile pic updated",
        token,
        user,
    })
})