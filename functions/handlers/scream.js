const {admin}=require("../util/admin")
const {validatePostScream}=require("../util/validators")
module.exports.getAllScreams=(req,res)=>
{
    admin.firestore().
    collection("screams")
    .orderBy("createdAt","desc")
    .get().then((data)=>
     {
        let screams=[];
         data.forEach((doc)=>
         {
             screams.push(
                 {
                     screamId:doc.id,
                     body:doc.data().body,
                     userHandle:doc.data().userHandle,
                     createdAt:doc.data().createdAt,
                     commentCount:doc.data().commentCount,
                     likeCount:doc.data().likeCount,
                     userImage:doc.data().userImage
                 }
             )
         })
         return res.json(screams)
     })
     .catch((error)=>
     {
         console.log(error)
     })

}
exports.postOneScream=(req,res)=>
{
    if(req.method!=="POST")
    {
       return  res.status(400).json(
           {

               error:"method not allowed"
           }
       )
    }
    const newScream=
    {
        body:req.body.body,
        userHandle:req.user.handle,
        userImage:req.user.imageUrl,
        createdAt:new Date().toISOString(),
        likeCount:0,
        commentCount:0
    };
    const {errors,valid}=validatePostScream(newScream)
    if(!valid) return res.status(400).json(errors)

    admin.firestore().collection("screams")
    .add(newScream)
    .then((doc)=>
    {
        const resScream=newScream;
        resScream.screamId=doc.id;
        res.json(resScream)
    }).catch((error)=>
    {
        res.status(500).json(
            {
                error:"something went wrong"
            }
        )
        console.log(error)
    })

}
//get scream

exports.getScream=(req,res)=>
{
    let screamData={}
    admin.firestore().doc(`/screams/${req.params.screamId}`).get()
    .then((doc)=>
    {
        if(!doc.exists)
        {
            return res.status(404).json({error:"scream not found"})
        }
        screamData=doc.data();
        screamData.screamId=doc.id;
        return admin.firestore().collection("comments").orderBy("createdAt","desc").where('screamId',"==",req.params.screamId).get();

    })
    .then((data)=>
    {
        screamData.comments=[];
        data.forEach((doc)=>
        {
            screamData.comments.push(doc.data())
        });
        return res.json(screamData)
    }).catch((error)=>
    {
        console.error(error);
        return res.status(500).json({
            error:error.code
        })
    })
}

//comment on scream

exports.commentOnScream=(req,res)=>{
    if(req.body.body.trim()==="") return res.status(400).json(
        {
            error:"Must not be empty"
        }
    )
    let newData={}

    const newComment={
        body:req.body.body,
        createdAt:new Date().toISOString(),
        screamId:req.params.screamId,
        userHandle:req.user.handle,
        userImage:req.user.imageUrl

    };
    admin.firestore().doc(`/screams/${req.params.screamId}`).get().then((doc)=>
    {
        if(!doc.exists)
        {
            return res.status(404).json({
                error:"Scream not found"
            })
        }
        return doc.ref.update({
           commentCount:doc.data().commentCount+1
        }).then(()=>
        {
            return admin.firestore().collection("comments").add(newComment)

        })
    }).then(()=>
    {
        res.json(newComment)

    }).catch((error)=>
    {
        console.log(error);
        res.status(500).json({error:"something went wrong"})
    })

}

//liking a scream
exports.likeScream=(req,res)=>
{
    const likeDocument=admin.firestore().collection("likes").where("userHandle",'==',req.user.handle).where("screamId","==",req.params.screamId).limit(1);
    const screamDocument=admin.firestore().doc(`/screams/${req.params.screamId}`);
    let screamData={};
    screamDocument.get().then((doc)=>
    {
        if(doc.exists)
        {
            screamData=doc.data();
            screamData.screamId=doc.id;
            return likeDocument.get();
        }
        else{
            return res.status(404).json({
                error:"scream not found"
            })
        }
    })
    .then((data)=>
    {
        if(data.empty)
        {
            return admin.firestore().collection("likes").add(
                {
                    screamId:req.params.screamId,
                    userHandle:req.user.handle
                }
            ).then(()=>
            {
                screamData.likeCount++
                return screamDocument.update({
                    likeCount:screamData.likeCount
                })
            })
            .then(()=>
            {
                return res.json(screamData)
            })
        }
        else{
            return res.status(400).json({error:"scream already liked"})
        }
    })
    .catch((error)=>
    {
        console.log(error)
        res.status(500).json({error:error.code})
    })

}

//unliking scream

exports.unlikeScream=(req,res)=>
{
    const likeDocument=admin.firestore().collection("likes").where("userHandle",'==',req.user.handle).where("screamId","==",req.params.screamId).limit(1);
    const screamDocument=admin.firestore().doc(`/screams/${req.params.screamId}`);
    let screamData={};
    screamDocument.get().then((doc)=>
    {
        if(doc.exists)
        {
            screamData=doc.data();
            screamData.screamId=doc.id;
            return likeDocument.get();
        }
        else{
            return res.status(404).json({
                error:"scream not found"
            })
        }
    })
    .then((data)=>
    {
        if(data.empty)
        {
            return res.status(500).json({error:"scream not liked"})
        }
        else{
            //have a query in line no 222 for parmeter data.docs[0].id and unable to understand  it and I have to make it clear
            console.log(data)
            return  admin.firestore().doc(`/likes/${data.docs[0].id}`).delete()
        .then(()=>
        {
            screamData.likeCount--;
            return screamDocument.update({
                likeCount:screamData.likeCount
            })
            .then(()=>
            {
                res.json(screamData);

            })

        })       }
    })
    .catch((error)=>
    {
        console.log(error)
        res.status(500).json({error:error.code})
    })

}

//delete a scream
exports.deleteScream=(req,res)=>
{
    const document=admin.firestore().doc(`/screams/${req.params.screamId}`);
    document.get()
    .then((doc)=>
    {
        if(!doc.exists)
        {
            return res.status(404).json({
                error:"Screm not found"
            })
        }
        if(doc.data().userHandle!==req.user.handle)
        {
            return res.status(403).json(
                {
                    error:"unauthorized"
                }
            )
        }
        else{
            return document.delete();
        }
    }).then(()=>
    {
        res.json(
            {
                message:"scream deleted successfully "
            }
        )
    }).catch((error)=>
    {
        console.log(error)
        return res.status(500).json(
            {
                error:error.code
            }
        )
    })
}