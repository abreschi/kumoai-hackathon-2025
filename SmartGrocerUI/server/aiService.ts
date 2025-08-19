import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface CartPrediction {
  product_id: number;
  product_name: string;
  quantity: number;
  price_per_unit: number;
  confidence: number;
  reason?: string;
}

export interface ProductRecommendation {
  product_id: number;
  product_name: string;
  category: string;
  brand: string;
  size: string;
  unit: string;
  price_per_unit: number;
  confidence: number;
}

export class AIService {
  private pythonPath: string;
  private scriptPath: string;
  private substitutionRateCache = new Map<number, number>();

  constructor() {
    this.pythonPath = 'python'; // Use 'python' for Replit
    this.scriptPath = path.join(__dirname, '../python/kumo_predictions.py');
  }

  async predictCartItems(userId: number, numItems: number = 5): Promise<CartPrediction[]> {
    try {
      const result = await this.runPythonScript('cart', userId.toString(), numItems.toString());
      return JSON.parse(result) as CartPrediction[];
    } catch (error) {
      console.error('Error predicting cart items:', error);
      return [];
    }
  }

  async predictRecommendations(userId: number, numItems: number = 3): Promise<ProductRecommendation[]> {
    try {
      const result = await this.runPythonScript('recommendations', userId.toString(), numItems.toString());
      return JSON.parse(result) as ProductRecommendation[];
    } catch (error) {
      console.error('Error predicting recommendations:', error);
      return [];
    }
  }

  async predictDeliveryTimes(userId: number, timezone: string = 'UTC', numSlots: number = 3): Promise<any[]> {
    try {
      const result = await this.runPythonScript('delivery-times', userId.toString(), numSlots.toString(), timezone);
      return JSON.parse(result);
    } catch (error) {
      console.error('Error predicting delivery times:', error);
      return [];
    }
  }

  async getProductSubstitutionRate(productId: number): Promise<number> {
    try {
      // Check cache first
      if (this.substitutionRateCache.has(productId)) {
        return this.substitutionRateCache.get(productId)!;
      }

      const result = await this.runPythonScript('substitution-rate', productId.toString(), '1');
      const rate = parseFloat(result.trim());
      
      // Cache the result
      this.substitutionRateCache.set(productId, rate);
      return rate;
    } catch (error) {
      console.error('Error getting substitution rate:', error);
      const defaultRate = 0.05; // Default 5% substitution rate
      this.substitutionRateCache.set(productId, defaultRate);
      return defaultRate;
    }
  }

  async getBatchSubstitutionRates(productIds: number[]): Promise<{[key: number]: number}> {
    try {
      const results: {[key: number]: number} = {};
      const uncachedIds: number[] = [];

      // Check cache for existing rates
      for (const productId of productIds) {
        if (this.substitutionRateCache.has(productId)) {
          results[productId] = this.substitutionRateCache.get(productId)!;
        } else {
          uncachedIds.push(productId);
        }
      }

      // Fetch uncached rates in batch
      if (uncachedIds.length > 0) {
        const batchResult = await this.runPythonScript('batch-substitution-rates', uncachedIds.join(','), '1');
        const batchRates = JSON.parse(batchResult) as {[key: string]: number};
        
        // Cache and add new results
        for (const [productIdStr, rate] of Object.entries(batchRates)) {
          const productId = parseInt(productIdStr);
          this.substitutionRateCache.set(productId, rate);
          results[productId] = rate;
        }
      }

      return results;
    } catch (error) {
      console.error('Error getting batch substitution rates:', error);
      // Return default rates for all requested products
      const defaultResults: {[key: number]: number} = {};
      for (const productId of productIds) {
        const defaultRate = 0.05; // Default 5% substitution rate
        this.substitutionRateCache.set(productId, defaultRate);
        defaultResults[productId] = defaultRate;
      }
      return defaultResults;
    }
  }

  private runPythonScript(command: string, userId: string, numItems: string, timezone?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Set the working directory to the project root so Python can find CSV files
      const options = {
        cwd: path.join(__dirname, '..')
      };
      
      const args = [this.scriptPath, command, userId, numItems];
      if (timezone) {
        args.push(timezone);
      }
      
      const python = spawn(this.pythonPath, args, options);
      
      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      python.on('close', (code) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error(`Python script failed with code ${code}: ${stderr}`));
        }
      });

      python.on('error', (error) => {
        reject(new Error(`Failed to start Python script: ${error.message}`));
      });
    });
  }

  async initializeGraph(): Promise<boolean> {
    try {
      // Run a test command to initialize the graph
      await this.runPythonScript('cart', '1', '1');
      console.log('Kumo graph initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Kumo graph:', error);
      return false;
    }
  }
}

export const aiService = new AIService();