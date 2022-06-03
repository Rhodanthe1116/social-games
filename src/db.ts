import mongoose from 'mongoose'

const uri = process.env.ATLAS_URI
if (!uri) {
  console.log('no atlas uri')
}
mongoose.connect(uri, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true,
})
const db = mongoose.connection
db.on('error', console.error.bind(console, 'connection error:'))
db.once('open', () => {
  console.log('MongoDB database connection established successfully')
})
