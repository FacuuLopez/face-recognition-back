const express = require('express');
const cors = require('cors')
const {ClarifaiStub, grpc} = require("clarifai-nodejs-grpc");
const bcrypt = require('bcryptjs');

const stub = ClarifaiStub.grpc();

const metadata = new grpc.Metadata();
metadata.set("authorization", "Key 024ab6c4153f48778f76c174e109797a");

// stub.PostModelOutputs(
//     {
//         // This is the model ID of a publicly available General model. You may use any other public or custom model ID.
//         model_id: "aaa03c23b3724a16a56b629203edc62c",
//         inputs: [{data: {image: {url: "https://samples.clarifai.com/dog2.jpeg"}}}]
//     },
//     metadata,
//     (err, response) => {
//         if (err) {
//             console.log("Error: " + err);
//             return;
//         }

//         if (response.status.code !== 10000) {
//             console.log("Received failed status: " + response.status.description + "\n" + response.status.details);
//             return;
//         }

//         console.log("Predicted concepts, with confidence values:")
//         for (const c of response.outputs[0].data.concepts) {
//             console.log(c.name + ": " + c.value);
//         }
//     }
// );

const app = express();

const db = require('knex')({
    client: 'pg',
    connection: {
      host : '127.0.0.1',
      port : 5432,
      user : 'postgres',
      password : 'pingfloy',
      database : 'facerecognition'
    }
  });

  app.use(cors())
  app.use(express.json()); 
  
// app.get('/', async (req,res) => {
//   let respuesta;
//   try{
//     await db('users').insert({username:"elFacuLopez", password_hash:'funciona', joined: new Date()});
//   }catch(error){
//     console.log(error);
//   }
//   db.select('*').from('users')
//   .then(user => {
//     if (true) {
//       res.json(user)
//     }
//   });

  
  // db.raw('CREATE TABLE IF NOT EXISTS users (id serial PRIMARY KEY, username VARCHAR(50) UNIQUE NOT NULL, password_hash VARCHAR(100), joined TIMESTAMP NOT NULL)')
  // .then(() => {
  //   console.log('Database dropped successfully');
  // })
  // .catch((error) => {
  //   console.error('Error dropping database:', error);
  // });
  
// });

app.post('/imageURL', async (req, res) => {
  try{
  const {imageUrl} = req.body;
  let facesPostion;
  let gender;
  let age;

  // Wrap each PostModelOutputs method in a function that returns a promise
  const detectFaces = async () => {
    return new Promise(async (resolve, reject) => {
      await stub.PostModelOutputs(
        {
            model_id: "face-detection",
            inputs: [{data: {image: {url: imageUrl}}}]
        },
        metadata,
        (err, response) => {
            if (err) {
                console.log("Error: " + err);
                reject(err);
                return;
            }

            if (response.status.code !== 10000) {
                console.log("Received failed status: " + response.status.description + "\n" + response.status.details);
                reject(response);
                return;
            }

            console.log("Predicted concepts, with confidence values:")
            facesPostion = response.outputs[0].data.regions[0].region_info.bounding_box;
            resolve(facesPostion);
        }
      );
    });
  }

  const detectGender = async () => {
    return new Promise(async (resolve, reject) => {
      await stub.PostModelOutputs(
        {
            model_id: "gender-demographics-recognition",
            inputs: [{data: {image: {url: imageUrl}}}]
        },
        metadata,
        (err, response) => {
            if (err) {
                console.log("Error: " + err);
                reject(err);
                return;
            }

            if (response.status.code !== 10000) {
                console.log("Received failed status: " + response.status.description + "\n" + response.status.details);
                reject(response);
                return;
            }

            console.log("Predicted concepts, with confidence values:")
            gender = response.outputs[0].data.concepts[0].name;
            resolve(gender);
        }
      );
    });
  }

  const detectAge = async () => {
    return new Promise(async (resolve, reject) => {
      await stub.PostModelOutputs(
        {
            model_id: "age-demographics-recognition",
            inputs: [{data: {image: {url: imageUrl}}}]
        },
        metadata,
        (err, response) => {
            if (err) {
                console.log("Error: " + err);
                reject(err);
                return;
            }

            if (response.status.code !== 10000) {
                console.log("Received failed status: " + response.status.description + "\n" + response.status.details);
                reject(response);
                return;
            }

            console.log("Predicted concepts, with confidence values:")
            response.outputs[0].data.concepts.forEach(element => {
              console.log(element);
              
            });
            age = response.outputs[0].data.concepts[0].name;
            resolve(age);
        }
      );
    });
  }

  const detectFamous = async () => {
    return new Promise(async (resolve, reject) => {
      await stub.PostModelOutputs(
        {
            model_id: "celebrity-face-recognition",
            inputs: [{data: {image: {url: imageUrl}}}]
        },
        metadata,
        (err, response) => {
            if (err) {
                console.log("Error: " + err);
                reject(err);
                return;
            }

            if (response.status.code !== 10000) {
                console.log("Received failed status: " + response.status.description + "\n" + response.status.details);
                reject(response);
                return;
            }

            console.log("Predicted famous:")
            response.outputs[0].data.concepts.forEach(famous=>{
              console.log('famous: ', famous.name)
              console.log('value: ', famous.value)
            })
            if(response.outputs[0].data.concepts[0].value > 0.1){
              famous = response.outputs[0].data.concepts[0].name;
            }else
              famous = "We couldn't recognize this person"
            resolve(famous);
        }
      );
    });
  }

  // Pass all the functions that return a promise to Promise.all
Promise.all([detectFaces(), detectGender(), detectAge(), detectFamous()])
  .then(([detectedFaces, detectedGender, detectedAge, detectedFamous]) => {
    res.json({detectedFaces, detectedGender, detectedAge, detectedFamous});
  })
  .catch(err => {
    console.log(err);
    res.json({ error: 'An error occurred while processing your request' });
  });
  }catch{
    console.log('an error occurred fetching faces');
    res.status(500).send('An error occurred while processing your request');
  }
});

app.post('/signin', (req, res) => {
  db.select('email', 'password_hash').from('users')
    .where('email', '=', req.body.email)
    .then(data => {
      const isValid = bcrypt.compareSync(req.body.password, data[0].password_hash);
      if (isValid) {
        return db.select('*').from('users')
          .where('email', '=', req.body.email)
          .then(user => {
            res.json(user[0])
          })
          .catch(err => res.status(400).json('unable to get user'))
      } else {
        res.status(400).json('wrong credentials')
      }
    })
    .catch(err => res.status(400).json('wrong credentials'))
})

app.post('/register', (req, res) => {
  const { email, name, password } = req.body;
  const hash = bcrypt.hashSync(password);
    //db.transaction(trx => {
     // trx.insert({
      db.insert({
        password_hash: hash,
        email: email,
        username: name,
        joined: new Date(),
        score:0,
        last_login: new Date()
      })
      .into('users')
     // .returning('email')
    //   .then(loginEmail => {
    //     return trx('user')
    //       .returning('*')
    //       .insert({
    //         email: loginEmail[0].email,
    //         name: name,
            
    //       })
    //       .then(user => {
    //         res.json(user[0]);
    //       })
    //   })
    //   .then(trx.commit)
    //   .catch(trx.rollback)
    // })
    .catch(err => res.status(400).json('unable to register'))
})


app.listen(3000);
