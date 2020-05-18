const {admin}=require("./admin")

module.exports=(req,res,next)=>
{
    let idToken;
    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer '))
    {
        idToken=req.headers.authorization.split('Bearer ')[1];
    }
    else{
        console.error("no token found")
        return res.status(403).json(
            {
                error:"unauhtorized"
            }
        )
    }

    admin.auth().verifyIdToken(idToken).then((decodedToken)=>
    {
        req.user=decodedToken;
        console.log(decodedToken)
        return admin.firestore().collection("users")
        .where('userId','==',req.user.uid)
        .limit(1)
        .get()

    })
    .then((data)=>
    {
        req.user.handle=data.docs[0].data().handle;
        req.user.imageUrl=data.docs[0].data().imageUrl;
        
        return next();
    })
    .catch((error)=>
    {
        console.error('Error while verifying token',error);
        return res.status(403).json(error);
    })
}
