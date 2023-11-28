const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express()
const port = process.env.Port || 5000;

app.use(cors())
app.use(express.json())


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.olvofey.mongodb.net/?retryWrites=true&w=majority`;

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
    const parcelManagement = client.db("parcelManagement");
    const userCollection = parcelManagement.collection("users");
    const parcelCollection = parcelManagement.collection("parcels");
    const reviewCollection = parcelManagement.collection("reviews");

    app.post('/users', async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result)
    });
    app.post('/bookParcel', async (req, res) => {
      const parcel = req.body;
      const result = await parcelCollection.insertOne(parcel);
      res.send(result);
    });

     app.get('/profile/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email }
      const result = await userCollection.findOne(query)
      res.send(result)
      // console.log(result)
    });

   app.get('/parcels/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email }
      const result = await parcelCollection.find(query).toArray()
      res.send(result)
      // console.log(result)
    });

   app.get('/parcelDetails/:id',async (req,res)=>{
      const id=req.params.id;
      const query={_id:new ObjectId(id)}
      const result=await parcelCollection.findOne(query)
      res.send(result)
    });
    app.post('/reviews', async (req, res) => {
      const review = req.body;
      const result = await reviewCollection.insertOne(review);
      res.send(result);
    });
    app.patch('/updateParcel/:id', async (req,res)=>{
      const parcel=req.body;
      const id=req.params.id
      const filter={_id: new ObjectId(id)}
      const updateDoc={
        $set:{
           name:parcel.name,
            // email:parcel.email,
            phone:parcel.phone,
            parcel_type:parcel.parcel_type,
            parcel_weight:parcel.parcel_weight,
            reciever_name:parcel.reciever_name,
            reciever_phone_no:parcel.reciever_phone_no,
            delivery_address:parcel.delivery_address,
            delivery_date:parcel.delivery_date,
            delivery_latitude:parcel.delivery_latitude,
            delivery_longitude:parcel.delivery_longitude,
            price:parcel.price,
        }
      }
      const result=await parcelCollection.updateOne(filter,updateDoc)
      res.send(result)
    })
    app.patch('/parcels/:id', async (req,res)=>{
      const id=req.params.id;
      const filter={_id: new ObjectId(id)}
      const updateDoc={
        $set:{
          status:'cancelled'
        }
      }
      const result= await parcelCollection.updateOne(filter,updateDoc)
      res.send(result)
    })
    //user profile change
    app.get('/userId/:email', async (req, res) => {
      const email=req.params.email
      const query={email : email}
      const result = await parcelCollection.findOne(query).
      res.send(result)
      // console.log(result)
    });
    app.patch('/userimg/:id', async (req,res)=>{
      const item=req.image
      const id=req.params.id;
      const filter={_id: new ObjectId(id)}
      const updateDoc={
        $set:{
          image:item.image
        }
      }
      const result= await parcelCollection.updateOne(filter,updateDoc)
      res.send(result)
    })


  
    //admin side---------------------------------------------------------
    app.get('/parcels', async (req, res) => {
      const result = await parcelCollection.find().toArray()
      res.send(result)
      // console.log(result)
    });
    // app.patch('/manageDeliverymen/:id',async(req,res)=>{
    //   const item=req.body;
    //   const id=req.params.id;
    //   const filter={_id: new ObjectId(id)};
    //   const updateDoc={
    //     $set:{
    //       delivery_men_id: item.delivery_men_id,
    //       appr_delivery_date: item.appr_delivery_date,
    //       status:'ontheway'
    //     }
    //   }
    //   const result=await parcelCollection.updateOne(filter,updateDoc)
    //   res.send(result);
    // })
    //mange button
    app.put('/manageDeliverymen/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true };
      const updateParcel = req.body;
      const food = {
        $set: {
          delivery_men_id: updateParcel.delivery_men_id, appr_delivery_date: updateParcel.appr_delivery_date, status:"ontheway"
        },
      };
      const result = await parcelCollection.updateOne(filter, food, options)
      res.send(result);
    })

    app.get('/deliverymens', async (req, res) => {
      const query={role:"deliverymen"}
      const result = await userCollection.find(query).toArray()
      res.send(result)
      // console.log(result)
    });
    app.get('/users', async (req, res) => {
      const page=parseInt(req.query.page)
      const size=parseInt(req.query.size)
      const query={role:"user"}
      const result = await userCollection.find(query).skip(page * size).limit(size).toArray()
      res.send(result)
      // console.log(result)
    });
    //pagination
    app.get('/pageCount',async(req,res)=>{
      const count=await userCollection.estimatedDocumentCount()
      res.send({count})
    })
    app.patch('/makeAddmin/:id', async (req,res)=>{
      const id=req.params.id;
      const filter={_id: new ObjectId(id)}
      const updateDoc={
        $set:{
          role:'admin'
        }
      }
      const result= await parcelCollection.updateOne(filter,updateDoc)
      res.send(result)
    })
    app.patch('/makeDeliveryMen/:id', async (req,res)=>{
      const id=req.params.id;
      const filter={_id: new ObjectId(id)}
      const updateDoc={
        $set:{
          role:'deliverymen'
        }
      }
      const result= await parcelCollection.updateOne(filter,updateDoc)
      res.send(result)
    })


//delivermen Side--------------------------------------------------------------
    app.get('/deliverymenId/:email', async (req, res) => {
      const email=req.params.email
      const query={email:email}
      const result = await userCollection.findOne(query)
      res.send(result)
      // console.log(result)
    });

    app.get('/deliverylist/:id', async (req, res) => {
      const id=req.params.id
      const query={delivery_men_id : id}
      const result = await parcelCollection.find(query).toArray()
      res.send(result)
      // console.log(result)
    });
    app.patch('/parcelsDelivery/:id', async (req,res)=>{
      const id=req.params.id;
      const filter={_id: new ObjectId(id)}
      const updateDoc={
        $set:{
          status:'delivered'
        }
      }
      const result= await parcelCollection.updateOne(filter,updateDoc)
      res.send(result)
    })

    app.get('/reviews/:id', async (req, res) => {
      const id=req.params.id
      const query={delivery_men_id : id}
      const result = await reviewCollection.find(query).toArray()
      res.send(result)
      // console.log(result)
    });

  
  
   

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);





app.get("/", (req, res) => {
  res.send("parcel management server is running")
})
app.listen(port, () => {
  console.log(`parcel management server is running port : ${port}`)
})