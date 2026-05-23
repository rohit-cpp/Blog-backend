import mongoose, { Document, Schema } from "mongoose";

export interface Iuser extends Document{
    name: string;
    email: string;
    image: string;
    instagram: string;
    facebook: string;
    linkdin: string;
    bio: string;
}

const schema: Schema<Iuser> = new Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique:true
    },
    image: {
        type: String,
        required: true,
    },
    instagram: String,
    facebook: String,
    linkdin: String,
    bio:String,
}, {
    timestamps: true,
})

const User = mongoose.model<Iuser>("User", schema);

export default User;