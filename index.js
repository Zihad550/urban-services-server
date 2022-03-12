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
    const electricianServicesCollection = database.collection("electricianServices");
    const workersCollection = database.collection("workers");
    const servicesCollection = database.collection('services')

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

    // get all workers
    app.get('/workers', async(req, res) => {
      const result = await workersCollection.find({}).toArray();
      res.json(result)
    })

    // get workers according to their role
    app.get('/workers/:role', async(req, res) => {
      console.log(req.params)
      const result = await workersCollection.find({category: req.params.role}).toArray();
      res.json(result)
    });

    


    // service methods
    // save service
    app.post('/services', async(req, res) => {
      const service = req.body;
      const result = await servicesCollection.insertOne(service);
      res.json(result)
    })

    // get electrician services
    app.get('/services/electricianServices', async(req, res) => {
      const result = await servicesCollection.find({category: 'electricianService'}).toArray()
      res.json(result)
    })

    // get plumber services
    app.get('/services/plumberServices', async(req, res) => {
      const result = await servicesCollection.find({category: 'plumberService'}).toArray();
      res.json(result);
    });

    // get chef services
    app.get('/services/chefServices', async(req, res) => {
      const result = await servicesCollection.find({category: 'chefService'}).toArray();
      res.json(result);
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
