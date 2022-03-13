const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
require("dotenv").config();
const app = express();
const ObjectId = require("mongodb").ObjectId;
const fileUpload = require("express-fileupload");

const port = process.env.PORT || 8000;

// middle ware


app.use(cors());
app.use(express.json());
app.use(fileUpload());

// mongo client
const client = new MongoClient(process.env.URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function run() {
  try {
    await client.connect();
    const database = client.db("urbanServices");
    const usersCollection = database.collection("users");
    const workersCollection = database.collection("workers");
    const servicesCollection = database.collection('services');
    const hiredCollection = database.collection('hired')

    // user routes
    // check if the user is admin
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email });
      res.json(user);
    });
    // post user
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.json(result);
    });

    // update user
    app.put("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.updateOne(
        { email: user.email },
        { $set: user },
        { upsert: true }
      );
      res.json(result);
    });

    // update user to admin
    app.put("/users/admin", async (req, res) => {
      const user = req.body;
      const filter = { email: user.email };
      const updateDoc = { $set: { role: "admin" } };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.json(result);
    });


    // worker methods
    // add worker
    app.post('/workers', async(req, res) => {
      const worker = req.body;
      const result = await workersCollection.insertOne(worker);
      res.json(result)
    })

    // get worker
    app.get('/worker/:id', async(req, res) => {
      console.log(req.params)
      const result = await workersCollection.findOne({_id:ObjectId(req.params.id)});
      res.json(result)
    })

    // get workers with role
    app.get('/workers/:role', async(req, res) => {
      console.log(req.params)
      const result = await workersCollection.find({category: req.params.role}).toArray();
      res.json(result)
    })

    // delete worker
    app.delete('/workers', async(req, res) => {
      const result = await workersCollection.deleteOne({_id: ObjectId(req.query.id)});
      res.json(result)
    })

    


    // service methods
    // save service
    app.post('/services', async(req, res) => {
      const service = req.body;
      const result = await servicesCollection.insertOne(service);
      res.json(result)
    })

    // get electrician services
    /* 
    1. electricianServices
    2. plumberServices
    3. chefServices
     */
    app.get('/services/:service', async(req, res) => {
      const result = await servicesCollection.find({category: req.params.service}).toArray()
      res.json(result)
    })

    // delete service
    app.delete('/services', async(req, res) => {
      const result = await servicesCollection.deleteOne({_id: ObjectId(req.query.id)});
      res.json(result)
    })


    // hire route
    app.post('/hired', async(req, res) => {
      const hired = req.body;
      const result = await hiredCollection.insertOne(hired);
      res.json(result)
    })

    // get booked workers & tolets
    app.get('/hired', async(req, res) => {
      const result = await hiredCollection.find({customerEmail: req.query.email}).toArray();
      res.json(result)
    })
    

    
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Welcome to Urban services server");
});

app.listen(port, () => {
  console.log("port running at localhost:", port);
});
