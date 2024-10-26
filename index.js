import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import bodyParser from 'body-parser';
const app = express();
const port = 8080;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(bodyParser.urlencoded({extended:true}))
app.use('/public',express.static(path.join(__dirname,'/public')));
app.set('views',path.join(__dirname,'views'));
app.set('view engine','ejs');
const api_key = process.env.GEMINI_API_KEY;

async function get_ai(user_prompt){
    const gen_ai = new GoogleGenerativeAI(api_key);
    const model = gen_ai.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = user_prompt;
    const result = await model.generateContent(prompt);
    const message = result.response.text();
    return message;
}








app.get("/home",(req,res)=>{
    res.render('home');
})

app.get("/login",(req,res)=>{
    res.render('login')
})

app.get("/ai",async(req,res)=>{
    const prompt = `"I would like to create a quiz on the topic of python with 10 questions. Please format the quiz data in JSON, following this refined schema:
    {
  "quiz": {
    "topic": "[insert topic]",
    "total_questions": [insert number],
    "questions": [
      {
        "question_id": 1,
        "type": "multiple_choice",
        "text": "Enter question text here",
        "options": [
          { "label": "A", "text": "Option A text here" },
          { "label": "B", "text": "Option B text here" },
          { "label": "C", "text": "Option C text here" },
          { "label": "D", "text": "Option D text here" }
        ],
        "correct_answer": "A"
      },
      
    ]
  }
}

    `;
    const result =await get_ai(prompt);
    res.render('quiz',{text:result})
})



app.listen(port,()=>{
    console.log(`Listening on port ${port}`);
})