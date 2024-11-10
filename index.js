import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import bodyParser from 'body-parser';
import axios from 'axios';
import session from 'express-session'; // Add this import

const app = express();
const port = 8080;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Add session middleware
app.use(session({
    secret: 'your-secret-key',
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

app.get("/home",(req,res)=>{
    res.render('home');
});

app.get("/form",(req,res)=>{
    res.render('form');
});

app.get("/login",(req,res)=>{
    res.render('login');
});

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

app.post('/create-quiz', async (req, res) => {
    try {
        const topic = req.body.topic;
        const num = req.body.questionCount;
        const response = await axios.get(`http://localhost:8080/api/quiz?topic=${topic}&numQuestions=${num}`);
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
    
    questions.forEach((question, index) => {
        // Get user's answer for this question (handle both array and single answer formats)
        const userAnswer = userAnswers[`question${question.id}`];
        const isCorrect = userAnswer === question.correctAnswer;
        
        results.detailedResults.push({
            questionNumber: question.id,
            question: question.question,
            userAnswer: userAnswer || 'No answer provided',
            correctAnswer: question.correctAnswer,
            isCorrect: isCorrect
        });
        
        if (isCorrect) {
            results.correctAnswers++;
        } else {
            results.wrongAnswers++;
        }
    });
    
    results.score = Math.round((results.correctAnswers / results.totalQuestions) * 100);
    
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

app.listen(port,()=>{
    console.log(`Listening on port ${port}`);
});