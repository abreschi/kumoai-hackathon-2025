import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { MockCartItem } from "@/lib/mockApi";
import { useAppContext } from "@/contexts/AppContext";
import { Minus, Plus, Trash2, Package } from "lucide-react";
import { useState, useEffect } from "react";

interface CartItemProps {
  item: MockCartItem;
  onQuantityChange: (id: number, quantity: number) => void;
  onRemove: (id: number) => void;
  onUpdateSubstitution: (id: number, allowSubstitutions: boolean) => void;
}

export const CartItem = ({ item, onQuantityChange, onRemove, onUpdateSubstitution }: CartItemProps) => {
  const { getSubstitutionRate } = useAppContext();
  const [allowSubstitutions, setAllowSubstitutions] = useState<boolean>(item.allow_substitutions ?? false);
  
  // Get substitution rate from context (batch-loaded)
  const substitutionRate = getSubstitutionRate(item.product_id);

  // Set default substitution preference based on rate when available
  useEffect(() => {
    if (substitutionRate !== null && item.allow_substitutions === undefined) {
      const defaultValue = substitutionRate > 0.08;
      setAllowSubstitutions(defaultValue);
      onUpdateSubstitution(item.id, defaultValue);
    }
  }, [substitutionRate, item.allow_substitutions, item.id, onUpdateSubstitution]);

  const handleSubstitutionChange = (checked: boolean) => {
    setAllowSubstitutions(checked);
    onUpdateSubstitution(item.id, checked);
  };

  return (
    <div className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">{item.product_name}</h3>
          <p className="text-xs text-gray-500 mb-1">{item.brand}</p>
          <p className="text-sm text-gray-600">${item.price_per_unit.toFixed(2)} each</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center border border-gray-300 rounded-lg">
            <Button
              variant="ghost"
              size="sm"
              className="p-2 hover:bg-gray-100 transition-colors"
              onClick={() => onQuantityChange(item.id, item.quantity - 1)}
            >
              <Minus className="w-3 h-3 text-gray-600" />
            </Button>
            <span className="px-3 py-2 text-sm font-medium">{item.quantity}</span>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 hover:bg-gray-100 transition-colors"
              onClick={() => onQuantityChange(item.id, item.quantity + 1)}
            >
              <Plus className="w-3 h-3 text-gray-600" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-700 p-2"
            onClick={() => onRemove(item.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Substitution preference - show for all items with defined preferences or loaded rates */}
      {(substitutionRate !== null || item.allow_substitutions !== undefined) && (
        <div className="flex items-center text-xs text-gray-600">
          <Checkbox
            id={`substitution-${item.id}`}
            checked={allowSubstitutions}
            onCheckedChange={handleSubstitutionChange}
            className="mr-2"
          />
          <Label htmlFor={`substitution-${item.id}`} className="flex items-center cursor-pointer">
            <Package className="w-3 h-3 mr-1" />
            {allowSubstitutions ? "Allow substitutions" : "Do not substitute"}
          </Label>
        </div>
      )}
    </div>
  );
};
