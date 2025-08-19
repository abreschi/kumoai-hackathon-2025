import { Button } from "@/components/ui/button";
import { MockProduct } from "@/lib/mockApi";
import { Plus } from "lucide-react";

interface ProductCardProps {
  product: MockProduct;
  onAdd: (product: MockProduct) => void;
}

export const ProductCard = ({ product, onAdd }: ProductCardProps) => {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-primary hover:shadow-md transition-all cursor-pointer">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-gray-900 text-sm">{product.product_name}</h3>
        <span className="text-primary font-semibold text-sm">${product.price_per_unit.toFixed(2)}</span>
      </div>
      <div className="text-xs text-gray-500 mb-1">{product.brand} - {product.size}</div>
      <p className="text-xs text-gray-600 mb-3">Recommended for you</p>
      <Button 
        onClick={() => onAdd(product)} 
        className="w-full bg-primary text-white py-2 px-3 text-xs font-medium hover:bg-primary-dark transition-colors"
        size="sm"
      >
        <Plus className="w-3 h-3 mr-1" />
        Add to Cart
      </Button>
    </div>
  );
};
