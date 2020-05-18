
const {admin}=require("../util/admin")
const {db}=require("../util/admin")

const config=require("../util/config")
const firebase=require("firebase")
firebase.initializeApp(config)

const {validateSignupData,validateLoginData,reduceUserDetails}=require("../util/validators")
exports.signup=(req,res)=>
{
    const newUser={
        email:req.body.email,
        password:req.body.password,
        confirmPassword:req.body.confirmPassword,
        handle:req.body.handle,

    };
    const {valid,errors}=validateSignupData(newUser)
    //validate data
    if(!valid) return res.status(400).json(errors)
    const noImage="no-file.png"
    
    let token,userId;
    admin.firestore().doc(`/users/${newUser.handle}`).get().then((doc)=>
    {
        if(doc.exists)
        {
            return res.status(400).json(
                {
                    handle:"this handle is already created"
                }
            )
        }
        else{
            return firebase.auth().createUserWithEmailAndPassword(newUser.email,newUser.password)

        }
    }).then((data)=>
    {
        userId=data.user.uid;
       return  data.user.getIdToken();
    })
    .then((tokenId)=>
    {
        token=tokenId;
        const userCredentails={
            handle:newUser.handle,
            email:newUser.email,
            createdAt:new Date().toISOString(),
            imageUrl:`https://firebasestorage.googleapis.com/v0/b/${
                config.storageBucket
              }/o/${noImage}?alt=media`,
            userId
        };
        
        return admin.firestore().doc(`/users/${newUser.handle}`).set(userCredentails);
        
    }).then(()=>
    {
        return res.status(201).json(
            {
                token
            }
        )
    })
    .catch((error)=>
    {
        console.log(error);
        if(error.code=== "auth/email-already-in-use")
        {
            return res.status(400).json(
                {
                    email:"email is already in use"
                }
            )

        }
        else{
            return res.status(500).json(
                {
                    general:"something went wrong please try again"
                }
            )

        }
        
    })
    

}

exports.login=(req,res)=>
{
    const user={
        email:req.body.email,
        password:req.body.password
    };
    const {valid,errors}=validateLoginData(user)
    //validate data
    if(!valid) return res.status(400).json(errors)
 
     firebase.auth().signInWithEmailAndPassword(user.email,user.password).then((data)=>
    {
        return data.user.getIdToken();
    }).then((token)=>
    {
        return res.json({token})
    }).catch((err)=>
        {
            console.log(err)
            if(err.code==="auth/wrong-password")
            {
                return res.status(403).json({
                    general:"wrong credentials please try again"
                })
            }
            else return res.status(500).json(
                {
                    error:err.code
                }
            )
        })
}
//add user details
exports.addUserDetails=(req,res)=>
{
    let userDetails=reduceUserDetails(req.body);
    admin.firestore().doc(`/users/${req.user.handle}`).update(userDetails).then((data)=>
        {
            return res.json({message:"details added successfully"})
        }).catch((error)=>
        {
            console.log(error);
            return res.json(500).json({error:err.code})
        })

}

//get own user deatils


exports.getAuthenticatedUser=(req,res)=>
{
    let userData={};
    admin.firestore().doc(`/users/${req.user.handle}`).get()
    .then((doc)=>
    {
        if(doc.exists)
        {
           userData.userCredentails=doc.data();
           return admin.firestore().collection("likes").where('userHandle','==',req.user.handle).get()
        }
    }).then((data)=>
    {
        userData.likes=[];
        data.forEach((doc)=>
        {
            userData.likes.push(doc.data());
        });
        return admin.firestore().collection("notifications").where('recipient',"==",req.user.handle)
        .orderBy("createdAt","desc").limit(10).get();
    }).then((data)=>
    {
        userData.notifications=[];
        data.forEach((doc)=>
        {
            userData.notifications.push(
                {
                  recipient:doc.data().recipient,
                  sender:doc.data().sender,
                  createdAt:doc.data().createdAt,
                  screamId:doc.data().screamId,
                  type:doc.data().type,
                  read:doc.data().read,
                  notificationId:doc.id

                }
            )
        })
        return res.json(userData);
    })
    .catch((error)=>
    {
        console.error(error);
        return res.status(500).json({
            error:error.code
        })

    })

}
//upload an image profile for  user
exports.uploadImage = (req, res) => {
    const BusBoy = require('busboy');
    const path = require('path');
    const os = require('os');
    const fs = require('fs');
  
    const busboy = new BusBoy({ headers: req.headers });
  
    let imageToBeUploaded = {};
    let imageFileName;
  
    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      console.log(fieldname, file, filename, encoding, mimetype);
      if (mimetype !== 'image/jpeg' && mimetype !== 'image/png') {
        return res.status(400).json({ error: 'Wrong file type submitted' });
      }
      // my.image.png => ['my', 'image', 'png']
      const imageExtension = filename.split('.')[filename.split('.').length - 1];
      // 32756238461724837.png
      imageFileName = `${Math.round(
        Math.random() * 1000000000000
      ).toString()}.${imageExtension}`;
      const filepath = path.join(os.tmpdir(), imageFileName);
      imageToBeUploaded = { filepath, mimetype };
      file.pipe(fs.createWriteStream(filepath));
    });
    busboy.on('finish', () => {
      admin
        .storage()
        .bucket()
        .upload(imageToBeUploaded.filepath, {
          resumable: false,
          metadata: {
            metadata: {
              contentType: imageToBeUploaded.mimetype
            }
          }
        })
        .then(() => {
          const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${
            config.storageBucket
          }/o/${imageFileName}?alt=media`;
          return admin.firestore().doc(`/users/${req.user.handle}`).update({ imageUrl });
        })
        .then(() => {
          return res.json({ message: 'image uploaded successfully' });
        })
        .catch((err) => {
          console.error(err);
          return res.status(500).json({ error: 'something went wrong' });
        });
    });
    busboy.end(req.rawBody);
  };


  //get any user details

  exports.getUserDetails=(req,res)=>
  {
      let userData={};
      admin.firestore().doc(`/users/${req.params.handle}`).get()
      .then((doc)=>
      {
          if(doc.exists)
          {
              userData.user=doc.data();
              return admin.firestore().collection("screams").where('userHandle','==',req.params.handle)
              .orderBy("createdAt","desc")
              .get()

          }
          else{
              return res.status(404).json({
                  error:"user not found"
              })
          }
      })
      .then((data)=>
      {
          userData.screams=[];
          data.forEach((doc)=>
          {
              userData.screams.push(
                  {
                      body:doc.data().body,
                      commentCount:doc.data().commentCount,
                      createdAt:doc.data().createdAt,
                      likeCount:doc.data().likeCount,
                      userHandle:doc.data().userHandle,
                      userImage:doc.data().userImage,
                      screamId:doc.id


                  }
              )
          })
          return res.json(userData)
      })
      .catch((error)=>
      {
          console.error(error);
          return res.status(500).json({
              error:error.code
          })
      })

  }

  //
  exports.markNotificationsRead=(req,res)=>
  {
      let batch=db.batch();
      req.body.forEach((notificationId)=>
      {
          const notification=db.doc(`/notifications/${notificationId}`);
          batch.update(notification,{read:true})
      })
      batch.commit()
      .then(()=>
      {
          return res.json({
              messages:"notifications mark read"
          })
      })
      .catch((error)=>
      {
          console.log(error);
          return res.status(500).json({
              error:error.code
    
            })

      })
  }
