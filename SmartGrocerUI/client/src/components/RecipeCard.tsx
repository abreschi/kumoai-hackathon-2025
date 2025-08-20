import { Button } from "@/components/ui/button";
import { MockRecipe } from "@/lib/mockApi";
import { Plus } from "lucide-react";

interface RecipeCardProps {
  recipe: MockRecipe;
  onAddItem?: (itemName: string, price: number) => void;
  onAddAllItems?: (items: Array<{ name: string; price: number }>) => void;
}

export const RecipeCard = ({ recipe, onAddItem, onAddAllItems }: RecipeCardProps) => {
  return (
    <div className="border border-gray-200 rounded-lg p-5 hover:border-primary transition-colors">
      <h3 className="font-semibold text-gray-900 mb-2">{recipe.title}</h3>
      <p className="text-sm text-gray-600 mb-4">{recipe.description}</p>
      
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Missing Ingredients:</h4>
        <div className="space-y-2">
          {recipe.missingItems.map((item, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <span className="text-gray-700">{item.product_name}</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary hover:text-primary-dark font-medium"
                onClick={() => onAddItem?.(item.product_name, item.price_per_unit)}
              >
                <Plus className="w-3 h-3 mr-1" />
                Add ${item.price_per_unit.toFixed(2)}
              </Button>
            </div>
          ))}
        </div>
      </div>
      
      <Button
        className="w-full bg-accent text-white py-2 px-4 text-sm font-medium hover:bg-yellow-600 transition-colors"
        onClick={() => onAddAllItems?.(recipe.missingItems)}
      >
        Add All Missing Items
      </Button>
    </div>
  );
};
