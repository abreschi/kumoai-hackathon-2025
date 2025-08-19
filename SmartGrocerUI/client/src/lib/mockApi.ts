import Papa from 'papaparse';

export interface MockUser {
  user_id: number;
  household_size: number;
  dietary_preference: string;
  primary_shopping_day: string;
}

export interface MockProduct {
  product_id: number;
  product_name: string;
  category: string;
  brand: string;
  size: string;
  unit: string;
  price_per_unit: number;
}

export interface MockCartItem {
  id: number;
  product_id?: number; // Add product_id for substitution rate lookup
  product_name: string;
  brand: string;
  quantity: number;
  price_per_unit: number;
  allow_substitutions?: boolean; // Add substitution preference
}

export interface MockRecipe {
  id: number;
  title: string;
  description: string;
  missingItems: Array<{
    product_name: string;
    price_per_unit: number;
  }>;
}

export interface MockDeliveryPrediction {
  predicted_method: string;
  predicted_time_window: string;
}

// Mock data based on CSV structure
export const mockInitialCarts: Record<string, MockCartItem[]> = {
  "1": [
    { id: 1, product_name: "Organic Fuji Apples", brand: "Nature's Best", quantity: 2, price_per_unit: 3.49 },
    { id: 2, product_name: "Fresh Carrots", brand: "Garden Fresh", quantity: 1, price_per_unit: 0.99 }
  ],
  "2": [
    { id: 3, product_name: "Vivid Red Tomatoes", brand: "Sunny Farms", quantity: 1, price_per_unit: 2.99 },
    { id: 4, product_name: "Sweet Bell Peppers", brand: "Farmhouse", quantity: 2, price_per_unit: 2.49 }
  ],
  "3": [
    { id: 5, product_name: "Organic Fuji Apples", brand: "Nature's Best", quantity: 1, price_per_unit: 3.49 },
    { id: 6, product_name: "Fresh Carrots", brand: "Garden Fresh", quantity: 3, price_per_unit: 0.99 }
  ],
  "4": [
    { id: 7, product_name: "Sweet Bell Peppers", brand: "Farmhouse", quantity: 1, price_per_unit: 2.49 },
    { id: 8, product_name: "Vivid Red Tomatoes", brand: "Sunny Farms", quantity: 1, price_per_unit: 2.99 }
  ]
};

export const mockRecommendations: Record<string, MockProduct[]> = {
  "1": [
    { product_id: 1, product_name: "Organic Fuji Apples", category: "Produce", brand: "Nature's Best", size: "3 lb", unit: "lb", price_per_unit: 3.49 },
    { product_id: 3, product_name: "Fresh Carrots", category: "Produce", brand: "Garden Fresh", size: "1 lb", unit: "lb", price_per_unit: 0.99 }
  ],
  "2": [
    { product_id: 2, product_name: "Vivid Red Tomatoes", category: "Produce", brand: "Sunny Farms", size: "2 lb", unit: "lb", price_per_unit: 2.99 },
    { product_id: 4, product_name: "Sweet Bell Peppers", category: "Produce", brand: "Farmhouse", size: "1.5 lb", unit: "lb", price_per_unit: 2.49 }
  ],
  "3": [
    { product_id: 3, product_name: "Fresh Carrots", category: "Produce", brand: "Garden Fresh", size: "1 lb", unit: "lb", price_per_unit: 0.99 },
    { product_id: 1, product_name: "Organic Fuji Apples", category: "Produce", brand: "Nature's Best", size: "3 lb", unit: "lb", price_per_unit: 3.49 }
  ],
  "4": [
    { product_id: 4, product_name: "Sweet Bell Peppers", category: "Produce", brand: "Farmhouse", size: "1.5 lb", unit: "lb", price_per_unit: 2.49 },
    { product_id: 2, product_name: "Vivid Red Tomatoes", category: "Produce", brand: "Sunny Farms", size: "2 lb", unit: "lb", price_per_unit: 2.99 }
  ]
};

export const mockRecipes: Record<string, MockRecipe[]> = {
  "1": [
    {
      id: 1,
      title: "Fresh Garden Salad",
      description: "Simple and healthy salad perfect for a single person.",
      missingItems: [
        { product_name: "Vivid Red Tomatoes", price_per_unit: 2.99 },
        { product_name: "Sweet Bell Peppers", price_per_unit: 2.49 }
      ]
    }
  ],
  "2": [
    {
      id: 2,
      title: "Vegetarian Stir Fry",
      description: "Colorful vegetable stir fry perfect for vegetarian households.",
      missingItems: [
        { product_name: "Organic Fuji Apples", price_per_unit: 3.49 },
        { product_name: "Fresh Carrots", price_per_unit: 0.99 }
      ]
    }
  ],
  "3": [
    {
      id: 3,
      title: "Simple Roasted Vegetables",
      description: "Basic roasted vegetable dish that's budget-friendly.",
      missingItems: [
        { product_name: "Sweet Bell Peppers", price_per_unit: 2.49 }
      ]
    }
  ],
  "4": [
    {
      id: 4,
      title: "Gourmet Vegetable Medley",
      description: "Elevated vegetable dish with premium produce.",
      missingItems: [
        { product_name: "Organic Fuji Apples", price_per_unit: 3.49 }
      ]
    }
  ]
};

export const mockDeliveryPredictions: Record<string, MockDeliveryPrediction> = {
  "1": { predicted_method: "delivery", predicted_time_window: "Saturday 5pm-7pm" },
  "2": { predicted_method: "pickup", predicted_time_window: "Sunday 9am-11am" },
  "3": { predicted_method: "pickup", predicted_time_window: "Friday 3pm-5pm" },
  "4": { predicted_method: "delivery", predicted_time_window: "Same day 1pm-3pm" }
};

// CSV loading functions
export const loadUsersFromCSV = async (): Promise<MockUser[]> => {
  try {
    const response = await fetch('/data/users.csv');
    const csvText = await response.text();
    
    return new Promise((resolve) => {
      Papa.parse<any>(csvText, {
        header: true,
        complete: (results) => {
          const users = results.data
            .filter(row => row.user_id && row.household_size)
            .map(row => ({
              user_id: parseInt(row.user_id),
              household_size: parseInt(row.household_size),
              dietary_preference: row.dietary_preference?.trim() || '',
              primary_shopping_day: row.primary_shopping_day?.trim() || ''
            }));
          resolve(users);
        },
        transformHeader: (header) => header.trim()
      });
    });
  } catch (error) {
    console.error('Error loading users CSV:', error);
    return [];
  }
};

export const loadProductsFromCSV = async (): Promise<MockProduct[]> => {
  try {
    const response = await fetch('/data/products.csv');
    const csvText = await response.text();
    
    return new Promise((resolve) => {
      Papa.parse<any>(csvText, {
        header: true,
        complete: (results) => {
          const products = results.data
            .filter(row => row.product_id && row.product_name)
            .map(row => ({
              product_id: parseInt(row.product_id),
              product_name: row.product_name?.trim() || '',
              category: row.category?.trim() || '',
              brand: row.brand?.trim() || '',
              size: row.size?.trim() || '',
              unit: row.unit?.trim() || '',
              price_per_unit: parseFloat(row.price_per_unit) || 0
            }));
          resolve(products);
        },
        transformHeader: (header) => header.trim()
      });
    });
  } catch (error) {
    console.error('Error loading products CSV:', error);
    return [];
  }
};
