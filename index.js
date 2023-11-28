const express = require('express');
const app=express();
const cors = require('cors');
const jwt=require('jsonwebtoken');
require('dotenv').config()
const stripe=require('stripe')(process.env.STRIPE_SECRET_KEY)
const port= process.env.PORT || 5000;



// middleware
app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cp7ahlj.mongodb.net/?retryWrites=true&w=majority`;

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

    const BioDataCollection=client.db('BioDataDb').collection('biodatas');
    const userDataCollection=client.db('BioDataDb').collection('users');
    const FavouritesDataCollection=client.db('BioDataDb').collection('favourites');
    const premiumDataCollection=client.db('BioDataDb').collection('premium');
    const paymentCollection=client.db('BioDataDb').collection('payments');

       // jwt related api
       app.post('/jwt',async(req,res)=>{
        const user= req.body;
        const token= jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{expiresIn:'1h'})
        res.send({token})
      })

        // middlewares
        const verifyToken = (req,res,next)=>{
          // console.log('inside verify token', req.headers.authorization);
          if(!req.headers.authorization){
            return res.status(401).send({message:'unauthorized access'})
          }
          const token= req.headers.authorization.split(' ')[1];
          jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
            if(err){
              return res.status(401).send({message:'unauthorized access'})
            }
            req.decoded= decoded;
            next();
          })
          
        }

        
      // user verify admin after verify token
      const verifyAdmin= async(req,res,next)=>{
        const email= req.decoded.email;
        const query= {email:email}
        const user= await userDataCollection.findOne(query);
        const isAdmin=user?.role === 'admin';
        if(!isAdmin){
          res.status(403).send({message: 'forbidden access'})
        }
        next();
      }


    // bio related api

    app.get('/data',async(req,res)=>{
      const result= await BioDataCollection.find().toArray();
      res.send(result);
    })


    app.get('/data/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await BioDataCollection.findOne(query);
      res.send(result);
    })



    app.post('/bio',async(req,res)=>{
        const item=req.body;
        const lastBioData = await BioDataCollection.find({},{sort:{bioDataId: -1}});
        const newBioDataId = lastBioData ? lastBioData.bioDataId + 1 : 1;
        const newBioData = {
            bioDataId: newBioDataId,
            
          };
        const result= await BioDataCollection.insertOne(item,newBioData);
        res.send(result);
    })

    // user related api

    app.get('/users',verifyToken,verifyAdmin,async(req,res)=>{
      console.log(req.headers);
      const result= await userDataCollection.find().toArray();
      res.send(result);
    })

       // admin
       app.get('/users/admin/:email',verifyToken,async(req,res)=>{
        const email=req.params.email;
        if(email !== req.decoded.email){
          return res.status(403).send({message:'forbidden access'})
        }
        const query= {email: email}
        const user= await userDataCollection.findOne(query);
        let admin= false
        if('user'){
          admin= user?.role=== 'admin';
        }
        res.send({admin})
    })

    app.patch('/users/admin/:id',verifyToken,verifyAdmin,async(req,res)=>{
      const id= req.params.id;
      const filter={_id: new ObjectId(id)};
      const updatedDoc={
        $set:{
          role:'admin'
        }
      }
      const result= await userDataCollection.updateOne(filter,updatedDoc);
      res.send(result);
    })

    app.delete('/users/:id',verifyToken,verifyAdmin,async(req,res)=>{
      const id = req.params.id;
      const query= {_id: new ObjectId(id)}
      const result= await userDataCollection.deleteOne(query);
      res.send(result);
  })


    app.post('/users',async(req,res)=>{
      const user= req.body;
      const query = {email:user?.email}
      const existingUser=await userDataCollection.findOne(query);
      if(existingUser){
        return res.send({message:'user already exists',insertedId:null})
      }

      const result= await userDataCollection.insertOne(user);
      res.send(result);
    })

    // Favourite api

    app.get('/favourites',async(req,res)=>{
      // console.log(req.headers);
      const email= req.query.email;
      const query= {email:email}
      console.log(query);
      const result= await FavouritesDataCollection.find(query).toArray();
      res.send(result);
    })

    app.post('/favourite',async(req,res)=>{
      const item =req.body;
      const result= await FavouritesDataCollection.insertOne(item);
      res.send(result);
    })

    app.delete('/favourites/:id',async(req,res)=>{
      const id = req.params.id;
      const query= {_id: new ObjectId(id)}
      const result= await FavouritesDataCollection.deleteOne(query);
      res.send(result);
  })

  // premium api

  app.post('/premium',async(req,res)=>{
    const item =req.body;
    const result= await premiumDataCollection.insertOne(item);
    res.send(result);
  })
    

       // payment intent
    app.post('/create-payment-intent',async(req,res)=>{
      const {price} = req.body;
      const amount= parseInt(price * 100);
      console.log(amount,'amount inside the intent');

      const paymentIntent= await stripe.paymentIntents.create({
        amount:amount,
        currency:'bdt',
        payment_method_types: ['card']
      });
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })


    // payment api
    app.post('/payments',async(req,res)=>{
      const payment=req.body;
      const paymentResult= await paymentCollection.insertOne(payment);
      console.log('payment info ',payment);
      res.send(paymentResult);

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


app.get('/',(req,res)=>{
    res.send('mingle-match running')
})

app.listen(port,()=>{
    console.log(`mingle-match running on port ${port}`);
})