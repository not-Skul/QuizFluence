import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
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

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
app.use(express.json());
const parseQuizResponse = (response) => {
    try {
  
      // Remove all markdown code block indicators and any whitespace before the JSON
      let cleanResponse = response
        // Remove trailing commas between properties
        .replace(/,(\s*[}\]])/g, '$1')
        // Remove trailing commas at the end of arrays/objects
        .replace(/,(\s*})/g, '$1')
        .trim();                              // Remove extra whitespace

      // Find the JSON object boundaries
      const startIndex = cleanResponse.indexOf('{');
      const endIndex = cleanResponse.lastIndexOf('}') + 1;
      
      if (startIndex === -1 || endIndex === -1) {
        throw new Error('No valid JSON object found in response');
      }
      
      // Extract only the JSON part
      const jsonStr = cleanResponse.slice(startIndex, endIndex);
      
      console.log('JSON string to parse:', jsonStr); // Debug log
  
      // Parse the cleaned JSON
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error('Error details:', {
        originalResponse: response,
        error: error.message
      });
      throw new Error(`Failed to parse quiz data: ${error.message}`);
    }
  };

const generateQuizPrompt = (topic, numQuestions) => {
return `Generate a quiz about ${topic} with ${numQuestions} questions. 
Return the response in the following JSON format only:
{
    "topic": "${topic}",
    "questions": [
    {
        "id": 1,
        "question": "Question text here",
        "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
        "correctAnswer": "Correct option here",
    }
    ]
}`;
};

app.get("/home",(req,res)=>{
    res.render('home');
})

app.get("/login",(req,res)=>{
    res.render('login')
})

app.get('/api/quiz', async (req, res) => {
    try {
      const { topic = 'general knowledge', numQuestions = 5 } = req.query;
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      const prompt = generateQuizPrompt(topic, numQuestions);
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      const quizData = parseQuizResponse(text);
      res.json({
        success: true,
        data: quizData
      });
    } catch (error) {
      console.error('Error generating quiz:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate quiz',
        message: error.message
      });
    }
  });

app.get('/api/categories', (req, res) => {
  const categories = [
    'General Knowledge',
    'Science',
    'History',
    'Geography',
    'Technology',
    'Sports',
    'Arts',
    'Literature'
  ];
  res.json({
    success: true,
    data: categories
  });
});

app.get("/ai",async(req,res)=>{
    const data = await axios.get("http://localhost:8080/api/quiz?topic=sql&numQuestions=10");
    const questions = data.data.data;
    // const result = JSON.stringify(questions)
    // console.log(result)
    // res.render('quiz',{text:result});
    res.json(questions)
})

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
      success: false,
      error: 'Something went wrong!',
      message: err.message
    });
  });

app.listen(port,()=>{
    console.log(`Listening on port ${port}`);
})