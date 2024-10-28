// Required dependencies
import express from 'express';
import { GoogleGenerativeAI,SchemaType } from '@google/generative-ai';
import 'dotenv/config';

const app = express();
const port = process.env.PORT || 3000;

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Middleware
app.use(express.json());

// Helper function to parse Gemini response into structured quiz format
const parseQuizResponse = (response) => {
  try {
    console.log('Raw response:', response); // Debug log

    // Remove all markdown code block indicators and any whitespace before the JSON
    let cleanResponse = response
      // Remove trailing commas between properties
      .replace(/,(\s*[}\]])/g, '$1')
      // Remove trailing commas at the end of arrays/objects
      .replace(/,(\s*})/g, '$1')
      .trim();                              // Remove extra whitespace

    console.log('Cleaned response:', cleanResponse); // Debug log

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


// Function to generate quiz prompt for a specific topic
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

// Route to get quiz questions
app.get('/api/quiz', async (req, res) => {
  try {
    const { topic = 'general knowledge', numQuestions = 5 } = req.query;

    // Get Gemini model
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    // Generate prompt
    const prompt = generateQuizPrompt(topic, numQuestions);

    // Get response from Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse and validate the response
    const quizData = parseQuizResponse(text);

    // Send the formatted quiz data
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

// Route to get quiz categories
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Something went wrong!',
    message: err.message
  });
});

app.listen(port, () => {
  console.log(`Quiz API server running on port ${port}`);
});