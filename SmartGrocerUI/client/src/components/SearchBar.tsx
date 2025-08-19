import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ArrowRight } from "lucide-react";

export const SearchBar = () => {
  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-30">
      <div className="bg-surface border border-gray-300 rounded-full shadow-lg px-4 py-2 flex items-center space-x-3 min-w-96">
        <Search className="w-4 h-4 text-gray-400" />
        <Input 
          type="text" 
          placeholder="Search for products..." 
          className="flex-1 border-none outline-none shadow-none text-sm bg-transparent p-0 focus-visible:ring-0"
        />
        <Button size="sm" className="bg-primary text-white p-2 rounded-full hover:bg-primary-dark transition-colors">
          <ArrowRight className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
};
