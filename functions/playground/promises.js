function promises()
{
const promise=new Promise((resolve,reject)=>
{
  resolve(
    {
      name:"rajinikanth"
    }
  )
}).then((data)=>
{
    console.log(data)
    return new Promise((resolve,reject)=>
  {
    resolve(
      {
        name:"sanjay reddy"
      }
    )
  }).then((data)=>
  {
    console.log(data)
    return new Promise((resolve,reject)=>
    {
      resolve(
        {
        name:"kirit reddy"
        }
      )
    }).then((data)=>
    {
      console.log(data)
    })
      
    })
  })
  }
promises()

