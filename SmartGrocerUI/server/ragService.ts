import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

interface Product {
  product_id: number;
  product_name: string;
  brand: string;
  category: string;
  size: string;
  unit: string;
  price_per_unit: number;
}

let productsCache: Product[] = [];

// Load products data once on startup
async function loadProducts(): Promise<Product[]> {
  if (productsCache.length > 0) {
    return productsCache;
  }

  try {
    const csvPath = path.join(process.cwd(), 'client', 'public', 'data', 'products.csv');
    const csvData = fs.readFileSync(csvPath, 'utf8');
    
    // Simple CSV parsing without Papa Parse
    const lines = csvData.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''));
    const products: Product[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/['"]/g, ''));
      if (values.length >= headers.length) {
        const product: any = {};
        headers.forEach((header, index) => {
          if (header === 'product_id') {
            product[header] = parseInt(values[index]) || 0;
          } else if (header === 'price_per_unit') {
            product[header] = parseFloat(values[index]) || 0;
          } else {
            product[header] = values[index] || '';
          }
        });
        products.push(product as Product);
      }
    }

    // Deduplicate products based on name, brand, and size (ignore price)
    const deduplicationMap = new Map<string, Product>();
    
    products.forEach(product => {
      // Create deduplication key from name, brand, and size
      const key = `${product.product_name.toLowerCase().trim()}|${product.brand.toLowerCase().trim()}|${product.size.toLowerCase().trim()}`;
      
      if (!deduplicationMap.has(key)) {
        deduplicationMap.set(key, product);
      } else {
        // Keep the product with the lower price if duplicates exist
        const existingProduct = deduplicationMap.get(key)!;
        if (product.price_per_unit < existingProduct.price_per_unit) {
          deduplicationMap.set(key, product);
        }
      }
    });

    productsCache = Array.from(deduplicationMap.values());
    console.log(`Loaded ${products.length} products, deduplicated to ${productsCache.length} products for RAG matching`);
    return productsCache;
  } catch (error) {
    console.error('Failed to load products for RAG:', error);
    return [];
  }
}

// Enhanced text similarity function with ingredient mapping
function calculateSimilarity(text1: string, text2: string): number {
  const normalize = (text: string) => text.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  
  const normalized1 = normalize(text1);
  const normalized2 = normalize(text2);
  
  // Exact match
  if (normalized1 === normalized2) return 1.0;
  
  // Contains match
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) return 0.8;
  
  // Enhanced ingredient mapping for better matches
  const ingredientMappings: { [key: string]: string[] } = {
    'mixed nuts': ['nuts', 'peanuts', 'almonds', 'cashews'],
    'dark chocolate': ['chocolate', 'cocoa'],
    'nuts': ['peanuts', 'almonds', 'cashews', 'mixed'],
    'chocolate': ['cocoa', 'dark', 'milk chocolate'],
    'cheese': ['cheddar', 'mozzarella', 'parmesan'],
    'herbs': ['basil', 'oregano', 'thyme', 'parsley'],
    'spices': ['pepper', 'salt', 'paprika', 'cumin']
  };
  
  // Check ingredient mappings
  for (const [ingredient, synonyms] of Object.entries(ingredientMappings)) {
    if (normalized1.includes(ingredient)) {
      for (const synonym of synonyms) {
        if (normalized2.includes(synonym)) return 0.7;
      }
    }
    if (normalized2.includes(ingredient)) {
      for (const synonym of synonyms) {
        if (normalized1.includes(synonym)) return 0.7;
      }
    }
  }
  
  // Word overlap
  const words1 = normalized1.split(/\s+/);
  const words2 = normalized2.split(/\s+/);
  const commonWords = words1.filter(word => words2.includes(word));
  
  if (commonWords.length > 0) {
    return 0.5 * (commonWords.length / Math.max(words1.length, words2.length));
  }
  
  // Character similarity (basic)
  const maxLength = Math.max(normalized1.length, normalized2.length);
  let matches = 0;
  for (let i = 0; i < Math.min(normalized1.length, normalized2.length); i++) {
    if (normalized1[i] === normalized2[i]) matches++;
  }
  
  return 0.2 * (matches / maxLength);
}

// Find best matching products for an ingredient
export async function findMatchingProducts(ingredientName: string, maxResults: number = 3): Promise<Product[]> {
  const products = await loadProducts();
  
  if (products.length === 0) {
    return [];
  }
  
  // Calculate similarity scores for all products
  const scoredProducts = products.map(product => ({
    product,
    score: Math.max(
      calculateSimilarity(ingredientName, product.product_name),
      calculateSimilarity(ingredientName, product.category),
      calculateSimilarity(ingredientName, product.brand)
    )
  }));
  
  // Sort by similarity score and return top matches (lowered threshold)
  const matches = scoredProducts
    .filter(item => item.score > 0.2) // Lower minimum similarity threshold
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(item => item.product);
  
  return matches;
}

// Enhanced ingredient matching with category hints
export async function findIngredientsForRecipe(ingredientNames: string[]): Promise<{ [key: string]: Product[] }> {
  const results: { [key: string]: Product[] } = {};
  
  for (const ingredient of ingredientNames) {
    const matches = await findMatchingProducts(ingredient, 1); // Get best match only
    if (matches.length > 0) {
      results[ingredient] = matches;
    }
  }
  
  return results;
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

// Create personalized Kumo graph for specific products
async function createPersonalizedKumoGraph(productIds: number[], userId: number): Promise<PersonalizedProduct[]> {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python3', [
      'python/kumo_personalized_ingredients.py',
      JSON.stringify(productIds),
      userId.toString()
    ]);

    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(output);
          resolve(result);
        } catch (error) {
          console.error('Failed to parse Kumo personalized result:', error);
          resolve([]);
        }
      } else {
        console.error('Kumo personalized ingredients failed:', errorOutput);
        resolve([]);
      }
    });

    pythonProcess.on('error', (error) => {
      console.error('Failed to start Kumo personalized process:', error);
      resolve([]);
    });
  });
}

// Enhanced RAG + KumoRFM integration for personalized ingredients
export async function findPersonalizedIngredientsForRecipe(
  ingredientNames: string[], 
  userId: number
): Promise<PersonalizedIngredient[]> {
  const results: PersonalizedIngredient[] = [];
  
  for (const ingredient of ingredientNames) {
    // Step 1: Use RAG to find top 3 matching products
    const ragMatches = await findMatchingProducts(ingredient, 3);
    
    if (ragMatches.length > 0) {
      // Step 2: Get product IDs for Kumo graph
      const productIds = ragMatches.map(p => p.product_id);
      
      // Step 3: Use KumoRFM to personalize ranking for this user
      const personalizedRanking = await createPersonalizedKumoGraph(productIds, userId);
      
      // Step 4: Merge RAG results with Kumo ranking
      const personalizedOptions: PersonalizedProduct[] = ragMatches.map((product, index) => {
        // Find Kumo ranking for this product
        const kumoResult = personalizedRanking.find(kr => kr.product_id === product.product_id);
        
        return {
          ...product,
          kumo_rank: kumoResult?.kumo_rank || (index + 1) // Fallback to RAG order
        };
      });
      
      // Sort by Kumo ranking (lower rank = higher priority)
      personalizedOptions.sort((a, b) => (a.kumo_rank || 999) - (b.kumo_rank || 999));
      
      results.push({
        name: ingredient,
        options: personalizedOptions
      });
    }
  }
  
  return results;
}

// Initialize products cache on module load
loadProducts().catch(console.error);