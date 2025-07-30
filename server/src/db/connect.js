import mongoose from "mongoose"; 



async function connect(){
  const res = await  mongoose.connect('mongodb://127.0.0.1:27017/ridexDB');
  if(res) console.log("conencted to mongodb")
}

export default connect;