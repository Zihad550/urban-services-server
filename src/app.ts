import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import fileUpload from "express-fileupload";
import admin, { ServiceAccount } from "firebase-admin";
import serviceAccount from "../service-account.json";
import config from "./app/config";
import auth from "./app/middlewares/auth";
import useMongoId from "./app/utils/useMongoId";
import catchAsync from "./app/utils/catchAsync";

const app = express();

const port = config.port || 8000;

//  firebase admin initialization
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as ServiceAccount),
});

// middle ware
app.use(cors());
app.use(express.json());
app.use(fileUpload());

// mongo client
const client = new MongoClient(config.uri);

// verify user with id token

async function run() {
  try {
    await client.connect();
    const database = client.db("urbanServices");
    const usersCollection = database.collection("users");
    const workersCollection = database.collection("workers");
    const servicesCollection = database.collection("services");
    const hiredCollection = database.collection("hired");
    const jobApplicationsCollection = database.collection("jobApplications");
    const messagesCollection = database.collection("messages");

    // user routes
    // get saved user
    app.get(
      "/users/:email",
      catchAsync(async (req, res) => {
        const email = req.params.email;
        const user = await usersCollection.findOne({ email });
        res.json(user);
      }),
    );
    // post user
    app.post(
      "/users",
      catchAsync(async (req, res) => {
        const user = req.body;
        const result = await usersCollection.insertOne({
          ...user,
          role: "user",
        });
        res.json(result);
      }),
    );

    // update user
    app.put(
      "/users",
      catchAsync(async (req, res) => {
        const user = req.body;
        const getUser = await usersCollection.findOne({ email: user.email });
        let result;
        if (getUser && getUser.role) {
          result = await usersCollection.updateOne(
            { email: user.email },
            { $set: user },
            { upsert: true },
          );
        } else {
          result = await usersCollection.updateOne(
            { email: user.email },
            { $set: { ...user, role: "user" } },
            { upsert: true },
          );
        }
        res.json(result);
      }),
    );

    // update user to admin
    app.put(
      "/users/admin",
      catchAsync(async (req, res) => {
        const user = req.body;
        const filter = { email: user.email };
        const updateDoc = { $set: { role: "admin" } };
        const result = await usersCollection.updateOne(filter, updateDoc);
        res.json(result);
      }),
    );

    // get all users
    app.get(
      "/users",
      catchAsync(async (req, res) => {
        const result = await usersCollection.find({}).toArray();
        res.json(result);
      }),
    );

    // worker methods
    // add worker
    app.post(
      "/workers",
      catchAsync(async (req, res) => {
        const worker = req.body;
        const result = await workersCollection.insertOne(worker);
        res.json(result);
      }),
    );

    // get worker
    app.get(
      "/worker/:id",
      catchAsync(async (req, res) => {
        const result = await workersCollection.findOne({
          _id: useMongoId(req.params.id),
        });
        res.json(result);
      }),
    );

    // get available workers with role & free workers & tolets
    app.get(
      "/workers",
      catchAsync(async (req, res) => {
        let result;
        if (req.query.role === "undefined" && req.query.filter === "") {
          result = await workersCollection
            .find({ category: { $ne: "toLet" } })
            .toArray();
        } else if (req.query.role === "undefined" && req.query.filter) {
          result = await workersCollection
            .find({
              $and: [
                { category: { $ne: "toLet" } },
                {
                  $or: [
                    { skill: req.query.filter },
                    { workingStatus: req.query.filter },
                  ],
                },
              ],
            })
            .toArray();
        } else if (req.query.role === "toLet") {
          result = await workersCollection
            .find({
              $and: [{ applicationStatus: "Approved" }, { category: "toLet" }],
            })
            .toArray();
        } else if (req.query.role !== "toLet" && req.query.filter === "") {
          result = await workersCollection
            .find({ category: req.query.role })
            .toArray();
        } else {
          result = await workersCollection
            .find({
              $and: [
                { category: req.query.role },
                {
                  $or: [
                    { skill: req.query.filter },
                    { workingStatus: req.query.filter },
                  ],
                },
              ],
            })
            .toArray();
        }
        res.json(result);
      }),
    );

    // get workers for admins
    app.get(
      "/workers/:role",
      catchAsync(async (req, res) => {
        const result = await workersCollection
          .find({ category: req.params.role })
          .toArray();
        res.json(result);
      }),
    );

    // delete worker
    app.delete(
      "/workers",
      catchAsync(async (req, res) => {
        const result = await workersCollection.deleteOne({
          email: req.query.email,
        });
        const result2 = await usersCollection.deleteOne({
          email: req.query.email,
        });
        res.json({ ...result });
      }),
    );

    // working status
    app.put(
      "/workingStatus",
      catchAsync(async (req, res) => {
        const { email, status, id } = req.body;
        let result1;
        if (
          status === "Working" ||
          status === "Not Working" ||
          status === "Busy"
        ) {
          result1 = await workersCollection.updateOne(
            { email },
            { $set: { workingStatus: "Busy" } },
          );
        } else {
          result1 = await workersCollection.updateOne(
            { email },
            { $set: { workingStatus: "Free" } },
          );
        }
        const result2 = await hiredCollection.updateOne(
          { _id: useMongoId(id) },
          { $set: { workingStatus: status } },
        );
        res.json({ message: "Updated" });
      }),
    );

    // all workers
    app.get(
      "/allWorkers",
      catchAsync(async (req, res) => {
        const result = await workersCollection.find({}).toArray();
        res.json(result);
      }),
    );

    // service methods
    // save service
    app.post(
      "/services",
      catchAsync(async (req, res) => {
        const service = req.body;
        const result = await servicesCollection.insertOne(service);
        res.json(result);
      }),
    );

    // get electrician services
    /*
    1. electricianServices
    2. plumberServices
    3. chefServices
     */
    app.get(
      "/services/:service",
      catchAsync(async (req, res) => {
        const result = await servicesCollection
          .find({ category: req.params.service })
          .toArray();
        res.json(result);
      }),
    );

    // delete service
    app.delete(
      "/services",
      catchAsync(async (req, res) => {
        const id = req.query.id;
        if (!id || typeof id !== "string") throw new Error("id not found!");
        const result = await servicesCollection.deleteOne({
          _id: useMongoId(id),
        });
        res.json(result);
      }),
    );

    // hire route
    app.post(
      "/hired",
      catchAsync(async (req, res) => {
        const hired = req.body;
        const result = await hiredCollection.insertOne(hired);
        res.json(result);
      }),
    );

    // get booked workers for customers
    app.get(
      "/hired",
      catchAsync(async (req, res) => {
        const result = await hiredCollection
          .find({ customerEmail: req.query.email })
          .toArray();
        res.json(result);
      }),
    );

    // get all hired workers
    app.get(
      "/allHiredWorkers",
      catchAsync(async (req, res) => {
        const result = await hiredCollection.find({}).toArray();
        res.json(result);
      }),
    );

    // save job application
    app.post(
      "/apply",
      catchAsync(async (req, res) => {
        const application = req.body;
        const result = await jobApplicationsCollection.insertOne(application);
        res.json(result);
      }),
    );

    // job applications
    app.get(
      "/applications",
      catchAsync(async (req, res) => {
        const applications = await jobApplicationsCollection
          .find({ applicationStatus: "applied" })
          .toArray();
        res.json(applications);
      }),
    );

    // update application status
    app.put(
      "/application",
      catchAsync(async (req, res) => {
        const worker = req.body;
        const {
          name,
          email,
          phone,
          location,
          experience,
          skill,
          category,
          src,
          workingStatus,
        } = worker;
        const result1 = await jobApplicationsCollection.updateOne(
          { email: worker.email },
          { $set: { applicationStatus: "approved" } },
        );
        let result2;
        let result3;
        if (result1.modifiedCount > 0) {
          result2 = await usersCollection.updateOne(
            { email: worker.email },
            { $set: { role: "worker" } },
          );
          result3 = await workersCollection.updateOne(
            { email: worker.email },
            {
              $set: {
                name,
                email,
                phone,
                location,
                experience,
                skill,
                category,
                src,
                workingStatus: "Free",
              },
            },
            { upsert: true },
          );
        }
        res.json({ ...result1, ...result2, ...result3 });
      }),
    );

    // delete application
    app.delete(
      "/application",
      catchAsync(async (req, res) => {
        const email = req.query.email;
        const result1 = await jobApplicationsCollection.deleteOne({ email });
        res.json({ ...result1 });
      }),
    );

    // work routes
    // handle complete work
    app.put(
      "/complete",
      catchAsync(async (req, res) => {
        const result = await hiredCollection.updateOne(
          { _id: useMongoId(req.body.id) },
          { $set: { workingProgress: "100%" } },
        );
        res.json(result);
      }),
    );

    // work request
    app.get(
      "/work",
      auth(),
      catchAsync(async (req, res) => {
        if (req.user.email === req.query.email) {
          const result = await hiredCollection
            .find({ workerEmail: req.query.email })
            .toArray();
          res.json(result);
        } else {
          res.json({ message: "user not authorized" });
        }
      }),
    );

    //  tolet routes
    // get all tolets
    app.get(
      "/allToLets",
      catchAsync(async (req, res) => {
        let result = await workersCollection
          .find({ category: "toLet" })
          .toArray();
        res.json(result);
      }),
    );

    // delete a tolet
    app.delete(
      "/toLet/delete",
      catchAsync(async (req, res) => {
        const id = req.query.id;
        if (!id || typeof id !== "string") throw new Error("id not found");
        const result = await workersCollection.deleteOne({
          _id: useMongoId(id),
        });
        res.json(result);
      }),
    );

    // get tolets for customers & admin
    app.get(
      "/toLets",
      catchAsync(async (req, res) => {
        let result;
        if (req.query.status === "Pending") {
          result = await workersCollection
            .find({
              $and: [
                { category: "toLet" },
                {
                  $or: [
                    { applicationStatus: "Pending" },
                    { applicationStatus: { $exists: false } },
                  ],
                },
              ],
            })
            .toArray();
        } else {
          result = await workersCollection
            .find({ $and: [{ email: req.query.email }, { category: "toLet" }] })
            .toArray();
        }
        res.json(result);
      }),
    );

    // approve toLet applications
    app.put(
      "/toLet",
      catchAsync(async (req, res) => {
        const result = await workersCollection.updateOne(
          { _id: useMongoId(req.body.id) },
          { $set: { applicationStatus: "Approved" } },
        );
        res.json(result);
      }),
    );

    // delete toLet Application
    app.delete(
      "/toLet",
      catchAsync(async (req, res) => {
        const result = await workersCollection.deleteOne({
          _id: useMongoId(req.body.id),
        });
        res.json(result);
      }),
    );

    // customer messages
    // get all message for admins
    app.get(
      "/messages",
      catchAsync(async (req, res) => {
        const result = await messagesCollection.find({}).toArray();
        res.json(result);
      }),
    );

    // save message
    app.post(
      "/messages",
      catchAsync(async (req, res) => {
        const result = await messagesCollection.insertOne(req.body);
        res.json(result);
      }),
    );
  } finally {
    app.get("/", (req, res) => {
      res.send("Welcome to Urban services server");
    });

    app.listen(port, () => {
      console.log("port running at localhost:", port);
    });
    app.use((err, req, res, next) => {
      console.log(err);
      res.status(500).json({
        err,
        message: "Unauthorized",
      });
    });
  }
}
run().catch(console.dir);
