import OpenAI from "openai";
import { findPersonalizedIngredientsForRecipe } from "./ragService";

// Initialize OpenAI client
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

export interface RecipeIngredient {
  name: string;
  amount: string;
  inCart: boolean;
}

export interface PersonalizedProduct {
  product_id: number;
  product_name: string;
  brand: string;
  category: string;
  size: string;
  unit: string;
  price_per_unit: number;
  kumo_rank?: number;
}

export interface PersonalizedIngredient {
  name: string;
  options: PersonalizedProduct[];
}

export interface GeneratedRecipe {
  title: string;
  description: string;
  cookingTime: string;
  difficulty: string;
  ingredients: RecipeIngredient[];
  instructions: string[];
  additionalIngredients: PersonalizedIngredient[];
}

export async function generateRecipesFromCart(cartItems: any[], userId: number): Promise<GeneratedRecipe[]> {
  try {
    // Extract cart ingredients
    const cartIngredients = cartItems.map(item => item.product_name).join(", ");
    
    const prompt = `You are a creative chef AI. Generate exactly 2 simple, delicious recipes using these ingredients from the user's cart: ${cartIngredients}

For each recipe:
1. Use at least 2-3 ingredients from the cart
2. Add at most 3 additional common ingredients that would complement the dish
3. Keep recipes simple (30 minutes or less)
4. Provide clear instructions
5. For additional ingredients, suggest common grocery items (like "olive oil", "salt", "onions", "garlic", etc.)

IMPORTANT: 
- Mark cart ingredients as "inCart": true
- Mark missing ingredients as "inCart": false  
- The "additionalIngredients" array should contain ONLY the exact names of ingredients marked as "inCart": false
- Ensure perfect consistency between the ingredients list and additionalIngredients array

Respond with valid JSON in this exact format:
{
  "recipes": [
    {
      "title": "Recipe Name",
      "description": "Brief description of the dish",
      "cookingTime": "25 minutes",
      "difficulty": "Easy",
      "ingredients": [
        {"name": "ingredient from cart", "amount": "1 cup", "inCart": true},
        {"name": "olive oil", "amount": "2 tbsp", "inCart": false},
        {"name": "salt", "amount": "1 tsp", "inCart": false}
      ],
      "instructions": ["Step 1", "Step 2", "Step 3"],
      "additionalIngredients": ["olive oil", "salt"]
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a helpful chef assistant. Always respond with valid JSON only, no additional text."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
      temperature: 0.8
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    const rawRecipes = result.recipes || [];

    // Use enhanced RAG + KumoRFM to find personalized ingredients
    const enhancedRecipes = await Promise.all(rawRecipes.map(async (recipe: any) => {
      if (recipe.additionalIngredients && Array.isArray(recipe.additionalIngredients)) {
        // Find personalized ingredient options using RAG + Kumo
        const personalizedIngredients = await findPersonalizedIngredientsForRecipe(
          recipe.additionalIngredients, 
          userId
        );
        
        recipe.additionalIngredients = personalizedIngredients;
      } else {
        // Fallback: extract missing ingredients from the ingredients list
        const missingIngredients = recipe.ingredients
          ?.filter((ing: any) => !ing.inCart)
          ?.map((ing: any) => ing.name) || [];
          
        if (missingIngredients.length > 0) {
          const personalizedIngredients = await findPersonalizedIngredientsForRecipe(
            missingIngredients, 
            userId
          );
          recipe.additionalIngredients = personalizedIngredients;
        }
      }
      return recipe;
    }));

    return enhancedRecipes;

  } catch (error) {
    console.error("OpenAI recipe generation failed:", error);
    
    // Fallback recipes based on common cart items
    return [
      {
        title: "Quick Stir-Fry",
        description: "A simple and nutritious stir-fry using your cart ingredients",
        cookingTime: "15 minutes",
        difficulty: "Easy",
        ingredients: [
          { name: cartItems[0]?.product_name || "Fresh Vegetables", amount: "2 cups", inCart: true },
          { name: "Soy Sauce", amount: "2 tbsp", inCart: false },
          { name: "Garlic", amount: "2 cloves", inCart: false }
        ],
        instructions: [
          "Heat oil in a large pan",
          "Add ingredients from your cart",
          "Stir-fry for 5-7 minutes",
          "Season with soy sauce and garlic",
          "Serve hot"
        ],
        additionalIngredients: []
      }
    ];
  }
}