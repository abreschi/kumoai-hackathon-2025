import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { Wand2, Loader2, CheckCircle, Heart, BookOpen, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";

export const InspireMeModal = () => {
  const { generateRecipes, addToCart, aiGeneratedRecipes, isGeneratingRecipes, cartItems } = useAppContext();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());
  const [savedRecipes, setSavedRecipes] = useState<Set<string>>(new Set());

  // Generate recipes only when modal first opens and clear added items
  useEffect(() => {
    if (open && cartItems.length > 0) {
      generateRecipes();
    }
    if (open) {
      setAddedItems(new Set()); // Clear added items when modal opens
    }
  }, [open]);

  const handleAddItem = (product: any) => {
    addToCart({ 
      product_id: product.product_id || Date.now(), 
      product_name: product.product_name, 
      price_per_unit: product.price_per_unit,
      category: product.category || "Grocery",
      brand: product.brand || "Fresh Market",
      size: product.size || "1 unit",
      unit: product.unit || "unit"
    });
    
    // Add visual feedback using a unique identifier
    const uniqueKey = `${product.product_name}-${product.brand}-${product.size}`;
    setAddedItems(prev => new Set([...Array.from(prev), uniqueKey]));
    toast({
      title: "Added to cart!",
      description: `${product.product_name} - $${product.price_per_unit.toFixed(2)}`,
      duration: 2000,
    });
    
    // Remove the added state after 3 seconds
    setTimeout(() => {
      setAddedItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(uniqueKey);
        return newSet;
      });
    }, 3000);
  };

  const handleAddAllItems = (items: Array<any>) => {
    items.forEach(item => {
      addToCart({ 
        product_id: item.product_id || Date.now(), 
        product_name: item.product_name, 
        price_per_unit: item.price_per_unit,
        category: item.category || "Grocery",
        brand: item.brand || "Fresh Market",
        size: item.size || "1 unit",
        unit: item.unit || "unit"
      });
      
      // Add visual feedback for each item
      setAddedItems(prev => new Set([...Array.from(prev), item.product_name]));
    });
    
    const totalPrice = items.reduce((sum, item) => sum + item.price_per_unit, 0);
    toast({
      title: `Added ${items.length} items to cart!`,
      description: `Total: $${totalPrice.toFixed(2)}`,
      duration: 3000,
    });
    
    // Remove added states after 3 seconds
    setTimeout(() => {
      setAddedItems(new Set());
    }, 3000);
  };

  const handleSaveRecipe = (recipeTitle: string) => {
    setSavedRecipes(prev => new Set([...Array.from(prev), recipeTitle]));
    toast({
      title: "Recipe saved!",
      description: `"${recipeTitle}" has been saved to your recipe collection`,
      duration: 3000,
    });
    
    // In a real app, this would save to a database or local storage
    console.log('Saving recipe:', recipeTitle);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-accent text-white px-4 py-2 text-sm font-medium hover:bg-yellow-600 transition-colors">
          ✨ Inspire Me
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Wand2 className="w-5 h-5 text-accent mr-2" />
            Recipe Inspiration
          </DialogTitle>
          <DialogDescription>
            AI-generated recipes based on your cart items. Add ingredients directly to your cart!
          </DialogDescription>
        </DialogHeader>
        
        <div className="overflow-y-auto flex-1 p-1">
          {isGeneratingRecipes ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-accent mr-3" />
              <span className="text-lg">Generating personalized recipes with AI...</span>
            </div>
          ) : cartItems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Add some items to your cart first to get recipe inspiration!</p>
            </div>
          ) : aiGeneratedRecipes.length > 0 ? (
            <div className="space-y-6">
              {aiGeneratedRecipes.map((recipe, index) => (
                <div key={index} className="border rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">{recipe.title}</h3>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={savedRecipes.has(recipe.title) ? "default" : "outline"}
                        onClick={() => handleSaveRecipe(recipe.title)}
                        disabled={savedRecipes.has(recipe.title)}
                      >
                        {savedRecipes.has(recipe.title) ? (
                          <>
                            <BookOpen className="w-3 h-3 mr-1" />
                            Saved
                          </>
                        ) : (
                          <>
                            <Heart className="w-3 h-3 mr-1" />
                            Save Recipe
                          </>
                        )}
                      </Button>
                      <span className="text-sm text-muted-foreground">{recipe.cookingTime} • {recipe.difficulty}</span>
                    </div>
                  </div>
                  
                  <p className="text-muted-foreground mb-4">{recipe.description}</p>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Ingredients:</h4>
                      <ul className="space-y-1 text-sm">
                        {recipe.ingredients?.map((ingredient: any, i: number) => (
                          <li key={i} className={ingredient.inCart ? "text-green-600 font-medium" : "text-muted-foreground"}>
                            {ingredient.amount} {ingredient.name} 
                            {ingredient.inCart && " ✓"}
                          </li>
                        ))}
                      </ul>
                      
                      {recipe.additionalIngredients?.length > 0 && (
                        <div className="mt-4">
                          <h5 className="font-medium mb-2">Missing Ingredients (Personalized):</h5>
                          <div className="space-y-3">
                            {recipe.additionalIngredients.map((ingredient: any, i: number) => (
                              <div key={i} className="p-3 bg-yellow-50 rounded-lg border">
                                <div className="font-medium text-gray-800 mb-2">{ingredient.name}</div>
                                <div className="space-y-2">
                                  {ingredient.options?.map((option: any, optIdx: number) => (
                                    <div key={optIdx} className="flex items-center justify-between text-sm bg-white p-2 rounded border">
                                      <div className="flex-1">
                                        <div className="font-medium">{option.product_name}</div>
                                        <div className="text-xs text-muted-foreground">
                                          {option.brand} • {option.size}
                                        </div>
                                        {option.kumo_rank && (
                                          <div className="text-xs text-blue-600 font-medium">
                                            Rank #{option.kumo_rank} for you
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 ml-2">
                                        <span className="text-muted-foreground">${option.price_per_unit.toFixed(2)}</span>
                                        <Button 
                                          size="sm" 
                                          variant={addedItems.has(`${option.product_name}-${option.brand}-${option.size}`) ? "default" : "outline"}
                                          onClick={() => handleAddItem(option)}
                                          disabled={addedItems.has(`${option.product_name}-${option.brand}-${option.size}`)}
                                        >
                                          {addedItems.has(`${option.product_name}-${option.brand}-${option.size}`) ? (
                                            <>
                                              <CheckCircle className="w-3 h-3 mr-1" />
                                              Added
                                            </>
                                          ) : (
                                            "Add"
                                          )}
                                        </Button>
                                      </div>
                                    </div>
                                  )) || (
                                    // Fallback for old format
                                    <div className="flex items-center justify-between text-sm bg-white p-2 rounded border">
                                      <div>
                                        <span className="font-medium">{ingredient.product_name}</span>
                                        <div className="text-xs text-muted-foreground">
                                          {ingredient.brand} • {ingredient.size}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">${ingredient.price_per_unit.toFixed(2)}</span>
                                        <Button 
                                          size="sm" 
                                          variant={addedItems.has(`${ingredient.product_name}-${ingredient.brand}-${ingredient.size}`) ? "default" : "outline"}
                                          onClick={() => handleAddItem(ingredient)}
                                          disabled={addedItems.has(`${ingredient.product_name}-${ingredient.brand}-${ingredient.size}`)}
                                        >
                                          {addedItems.has(`${ingredient.product_name}-${ingredient.brand}-${ingredient.size}`) ? (
                                            <>
                                              <CheckCircle className="w-3 h-3 mr-1" />
                                              Added
                                            </>
                                          ) : (
                                            "Add"
                                          )}
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                            <Button 
                              size="sm" 
                              className="w-full mt-2"
                              onClick={() => {
                                const topChoices = recipe.additionalIngredients.map((ing: any) => 
                                  ing.options?.find((opt: any) => (opt.kumo_rank || 999) === 1) || 
                                  ing.options?.[0] || 
                                  ing
                                );
                                handleAddAllItems(topChoices);
                              }}
                              disabled={recipe.additionalIngredients.every((ing: any) => {
                                const topChoice = ing.options?.find((opt: any) => (opt.kumo_rank || 999) === 1) || 
                                               ing.options?.[0] || 
                                               ing;
                                return addedItems.has(topChoice.product_name);
                              })}
                            >
                              {recipe.additionalIngredients.every((ing: any) => {
                                const topChoice = ing.options?.find((opt: any) => (opt.kumo_rank || 999) === 1) || 
                                               ing.options?.[0] || 
                                               ing;
                                return addedItems.has(topChoice.product_name);
                              }) ? (
                                <>
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  All Top Choices Added
                                </>
                              ) : (
                                "Add Top Personalized Choices"
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Instructions:</h4>
                      <ol className="space-y-1 text-sm list-decimal list-inside">
                        {recipe.instructions?.map((step: string, i: number) => (
                          <li key={i} className="text-muted-foreground">{step}</li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No recipes generated. Try adding more items to your cart!</p>
            </div>
          )}
        </div>
        
        {/* Done button at bottom - fixed within modal */}
        <div className="border-t pt-4 mt-4 flex-shrink-0">
          <Button 
            onClick={() => setOpen(false)} 
            className="w-full"
            variant="default"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
