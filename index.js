const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');;
require('dotenv').config();
const port = process.env.PORT || 5002;

//middleware
app.use(cors());
app.use(express.json());
// verify jwt 
const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if(!authorization){
        return res.status(401).send({error: true, message: 'unauthorized access'});
    }
    // split the token from authorization
    const token = authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
        if(error){
            return res.status(401).send({error: true, message: 'unauthorized access!'})
        }
        req.decoded = decoded;
        next();
    })
}
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
        const usersCollection = client.db('gameTacticsDB').collection('users');
        // jwt token post method 
        app.post('/jwt', (req, res)=>{
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '7d'});
            res.send({token});
        })
        // users api 
        app.post('/users', async(req, res)=>{
            const user = req.body;
            const query = {email: user.email};
            const oldUser = await usersCollection.findOne(query);
            if (oldUser){
                return res.send({message: 'user already exists here!'})
            }
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })
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