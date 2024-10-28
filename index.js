import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import bodyParser from 'body-parser';
import axios from 'axios';
const app = express();
const port = 8080;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(bodyParser.urlencoded({extended:true}))
app.use('/public',express.static(path.join(__dirname,'/public')));
app.set('views',path.join(__dirname,'views'));
app.set('view engine','ejs');

app.get("/home",(req,res)=>{
    res.render('home');
})

app.get("/login",(req,res)=>{
    res.render('login')
})

app.get("/ai",async(req,res)=>{
    const data = await axios.get("http://localhost:3000/api/quiz?topic=sql&numQuestions=10");
    const questions = data.data.data.questions;
    // const result = JSON.stringify(questions)
    // console.log(result)
    // res.render('quiz',{text:result});
    res.json(questions)
})



app.listen(port,()=>{
    console.log(`Listening on port ${port}`);
})