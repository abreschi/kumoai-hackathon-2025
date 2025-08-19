import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { aiService } from "./aiService";
import { generateRecipesFromCart } from "./recipeService";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize Kumo AI graph on startup
  console.log('Initializing Kumo AI graph...');
  await aiService.initializeGraph();

  // AI Prediction Routes
  app.get('/api/predict/cart/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const numItems = parseInt(req.query.numItems as string) || 5;
      
      const predictions = await aiService.predictCartItems(userId, numItems);
      res.json(predictions);
    } catch (error) {
      console.error('Cart prediction error:', error);
      res.status(500).json({ error: 'Failed to predict cart items' });
    }
  });

  app.get('/api/predict/recommendations/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const numItems = parseInt(req.query.numItems as string) || 3;
      
      const recommendations = await aiService.predictRecommendations(userId, numItems);
      res.json(recommendations);
    } catch (error) {
      console.error('Recommendation prediction error:', error);
      res.status(500).json({ error: 'Failed to predict recommendations' });
    }
  });

  // Health check for AI service
  app.get('/api/ai/health', async (req, res) => {
    try {
      const isHealthy = await aiService.initializeGraph();
      res.json({ 
        status: isHealthy ? 'healthy' : 'degraded',
        kumoAvailable: isHealthy,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ 
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Recipe generation route
  app.post('/api/recipes/generate', async (req, res) => {
    try {
      const { cartItems, userId } = req.body;
      
      if (!cartItems || !Array.isArray(cartItems)) {
        return res.status(400).json({ error: 'Cart items are required' });
      }
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required for personalization' });
      }

      const recipes = await generateRecipesFromCart(cartItems, userId);
      res.json({ recipes });
    } catch (error) {
      console.error('Recipe generation error:', error);
      res.status(500).json({ error: 'Failed to generate recipes' });
    }
  });

  // Batch product substitution rates route
  app.post('/api/products/substitution-rates', async (req, res) => {
    try {
      const { productIds } = req.body;
      if (!Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({ error: 'Product IDs array is required' });
      }
      
      const rates = await aiService.getBatchSubstitutionRates(productIds);
      res.json(rates);
    } catch (error: any) {
      console.error('Batch substitution rate error:', error);
      res.status(500).json({ error: 'Failed to get substitution rates' });
    }
  });

  // Single product substitution rate route (kept for backwards compatibility)
  app.get('/api/product/:productId/substitution-rate', async (req, res) => {
    try {
      const productId = parseInt(req.params.productId);
      if (isNaN(productId)) {
        return res.status(400).json({ error: 'Invalid product ID' });
      }
      
      const substitutionRate = await aiService.getProductSubstitutionRate(productId);
      res.json({ productId, substitutionRate });
    } catch (error: any) {
      console.error('Substitution rate error:', error);
      res.status(500).json({ error: 'Failed to get substitution rate' });
    }
  });

  // Delivery time prediction route
  app.get('/api/predict/delivery-times/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }
      
      const userTimezone = req.query.timezone as string || 'UTC';
      const predictions = await aiService.predictDeliveryTimes(userId, userTimezone);
      res.json(predictions);
    } catch (error: any) {
      console.error('Delivery time prediction error:', error);
      res.status(500).json({ error: 'Failed to predict delivery times' });
    }
  });

  // User delivery preference routes
  app.get('/api/user/:userId/delivery-preference', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }
      
      const lastMethod = await storage.getUserLastDeliveryMethod(userId);
      res.json({ deliveryMethod: lastMethod || 'delivery' }); // Default to delivery
    } catch (error) {
      console.error('Get delivery preference error:', error);
      res.status(500).json({ error: 'Failed to get delivery preference' });
    }
  });

  app.post('/api/user/:userId/delivery-preference', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { deliveryMethod } = req.body;
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }
      
      if (!deliveryMethod || !['delivery', 'pickup'].includes(deliveryMethod)) {
        return res.status(400).json({ error: 'Invalid delivery method' });
      }
      
      await storage.updateUserDeliveryMethod(userId, deliveryMethod);
      res.json({ success: true });
    } catch (error) {
      console.error('Update delivery preference error:', error);
      res.status(500).json({ error: 'Failed to update delivery preference' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
