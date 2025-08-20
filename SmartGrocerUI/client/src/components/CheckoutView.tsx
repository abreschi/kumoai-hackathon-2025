import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

import { useAppContext } from "@/contexts/AppContext";
import { CreditCard, Clock, Calendar, Package, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";

interface CheckoutViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CheckoutView = ({ open, onOpenChange }: CheckoutViewProps) => {
  const { cartItems, cartTotal, deliveryPredictions, activeUserID } = useAppContext();
  const { toast } = useToast();
  const [deliveryMethod, setDeliveryMethod] = useState(deliveryPredictions?.predicted_method || "delivery");
  const [isLoadingPreference, setIsLoadingPreference] = useState(false);
  const [deliveryTimes, setDeliveryTimes] = useState<any[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("");
  const [isLoadingTimes, setIsLoadingTimes] = useState(false);

  
  const deliveryFee = deliveryMethod === "delivery" ? 3.99 : 0;
  const finalTotal = cartTotal + deliveryFee;

  // Fetch user's last delivery preference and time slots when modal opens
  useEffect(() => {
    if (open && activeUserID) {
      fetchUserDeliveryPreference();
      fetchDeliveryTimes();
    }
  }, [open, activeUserID]);

  const fetchUserDeliveryPreference = async () => {
    try {
      setIsLoadingPreference(true);
      const response = await fetch(`/api/user/${activeUserID}/delivery-preference`);
      if (response.ok) {
        const data = await response.json();
        setDeliveryMethod(data.deliveryMethod);
      }
    } catch (error) {
      console.error('Failed to fetch delivery preference:', error);
    } finally {
      setIsLoadingPreference(false);
    }
  };

  const updateUserDeliveryPreference = async (method: string) => {
    try {
      await fetch(`/api/user/${activeUserID}/delivery-preference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveryMethod: method }),
      });
    } catch (error) {
      console.error('Failed to update delivery preference:', error);
    }
  };

  const fetchDeliveryTimes = async () => {
    try {
      setIsLoadingTimes(true);
      console.log('Fetching delivery times for user:', activeUserID);
      
      // Get user's timezone
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      const response = await fetch(`/api/predict/delivery-times/${activeUserID}?timezone=${encodeURIComponent(userTimezone)}`);
      if (response.ok) {
        const times = await response.json();
        console.log('Received delivery times:', times);
        setDeliveryTimes(times);
        // Auto-select the first (highest-scored) time slot
        if (times.length > 0) {
          setSelectedTimeSlot(`${times[0].date_label}-${times[0].time_window}`);
        }
      } else {
        console.error('Failed to fetch delivery times:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch delivery times:', error);
    } finally {
      console.log('Setting loading to false');
      setIsLoadingTimes(false);
    }
  };

  const handleDeliveryMethodChange = (method: string) => {
    setDeliveryMethod(method);
    updateUserDeliveryPreference(method); // Save preference immediately
  };

  const handleCompleteOrder = () => {
    // Show success toast notification
    toast({
      title: "Order completed successfully!",
      description: `${cartItems.length} items ordered for ${deliveryMethod === 'delivery' ? 'delivery' : 'pickup'} • Total: $${finalTotal.toFixed(2)}`,
      duration: 5000,
    });
    
    // Close the modal
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <CreditCard className="w-5 h-5 text-primary mr-2" />
            Checkout
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8">
          {/* Order Summary */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
            <div className="space-y-3 mb-4 max-h-60 lg:max-h-80 overflow-y-auto">
              {cartItems.map(item => (
                <div key={item.id} className="border-b border-gray-100 pb-3 mb-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">{item.product_name} ({item.quantity}x)</span>
                    <span className="font-medium">${(item.price_per_unit * item.quantity).toFixed(2)}</span>
                  </div>
                  {item.allow_substitutions !== undefined && (
                    <div className="flex items-center mt-1 text-xs text-gray-500">
                      <Package className="w-3 h-3 mr-1" />
                      {item.allow_substitutions ? "Substitutions allowed" : "No substitutions"}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="border-t border-gray-200 pt-4 space-y-2">
              <div className="flex justify-between items-center">
                <span>Subtotal:</span>
                <span className="font-medium">${cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Delivery Fee:</span>
                <span className="font-medium">${deliveryFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total:</span>
                <span className="text-primary">${finalTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Delivery Options */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delivery Options</h3>
            <RadioGroup value={deliveryMethod} onValueChange={handleDeliveryMethodChange} className="space-y-3 mb-6">
              <div className={`border rounded-lg p-4 ${deliveryMethod === "delivery" ? "border-primary bg-green-50" : "border-gray-300"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="delivery" id="delivery" />
                    <div>
                      <Label htmlFor="delivery" className="font-medium text-gray-900">
                        Delivery
                        {deliveryPredictions?.predicted_method === "delivery" && (
                          <span className="ml-2 bg-primary text-white text-xs px-2 py-1 rounded-full">
                            Recommended
                          </span>
                        )}
                      </Label>
                      <p className="text-sm text-gray-600">
                        {deliveryPredictions?.predicted_time_window || "Next available slot"}
                      </p>
                    </div>
                  </div>
                  <span className="font-medium text-gray-900">$3.99</span>
                </div>
              </div>
              
              <div className={`border rounded-lg p-4 ${deliveryMethod === "pickup" ? "border-primary bg-green-50" : "border-gray-300"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="pickup" id="pickup" />
                    <div>
                      <Label htmlFor="pickup" className="font-medium text-gray-900">
                        Pickup
                        {deliveryPredictions?.predicted_method === "pickup" && (
                          <span className="ml-2 bg-primary text-white text-xs px-2 py-1 rounded-full">
                            Recommended
                          </span>
                        )}
                      </Label>
                      <p className="text-sm text-gray-600">Store pickup available</p>
                    </div>
                  </div>
                  <span className="font-medium text-gray-900">Free</span>
                </div>
              </div>
            </RadioGroup>

            {/* Delivery Time Selection */}
            {deliveryMethod === "delivery" && (
              <div className="mt-6">
                <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  Select Delivery Time
                </h4>
                
                {isLoadingTimes ? (
                  <div className="text-sm text-gray-600">Loading optimal time slots...</div>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    <RadioGroup value={selectedTimeSlot} onValueChange={setSelectedTimeSlot} className="space-y-2">
                      {deliveryTimes.map((slot, index) => (
                        <div key={`${slot.date_label}-${slot.time_window}`} 
                             className={`border rounded-lg p-3 ${selectedTimeSlot === `${slot.date_label}-${slot.time_window}` ? "border-primary bg-green-50" : "border-gray-300"}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <RadioGroupItem value={`${slot.date_label}-${slot.time_window}`} id={`slot-${index}`} />
                              <div>
                                <Label htmlFor={`slot-${index}`} className="font-medium text-gray-900 flex items-center">
                                  <Calendar className="w-3 h-3 mr-1" />
                                  {slot.date_label} {slot.time_window}
                                  {index === 0 && (
                                    <span className="ml-2 bg-primary text-white text-xs px-2 py-1 rounded-full">
                                      AI Recommended
                                    </span>
                                  )}
                                </Label>
                                <p className="text-xs text-gray-600">
                                  Personalized prediction based on your history
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </RadioGroup>
                    
                    <Button variant="outline" className="w-full mt-3" disabled>
                      Choose another delivery day/time (Coming Soon)
                    </Button>
                  </div>
                )}
              </div>
            )}

            <Button 
              onClick={handleCompleteOrder}
              className="w-full bg-primary text-white py-3 px-6 font-semibold hover:bg-primary-dark transition-colors mt-6"
            >
              Complete Order - ${finalTotal.toFixed(2)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
