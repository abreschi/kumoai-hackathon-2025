import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppContext } from "@/contexts/AppContext";

export const UserProfileSwitcher = () => {
  const { activeUserID, setActiveUserID, users } = useAppContext();

  return (
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-2">
        <label htmlFor="user-select" className="text-sm font-medium text-gray-700">
          Active User:
        </label>
        <Select value={activeUserID} onValueChange={setActiveUserID}>
          <SelectTrigger className="w-64 bg-surface border-gray-300">
            <SelectValue placeholder="Select user" />
          </SelectTrigger>
          <SelectContent>
            {users.map(user => (
              <SelectItem key={user.user_id} value={user.user_id.toString()}>
                {user.user_id} - Household: {user.household_size}, Diet: {user.dietary_preference}, Shops: {user.primary_shopping_day}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
