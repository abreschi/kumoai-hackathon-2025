import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { MockUser, MockCartItem, MockProduct, MockRecipe, MockDeliveryPrediction, loadUsersFromCSV, loadProductsFromCSV, mockInitialCarts, mockRecommendations, mockRecipes, mockDeliveryPredictions } from '@/lib/mockApi';

interface AppContextType {
  activeUserID: string;
  setActiveUserID: (id: string) => void;
  users: MockUser[];
  cartItems: MockCartItem[];
  recommendations: MockProduct[];
  recipes: MockRecipe[];
  deliveryPredictions: MockDeliveryPrediction | null;
  updateCartItemQuantity: (id: number, quantity: number) => void;
  removeCartItem: (id: number) => void;
  addToCart: (product: MockProduct) => void;
  updateCartItemSubstitution: (id: number, allowSubstitutions: boolean) => void;
  cartTotal: number;
  itemCount: number;
  allProducts: MockProduct[];
  generateRecipes: () => Promise<void>;
  aiGeneratedRecipes: any[];
  isGeneratingRecipes: boolean;
  isLoadingCart: boolean;
  substitutionRates: Map<number, number>;
  getSubstitutionRate: (productId: number) => number | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider = ({ children }: AppProviderProps) => {
  const [activeUserID, setActiveUserID] = useState<string>("1");
  const [users, setUsers] = useState<MockUser[]>([]);
  const [cartItems, setCartItems] = useState<MockCartItem[]>([]);
  const [allProducts, setAllProducts] = useState<MockProduct[]>([]);
  const [aiGeneratedRecipes, setAiGeneratedRecipes] = useState<any[]>([]);
  const [isGeneratingRecipes, setIsGeneratingRecipes] = useState(false);
  const [isLoadingCart, setIsLoadingCart] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [substitutionRates, setSubstitutionRates] = useState<Map<number, number>>(new Map());

  // Load users and products from CSV on mount
  useEffect(() => {
    if (dataLoaded) return; // Prevent multiple loads
    
    const loadData = async () => {
      const [loadedUsers, loadedProducts] = await Promise.all([
        loadUsersFromCSV(),
        loadProductsFromCSV()
      ]);
      
      let finalUsers: MockUser[];
      if (loadedUsers.length > 0) {
        finalUsers = loadedUsers;
        setUsers(loadedUsers);
      } else {
        // Fallback to hardcoded users if CSV loading fails
        finalUsers = [
          { user_id: 1, household_size: 1, dietary_preference: "none", primary_shopping_day: "Monday" },
          { user_id: 2, household_size: 2, dietary_preference: "vegetarian", primary_shopping_day: "Sunday" },
          { user_id: 3, household_size: 1, dietary_preference: "none", primary_shopping_day: "Wednesday" },
          { user_id: 4, household_size: 1, dietary_preference: "none", primary_shopping_day: "Saturday" }
        ];
        setUsers(finalUsers);
      }
      
      // Always set a random user on initial load
      if (finalUsers.length > 0) {
        const randomIndex = Math.floor(Math.random() * finalUsers.length);
        const randomUserId = finalUsers[randomIndex].user_id.toString();
        setActiveUserID(randomUserId);
      }
      
      if (loadedProducts.length > 0) {
        setAllProducts(loadedProducts);
      }
      
      setDataLoaded(true);
    };
    loadData();
  }, [dataLoaded, activeUserID]);

  // Fetch cart predictions from AI service
  const fetchCartPredictions = async (userId: string) => {
    try {
      setIsLoadingCart(true);
      setCartItems([]); // Clear cart immediately when switching users
      const response = await fetch(`/api/predict/cart/${userId}?numItems=20`);
      if (response.ok) {
        const predictions = await response.json();
        
        // Split predictions: all except last 3 for cart, last 3 for recommendations
        const numForRecommendations = Math.min(3, predictions.length);
        const cartPredictions = predictions.slice(0, predictions.length - numForRecommendations);
        const recommendationPredictions = predictions.slice(-numForRecommendations);
        
        // Convert cart predictions to cart items format
        const cartItems = cartPredictions.map((pred: any) => ({
          id: pred.product_id,
          product_id: pred.product_id,
          product_name: pred.product_name,
          brand: pred.brand || "Unknown",
          quantity: pred.quantity || 1,
          price_per_unit: pred.price_per_unit,
          allow_substitutions: undefined // Will be set when user interacts with cart item
        }));
        setCartItems(cartItems);
        
        // Batch fetch substitution rates for all cart items
        if (cartItems.length > 0) {
          fetchBatchSubstitutionRates(cartItems.map((item: MockCartItem) => item.product_id));
        }
        
        // Convert remaining predictions to recommendations format
        const recommendationItems = recommendationPredictions.map((pred: any) => ({
          product_id: pred.product_id,
          product_name: pred.product_name,
          brand: pred.brand || "Unknown",
          category: pred.category || "Unknown",
          size: pred.size || "1 unit",
          unit: pred.unit || "unit",
          price_per_unit: pred.price_per_unit
        }));
        setRecommendations(recommendationItems);
      } else {
        console.warn('AI service unavailable, using fallback data');
        const userCart = mockInitialCarts[userId] || [];
        setCartItems(userCart);
      }
    } catch (error) {
      console.error('Failed to fetch cart predictions:', error);
      const userCart = mockInitialCarts[userId] || [];
      setCartItems(userCart);
    } finally {
      setIsLoadingCart(false);
    }
  };

  // Batch fetch substitution rates to avoid individual API calls
  const fetchBatchSubstitutionRates = async (productIds: number[]) => {
    try {
      const response = await fetch('/api/products/substitution-rates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productIds }),
      });
      
      if (response.ok) {
        const rates = await response.json();
        const newRates = new Map(substitutionRates);
        
        // Update the rates map with new data
        Object.entries(rates).forEach(([productId, rate]) => {
          newRates.set(parseInt(productId), rate as number);
        });
        
        setSubstitutionRates(newRates);
      }
    } catch (error) {
      console.error('Failed to fetch batch substitution rates:', error);
    }
  };

  // Helper function to get substitution rate for a product
  const getSubstitutionRate = (productId: number): number | null => {
    return substitutionRates.get(productId) || null;
  };

  // Update cart when user changes and clear recipes
  useEffect(() => {
    if (dataLoaded && activeUserID) {
      fetchCartPredictions(activeUserID);
      setAiGeneratedRecipes([]); // Clear AI recipes when user changes
      setRecommendations([]); // Clear recommendations when user changes
    }
  }, [activeUserID, dataLoaded]);

  const [recommendations, setRecommendations] = useState<MockProduct[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);

  // Fetch recommendations from AI service
  const fetchRecommendations = async (userId: string) => {
    try {
      setIsLoadingRecommendations(true);
      const response = await fetch(`/api/predict/recommendations/${userId}?numItems=3`);
      if (response.ok) {
        const predictions = await response.json();
        setRecommendations(predictions);
      } else {
        console.warn('AI service unavailable for recommendations, using fallback data');
        const userRecommendations = mockRecommendations[userId] || [];
        setRecommendations(userRecommendations);
      }
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
      const userRecommendations = mockRecommendations[userId] || [];
      setRecommendations(userRecommendations);
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  // Recommendations are now set along with cart predictions, no separate fetch needed

  // Get current user data (still using mock data for recipes and delivery predictions)
  const recipes = mockRecipes[activeUserID] || [];
  const deliveryPredictions = mockDeliveryPredictions[activeUserID] || null;

  // Cart calculations
  const cartTotal = cartItems.reduce((total, item) => total + (item.price_per_unit * item.quantity), 0);
  const itemCount = cartItems.reduce((count, item) => count + item.quantity, 0);

  // Cart management functions
  const updateCartItemQuantity = (id: number, quantity: number) => {
    if (quantity <= 0) {
      removeCartItem(id);
      return;
    }
    setCartItems(prev => prev.map(item => 
      item.id === id ? { ...item, quantity } : item
    ));
  };

  const removeCartItem = (id: number) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const addToCart = (product: MockProduct) => {
    // Check for existing item by name, brand, and size to handle different sizes properly
    const existingItem = cartItems.find(item => 
      item.product_name === product.product_name && 
      item.brand === product.brand && 
      item.product_id === product.product_id
    );
    if (existingItem) {
      updateCartItemQuantity(existingItem.id, existingItem.quantity + 1);
    } else {
      const newItem: MockCartItem = {
        id: Date.now(), // Simple ID generation for demo
        product_id: product.product_id,
        product_name: product.product_name,
        brand: product.brand,
        price_per_unit: product.price_per_unit,
        quantity: 1,
        allow_substitutions: false // Default to no substitutions for manually added items
      };
      setCartItems(prev => [...prev, newItem]);
    }
  };

  const updateCartItemSubstitution = (id: number, allowSubstitutions: boolean) => {
    setCartItems(prev => prev.map(item => 
      item.id === id ? { ...item, allow_substitutions: allowSubstitutions } : item
    ));
  };

  const generateRecipes = async () => {
    try {
      setIsGeneratingRecipes(true);
      const response = await fetch('/api/recipes/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cartItems, userId: parseInt(activeUserID) }),
      });

      if (response.ok) {
        const data = await response.json();
        setAiGeneratedRecipes(data.recipes);
      } else {
        console.error('Failed to generate recipes');
        setAiGeneratedRecipes([]);
      }
    } catch (error) {
      console.error('Recipe generation error:', error);
      setAiGeneratedRecipes([]);
    } finally {
      setIsGeneratingRecipes(false);
    }
  };

  return (
    <AppContext.Provider value={{
      activeUserID,
      setActiveUserID,
      users,
      cartItems,
      recommendations,
      recipes,
      deliveryPredictions,
      updateCartItemQuantity,
      removeCartItem,
      addToCart,
      updateCartItemSubstitution,
      cartTotal,
      itemCount,
      allProducts,
      generateRecipes,
      aiGeneratedRecipes,
      isGeneratingRecipes,
      isLoadingCart,
      substitutionRates,
      getSubstitutionRate
    }}>
      {children}
    </AppContext.Provider>
  );
};
