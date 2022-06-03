import { model, Schema } from 'mongoose'

interface IMessage {
  msg: string
  from: string
  timestamp: string
}
const messageSchema = new Schema<IMessage>({
  msg: String,
  from: String,
  timestamp: String,
})

const Message = model<IMessage>('Message', messageSchema)

export default Message
