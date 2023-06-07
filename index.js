const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');;
require('dotenv').config();
const port = process.env.PORT || 5002;

//middleware
app.use(cors());
app.use(express.json());
//mongodb codeblock

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASS}@cluster0.xx7c7ta.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

//mongodb codeblock

app.get('/', (req, res) => {
    res.send('Game Tactics server is running!');
})
app.listen(port, () => {
    console.log(`Game Tactics server is running at port ${port}`);
})