const functions = require('firebase-functions');
var admin=require("firebase-admin")
const {db}=require("./util/admin")
const app=require("express")();
const FBAuth=require("./util/fbauth")
const cors=require("cors")
app.use(cors())
//import {getAllScreams,postOneScream} from "./handlers/scream"
const {getAllScreams,
    postOneScream,
    getScream,
    commentOnScream,
    likeScream,
    unlikeScream,
    deleteScream
}=require("./handlers/scream")
//import  * as express from "express"
//var serviceAccount = require("‪C:\Users\Jeevan Reddy\Downloads\socail-app-c70ed-05c4c4f7b593.json");
const {signup,
    login,
    uploadImage,
    getAuthenticatedUser,
    addUserDetails,
    getUserDetails,
    markNotificationsRead
}=require("./handlers/users")
//scream routes
app.get("/screams",getAllScreams);
app.post("/scream",FBAuth,postOneScream)
app.get("/scream/:screamId",getScream);
app.post("/scream/:screamId/comment",FBAuth,commentOnScream)
//delete scream
app.delete("/scream/:screamId",FBAuth,deleteScream)
//todo like a scream
app.get("/scream/:screamId/like",FBAuth,likeScream);
app.get("/scream/:screamId/unlike",FBAuth,unlikeScream)


//unliking a scream


//comment on scream





//signup route
let token,userId;
app.post("/signup",signup)
app.post("/login",login);
app.post("/user/image",FBAuth,uploadImage);
app.post("/user",FBAuth,addUserDetails)
app.get("/user",FBAuth,getAuthenticatedUser)
//var serviceAccount = require("C:\Users\Jeevan Reddy\Downloads\newKey.json");
//get user details

app.get("/user/:handle",getUserDetails);
app.post("/notifications",FBAuth,markNotificationsRead)
//const app=express();




// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
 exports.helloWorld = functions.https.onRequest((request, response) => {
 response.send("Hello world from Firebase!");
 });

 



//https://baseurl.com/api/screams
exports.api=functions.https.onRequest(app);
//we have to setup
    //get  no notifications for un like

exports.deleteNotificationOnUnlike=functions.firestore.document('/likes/{id}')
.onDelete((snapshot)=>
{
   return  db.doc(`/notifications/${snapshot.id}`)
    .delete()
       .catch((error)=>
    {
        console.error(error);
        return ;
    })
    });

    //get notifications for like

exports.createNotificationOnlike=functions.firestore.document('/likes/{id}')
.onCreate((snapshot)=>
{
    return db.doc(`/screams/${snapshot.data().screamId}`).get()
    .then((doc)=>
    {
        if(doc.exists && doc.data().userHandle!==snapshot.data().userHandle)
        {
            return db.doc(`/notifications/${snapshot.id}`).set(
                {
                    createdAt:new Date().toISOString(),
                    recipient:doc.data().userHandle,
                    sender:snapshot.data().userHandle,
                    type:"like",
                    read:false,
                    screamId:doc.id
                    }
            )
                }
            
        }
    )
    .catch((error)=>
    {
        console.log(error);
        return ;
    })
    });
    //in above function we have given return statement for first promosises and it wont casue any probelm because it was only for the warnings

//notifications for cooment
 exports.createNotificationOnComment=functions.firestore.document("comments/{id}")
 .onCreate((snapshot)=>
 {
    return db.doc(`/screams/${snapshot.data().screamId}`).get()
    .then((doc)=>
    {
        if(doc.exists && doc.data().userHandle!==snapshot.data().userHandle)
        {
            return db.doc(`/notifications/${snapshot.id}`).set(
                {
                    createdAt:new Date().toISOString(),
                    recipient:doc.data().userHandle,
                    sender:snapshot.data().userHandle,
                    type:"comment",
                    read:false,
                    screamId:doc.id
                    }
            )
                }
            
        }
    )
    .catch((error)=>
    {
        console.log(error);
        return ;
    })

 })
//new trigger to update the user image in every scream post when user changes the profile
 exports.onUserImageChange=functions.firestore.document("/users/{userId}")
 .onUpdate((change)=>
 {
     console.log(change.before.data());
     console.log(change.after.data());
     if(change.before.data().imageUrl!==change.after.data().imageUrl)
     {
         console.log("image has chnaged")
         const batch=db.batch();
     return db.collection("screams").where("userHandle","==",change.before.data().handle)
     .get().then((data)=>
     {
         data.forEach((doc)=>
         {
             const scream=db.doc(`/screams/${doc.id}`);
             batch.update(scream,{userImage:change.after.data().imageUrl})
            })
            return batch.commit();
     })
     }
     else return true;
 })

 exports.onScreamDelete=functions.firestore.document("/screams/{screamId}")
 .onDelete((snapshot,context)=>
 {
     const screamId=context.params.screamId;
     const batch=db.batch();
     return db.collection("comments").where("screamId","==",screamId).get()
     then((data)=>
     {
         data.forEach((doc)=>
         {
             batch.delete(db.doc(`/comments/${doc.id}`));
         })
         return db.collection("likes").where("screamId","==",screamId).get();
     })
     .then((data)=>
     {
         data.forEach((doc)=>
         {
             batch.delete(db.doc(`/likes/${doc.id}`));
         })
         return db.collection("notifications").where("screamId","==",screamId).get();
         
     })
     .then((data)=>
     {
         data.forEach((doc)=>
         {
             batch.delete(db.doc(`/notifications/${doc.id}`));
         })
         return batch.commit();
     })
     .catch((error)=>
     {
         console.log("error")
         return res.json({
             error:error.code
         })
     })
 })
 
 