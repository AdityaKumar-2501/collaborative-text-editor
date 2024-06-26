const { Server } = require("socket.io");
const express = require('express')
const { createServer } = require("http");
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require("dotenv");

dotenv.config();

// Connect to MongoDB
// async function connectToDatabase() {
//     try {
//         await mongoose.connect(process.env.MONGODB_CONNECT_URI);
//         console.log('Connected to MongoDB');
//     } catch (error) {
//         console.error('Error connecting to MongoDB:', error);
//     }
// }
const db = process.env.MONGODB_CONNECT_URI
mongoose
  .connect(db)
  .then((con) => {
    console.log("Connected Successfully");
  })
  .catch((err) => {
    console.log(err);
  });


// Call the function to establish the connection
// connectToDatabase();

const schema = mongoose.Schema;

const documentSchema = new schema({
    _id: String,
    data : Object
});

const Document = mongoose.model('Document', documentSchema);

const app = express();
app.use(cors())

// Set the MIME type for JavaScript files explicitly
app.use((req, res, next) => {
    if (req.url.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
    next();
});


  

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*"
    }
});
const port = process.env.PORT || 8080;

io.on("connection", (socket) => {
    socket.on("get-document", async (documentId) => {
        const document = await findOrCreate(documentId)
        socket.join(documentId);
        socket.emit("load-document", document.data )
        socket.on("send-changes", (delta) => {
            socket.broadcast.to(documentId).emit("receive-changes", delta);
        })
        socket.on("save-data", async (data) => {
            await Document.findByIdAndUpdate(documentId, {data})
        })
    })
});


async function findOrCreate(id){
    if(id == null)return
    const result = await Document.findById(id);
    if(result) return result
    else{
        return await Document.create({
            _id : id,
            data: {}
        })
    }
}


httpServer.listen(port, () => {
    console.log(`Server running on port ${port}`);
});