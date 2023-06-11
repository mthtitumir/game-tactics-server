const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');;
require('dotenv').config();
const port = process.env.PORT || 5002;
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY);

//middleware
app.use(cors());
app.use(express.json());
// verify jwt 
const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' });
    }
    // split the token from authorization
    const token = authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: 'unauthorized access!' })
        }
        req.decoded = decoded;
        next();
    })
}
//mongodb codeblock
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
        const coursesCollection = client.db('gameTacticsDB').collection('courses');
        const cartCollection = client.db('gameTacticsDB').collection('carts');
        const paymentCollection = client.db('gameTacticsDB').collection('payments');
        // jwt token and verify
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '7d' });
            res.send({ token });
        })
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'admin') {
                return res.status(403).send({ error: true, message: 'forbidden access!' })
            }
            next();
        }
        const verifyInstructor = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'instructor') {
                return res.status(403).send({ error: true, message: 'forbidden access!' })
            }
            next();
        }
        // users api 
        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email };
            const oldUser = await usersCollection.findOne(query);
            if (oldUser) {
                return res.send({ message: 'user already exists here!' })
            }
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })
        app.get('/users', verifyJWT, async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result);
        })
        app.get('/users/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            if (req.decoded.email !== email) {
                res.send({ admin: false })
            }
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            const result = { admin: user?.role === 'admin' };
            res.send(result);
        })
        app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            if (req.decoded.email !== email) {
                res.send({ instructor: false })
            }
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            const result = { instructor: user?.role === 'instructor' };
            res.send(result);
        })

        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateRole = {
                $set: {
                    role: 'admin'
                },
            };
            const result = await usersCollection.updateOne(filter, updateRole);
            res.send(result);
        })
        app.patch('/users/instructor/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const updateRole = {
                $set: {
                    role: 'instructor'
                },
            };
            const result = await usersCollection.updateOne(query, updateRole);
            res.send(result);
        })

        // courses api 
        app.get('/courses', async (req, res) => {
            const result = await coursesCollection.find().toArray();
            res.send(result);
        })
        app.post('/courses', async (req, res) => {
            const course = req.body;
            // console.log(course);
            const result = await coursesCollection.insertOne(course);
            res.send(result);
        })
        // cart api
        app.get('/carts', verifyJWT, async (req, res) => {
            const email = req.query.email;
            if (!email) {
                res.send([]);
            }
            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ error: true, message: 'forbidden access' })
            }
            const query = { email: email };
            const result = await cartCollection.find(query).toArray();
            // console.log(result);
            res.send(result);
        })
        app.post('/carts', async (req, res) => {
            const item = req.body;
            const query = { classId: item.classId };
            const alreadyInCart = await cartCollection.findOne(query);
            if (alreadyInCart) {
                return res.send({ message: 'Class already selected!' })
            }
            const result = await cartCollection.insertOne(item);
            // console.log(result);
            res.send(result);
        })
        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await cartCollection.deleteOne(query);
            res.send(result);
        })
        // create payment intent
        app.post('/create-payment-intent', verifyJWT, async(req, res)=>{
            const {price} = req.body;
            // console.log(price);
            const amount = parseInt(price * 100);
            // console.log(amount);
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card'],

            });
            // console.log(paymentIntent.amount);
            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })
        app.post('/payments', verifyJWT, async (req, res)=>{
            const payment = req.body;
            const query = {_id: new ObjectId(payment._id)};
            console.log(payment);
            const updateStatus = {
                $set: {
                    paymentStatus: 'paid'
                }
            }
            const insertResult = await paymentCollection.insertOne(payment);
            const updateResult = await cartCollection.updateOne(query, updateStatus);
            res.send({insertResult, updateResult});
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