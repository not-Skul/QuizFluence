import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import bodyParser from 'body-parser';
import axios from 'axios';
import session from 'express-session'; // Add this import
import mongoose from 'mongoose';
import QuizFluence from "./models/schema.js"

// mongodb connection

const connectDB = async()=>{
    await mongoose.connect(`${process.env.MONGO_URL}`)

    console.log(`the db is connected with ${mongoose.connection.host}`)
}

connectDB()

const app = express();
const port = 8080;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Add session middleware
app.use(session({
    secret: process.env.GEMINI_API_KEY,
    resave: false,
    saveUninitialized: true
}));

app.use(bodyParser.urlencoded({extended:true}));
app.use('/public',express.static(path.join(__dirname,'/public')));
app.set('views',path.join(__dirname,'views'));
app.set('view engine','ejs');
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ... Keep your existing parseQuizResponse and generateQuizPrompt functions ...

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

const generateQuizPrompt = (topic, numQuestions,diff) => {
return `Generate a quiz of ${diff} level about ${topic} with ${numQuestions} questions. 
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
});

app.get('/users',async(req,res)=>{
    let allusers = await QuizFluence.find({});
    res.send(allusers["username"]);
 })

app.get("/form",(req,res)=>{
    res.render('form');
});

app.get("/login",(req,res)=>{
    res.render('login');
});

app.get('/api/quiz', async (req, res) => {
    try {
        const { topic, numQuestions,diff} = req.query;
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        const prompt = generateQuizPrompt(topic, numQuestions,diff);
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

app.post('/create-quiz', async (req, res) => {
    try {
        const topic = req.body.topic;
        const num = req.body.questionCount;
        const diff = req.body.Dlevel;
        const response = await axios.get(`http://localhost:8080/api/quiz?topic=${topic}&numQuestions=${num}&diff=${diff}`);
        const quizData = response.data.data;
        
        // Store quiz data in session for later result calculation
        req.session.quizData = quizData;
        
        res.render('questions', { 
            questions: quizData.questions,
            topic: quizData.topic 
        });
    } catch (error) {
        console.error('Error fetching questions:', error);
        res.status(500).send('Error fetching questions');
    }
});

app.post("/result", (req, res) => {
    try {
        const userAnswers = req.body;
        const quizData = req.session.quizData;
        
        if (!quizData) {
            throw new Error('Quiz data not found in session');
        }

        // Calculate results
        const results = calculateResults(userAnswers, quizData.questions);
        
        res.render('result', {
            score: results.score,
            totalQuestions: results.totalQuestions,
            correctAnswers: results.correctAnswers,
            wrongAnswers: results.wrongAnswers,
            detailedResults: results.detailedResults,
            topic: quizData.topic
        });
    } catch (error) {
        console.error('Error calculating results:', error);
        res.status(500).send('Error calculating quiz results');
    }
});

function calculateResults(userAnswers, questions) {
    const results = {
        totalQuestions: questions.length,
        correctAnswers: 0,
        wrongAnswers: 0,
        detailedResults: [],
        score: 0
    };
    
    questions.forEach((question) => {
        // Flexible answer retrieval
        const userAnswer = userAnswers[question.id] || userAnswers[`question${question.id}`];
        
        // Normalize answers 
        const normalizedUserAnswer = userAnswer ? String(userAnswer).trim() : null;
        const normalizedCorrectAnswer = String(question.correctAnswer).trim();
        
        const isCorrect = normalizedUserAnswer === normalizedCorrectAnswer;
        
        results.detailedResults.push({
            questionNumber: question.id,
            question: question.question,
            userAnswer: normalizedUserAnswer || 'No answer provided',
            correctAnswer: normalizedCorrectAnswer,
            isCorrect: isCorrect
        });
        
        if (isCorrect) {
            results.correctAnswers++;
        } else {
            results.wrongAnswers++;
        }
    });
    
    // Score is now simply the number of correct answers
    results.score = results.correctAnswers;
    
    return results;
}

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        error: 'Something went wrong!',
        message: err.message
    });
});

app.get("/",(req,res)=>{
    res.render('signup')
})

app.get('/about',(req,res)=>{
    res.render('about')
})

app.post("/newuser",async(req,res)=>{
    let {username, password} = req.body;
    let newBlog = await QuizFluence.create({username, password});
    res.redirect('home')
})

app.listen(port,()=>{
    console.log(`Listening on port ${port}`);
});