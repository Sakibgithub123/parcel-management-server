const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const app = express()
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
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
    const paymentCollection = parcelManagement.collection("payment");
    
//--------------------users--------------------------
    app.post('/users', async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result)
    });
    //feture auto count
    app.get('/featureCount',async (req,res)=>{
      const totalBooked=await parcelCollection.estimatedDocumentCount();
      const totalUser=await userCollection.estimatedDocumentCount();
      const totalDeliverey=await parcelCollection.estimatedDocumentCount({status:'delivered'})
      res.send({totalBooked,totalUser,totalDeliverey})
    })
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
      const insertDoc={
        // $set:{
           name: review.name,
            image: review.image,
            delivery_men_id:new ObjectId(review.delivery_men_id) ,
            rating: parseFloat(review.rating),
            feedback: review.feedback,
        // }
      }
      const result = await reviewCollection.insertOne(insertDoc);
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
   
    app.get('/users/:email', async (req, res) => {
      const email=req.params.email
      const query={email : email}
      const result = await userCollection.findOne(query)
      res.send(result)
     
      // console.log(result)
    });
    app.patch('/users/:id', async (req,res)=>{
      const id=req.params.id;
      const item=req.body
      const filter={_id: new ObjectId(id)}
      const updateDoc={
        $set:{
          image:item.image
        }
      }
      const result= await userCollection.updateOne(filter,updateDoc)
      res.send(result)
    })


  
    //-----------------------admin side---------------------------------------------------------
    app.get('/admin-stats',async (req,res)=>{
      const user=await userCollection.estimatedDocumentCount()
      const deliverymen=await userCollection.estimatedDocumentCount({role:'deliverymen'})
      const bookedParcel=await parcelCollection.estimatedDocumentCount()
      const result=await parcelCollection.aggregate([
        {
          $group:{
            _id:null,
            totalRevenue:{
              $sum:'$price'
            }
          }
        }
      ]).toArray();
      const totalRevenue=result.length > 0?result[0].totalRevenue : 0;
      res.send({user,deliverymen,bookedParcel,totalRevenue})
    })
   
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
      const parcel = {
        $set: {
          delivery_men_id: new ObjectId(updateParcel.delivery_men_id), appr_delivery_date: updateParcel.appr_delivery_date, status:"ontheway"
        },
      };
      const result = await parcelCollection.updateOne(filter, parcel, options)
      res.send(result);
    })

    app.get('/alldeliverymens', async (req, res) => {
      const query={role:"deliverymen"}
      const options={
        projection:{_id:1}
      }
      const result = await userCollection.find(query,options).toArray()
      res.send(result)
      // console.log(result)
    });
    app.get('/deliverymens', async (req, res) => {
        const result = await userCollection.aggregate([
        {
          $match:{role:'deliverymen'}
        },
        {
          $lookup:{
            from:'parcels',
            localField:'_id',
            foreignField:'delivery_men_id',
            as:'parcels'
          }
        },
        {
          $unwind:'$parcels'

        },
        {
          $match:{
            'parcels.status':'delivered',
          }
        },
        {
          $lookup:{
            from:'reviews',
            localField:'_id',
            foreignField:'delivery_men_id',
            as:'review'
          }
        },
        
        {
          $group:{
            _id:'$_id',
            totalRating:{$sum:'$review.rating'},
            // name:{$addToSet:'$name'},
            name:{$first:'$name'},
            phone:{$first:'$phone'},
            image:{$first:'$image'},
            totalDelivered:{$sum:1}

          }
        }
      ]).toArray()
      res.send(result)
    
    });
  
    //aggregate
    app.get('/users',async (req,res)=>{
      const page=parseInt(req.query.page)
      const size=parseInt(req.query.size)
      const skip=page * size;
      const result=await userCollection.aggregate([
       
        {
          $lookup:{
            from:'parcels',
            localField:'email',
            foreignField:'email',
            as:'userdata'
          }
        },
        {
          $unwind:'$userdata'

        },
        {
          $group:{
            _id:'$_id',
            totalBooked:{$sum:1},
            name:{$first:'$userdata.name'},
            phone:{$first:'$userdata.phone'},
            role:{$first:'$role'},
            totalPrice:{$sum:'$userdata.price'},
          }
        },
       
        {
          $skip: skip
        },
        {
          $limit:size
        }
        
      ]).toArray()
      res.send(result)

    })
    app.get('/admin-chart',async (req,res)=>{
      const barChart= await parcelCollection.aggregate([
        {
          $group:{
            _id:'$booking_date',
            count:{
              $sum:1
            }
          }
        },
        {
          $sort:{ _id: 1}

        },
        {
          $project:{
            booking_date:'$_id',
            totalBooking:'$count'

          }
        }
      ]).toArray()
      res.send(barChart)
    })
   
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






//--------------------delivermen Side--------------------------------------------------------------
    app.get('/deliverymenId/:email', async (req, res) => {
      const email=req.params.email
      const query={email:email}
      const result = await userCollection.findOne(query)
      res.send(result)
      // console.log(result)
    });

    app.get('/deliverylist/:id', async (req, res) => {
      const id=req.params.id
      const query={delivery_men_id : new ObjectId(id) }
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
      const query={delivery_men_id : new ObjectId(id) }
      const result = await reviewCollection.find(query).toArray()
      res.send(result)
      // console.log(result)
    });


    //-----------------------payment intent------------------
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount=parseInt(price * 100)
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret
      });
    });

    app.post('/payment',async (req,res)=>{
      const payment=req.body;
      const result= await paymentCollection.insertOne(payment)
      res.send(result)
    })


//---------------------permission management---------------------------------
    //is admin
    app.get('/users/admin/:email',  async (req, res) => {
      const email = req.params.email;
      const query = { email: email }
      const user = await userCollection.findOne(query)
      let admin = false;
      if (user) {
        admin = user?.role === 'admin'
        res.send({ admin })
      }

    })
    //is user
    app.get('/users/user/:email',  async (req, res) => {
      const email = req.params.email;
      const query = { email: email }
      const user1 = await userCollection.findOne(query)
      let user = false;
      if (user1) {
        user = user1?.role === 'user'
        res.send({ user })
      }

    })
    //is delivermen
    app.get('/users/deliverymen/:email',  async (req, res) => {
      const email = req.params.email;
      const query = { email: email }
      const deliverymen1 = await userCollection.findOne(query)
      let deliverymen = false;
      if (deliverymen1) {
        deliverymen = deliverymen1?.role === 'deliverymen'
        res.send({ deliverymen })
      }

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





app.get("/", (req, res) => {
  res.send("parcel management server is running")
})
app.listen(port, () => {
  console.log(`parcel management server is running port : ${port}`)
})