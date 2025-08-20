import { UserProfileSwitcher } from "@/components/UserProfileSwitcher";
import { ProductCard } from "@/components/ProductCard";
import { CartItem } from "@/components/CartItem";
import { InspireMeModal } from "@/components/InspireMeModal";
import { CheckoutView } from "@/components/CheckoutView";
import { SearchBar } from "@/components/SearchBar";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Star, Brain, CreditCard } from "lucide-react";
import { useState } from "react";

export default function Home() {
  const { 
    cartItems, 
    recommendations, 
    updateCartItemQuantity, 
    removeCartItem, 
    addToCart, 
    updateCartItemSubstitution,
    cartTotal, 
    itemCount,
    isLoadingCart 
  } = useAppContext();
  
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-surface shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <ShoppingCart className="text-primary text-xl" />
                <h1 className="text-xl font-bold text-gray-900">Smart Grocer</h1>
              </div>
              <span className="hidden sm:inline-block text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                KumoAI Hackathon Demo 2025
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <UserProfileSwitcher />
              <Button 
                onClick={() => setCheckoutOpen(true)}
                className="bg-primary text-white px-4 py-2 text-sm font-medium hover:bg-primary-dark transition-colors"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Checkout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Shopping Cart */}
          <div className="lg:col-span-2">
            <div className="bg-surface rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  <ShoppingCart className="text-primary mr-2 inline-block" />
                  Your Cart
                </h2>
                <InspireMeModal />
              </div>

              {/* Cart Items List */}
              <div className="space-y-4" id="cart-items">
                {isLoadingCart ? (
                  <div className="text-center py-8 text-gray-500">
                    🧠 AI is personalizing your cart...
                  </div>
                ) : cartItems.length > 0 ? (
                  cartItems.map(item => (
                    <CartItem
                      key={item.id}
                      item={item}
                      onQuantityChange={updateCartItemQuantity}
                      onRemove={removeCartItem}
                      onUpdateSubstitution={updateCartItemSubstitution}
                    />
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Your cart is empty. Add some products to get started!
                  </div>
                )}
              </div>

              {/* Cart Summary */}
              {cartItems.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>Total:</span>
                    <span className="text-primary">${cartTotal.toFixed(2)}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {itemCount} item{itemCount !== 1 ? 's' : ''} in cart
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Recommendations */}
          <div className="lg:col-span-1">
            <div className="bg-surface rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                <Star className="text-accent mr-2 inline-block" />
                Recommended for You
              </h2>
              
              <div className="space-y-3" id="recommendations">
                {recommendations.map(product => (
                  <ProductCard
                    key={product.product_id}
                    product={product}
                    onAdd={addToCart}
                  />
                ))}
              </div>

              {/* Personalization Indicator */}
              <div className="mt-6 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <Brain className="text-green-600 mr-2 w-4 h-4" />
                  <span className="text-xs text-green-800 font-medium">
                    AI-powered recommendations based on your shopping history
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Checkout Modal */}
      <CheckoutView open={checkoutOpen} onOpenChange={setCheckoutOpen} />

      {/* Search Bar */}
      <SearchBar />
    </div>
  );
}
