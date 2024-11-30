import mongoose from "mongoose";

let Schema = new mongoose.Schema(
    {
        password:{
            type: String,
            trim: true,
            required: true
        },
        username:{
            type: String,
            trim: true, 
            required: true
        }

    }
)

const QuizFluence = mongoose.model('QuizFluence',Schema); 
export default QuizFluence;