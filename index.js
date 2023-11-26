const express = require('express');
const app=express();
const cors = require('cors');
const jwt=require('jsonwebtoken');
require('dotenv').config()
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

    // bio related api

    app.get('/data',async(req,res)=>{
      // const email= req.params.userEmail;
      // console.log(email);
      const result= await BioDataCollection.find().toArray();
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

    app.get('/users',async(req,res)=>{
      const result= await userDataCollection.find().toArray();
      res.send(result);
    })

    app.patch('/users/admin/:id',async(req,res)=>{
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

    app.delete('/users/:id',async(req,res)=>{
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