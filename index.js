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


    // get electrician services
    app.get('/services/electricianServices', async(req, res) => {
      const result = await electricianServicesCollection.find({}).toArray();
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
