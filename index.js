import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const port = 8080;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname,'public')));
app.set('views',path.join(__dirname,'views'));
app.set('view engine','ejs');

app.get("/home",(req,res)=>{
    res.render('home');
})

app.listen(port,()=>{
    console.log(`Listening on port ${port}`);
})