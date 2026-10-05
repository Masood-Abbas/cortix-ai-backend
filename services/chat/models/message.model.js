import mongoose from "mongoose";

const filesSchema =new mongoose.Schema({
  name:String,
  content:String
},{
  _id:false
})

const artifactsSchema= new mongoose.Schema({
  id:Number,
  type:String,
  title:String,
  files:[filesSchema]
},{
  _id:false
})

const attachmentSchema = new mongoose.Schema({
  name:String,
  url:String,
  type:String
},{
  _id:false
})

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    role:{
        type:String,
        enum:["user","assistant"],
        required: true,
    },
    content:{
        type:String,
        required: true,
    },
    images:{
        type:[String],
    },
    artifacts:[artifactsSchema],
    files:[attachmentSchema]
  },
  { timestamps: true },
);
messageSchema.index({ conversationId: 1, createdAt: 1, _id: 1 });

const Message=mongoose.model("Message",messageSchema)
export default Message
