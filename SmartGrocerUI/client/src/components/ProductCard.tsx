import { Button } from "@/components/ui/button";
import { MockProduct } from "@/lib/mockApi";
import { Plus, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface ProductCardProps {
  product: MockProduct;
  onAdd: (product: MockProduct) => void;
}

export const ProductCard = ({ product, onAdd }: ProductCardProps) => {
  const { toast } = useToast();
  const [isAdded, setIsAdded] = useState(false);

  const handleAdd = () => {
    onAdd(product);
    
    // Show success toast
    toast({
      title: "Added to cart!",
      description: `${product.product_name} - $${product.price_per_unit.toFixed(2)}`,
      duration: 2000,
    });

    // Show visual feedback
    setIsAdded(true);
    
    // Remove added state after 3 seconds
    setTimeout(() => {
      setIsAdded(false);
    }, 3000);
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-primary hover:shadow-md transition-all cursor-pointer">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-gray-900 text-sm">{product.product_name}</h3>
        <span className="text-primary font-semibold text-sm">${product.price_per_unit.toFixed(2)}</span>
      </div>
      <div className="text-xs text-gray-500 mb-1">{product.brand} - {product.size}</div>
      <p className="text-xs text-gray-600 mb-3">Recommended for you</p>
      <Button 
        onClick={handleAdd}
        variant={isAdded ? "default" : "default"}
        disabled={isAdded}
        className="w-full bg-primary text-white py-2 px-3 text-xs font-medium hover:bg-primary-dark transition-colors"
        size="sm"
      >
        {isAdded ? (
          <>
            <CheckCircle className="w-3 h-3 mr-1" />
            Added
          </>
        ) : (
          <>
            <Plus className="w-3 h-3 mr-1" />
            Add to Cart
          </>
        )}
      </Button>
    </div>
  );
};
