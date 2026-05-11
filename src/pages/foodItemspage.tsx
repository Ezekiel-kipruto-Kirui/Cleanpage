import { useState, useEffect, useCallback, useMemo } from "react";
import { FoodItem, FoodCategory, User } from "@/services/types";
import { fetchApi } from "@/services/api";
import { getUserData } from "@/utils/auth";
import { ROUTES } from "@/services/Routes";
import { API_BASE_URL } from "@/services/url";

const FOOD_URL = "food-items/";
const CATEGORIES_URL = "food-categories/";

export default function FoodItems() {
  // User State
  const [user, setUser] = useState<User | null>(null);
  
  // Data States
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [categories, setCategories] = useState<FoodCategory[]>([]);
  
  // UI Loading States
  const [loadingFood, setLoadingFood] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); 
  
  const [error, setError] = useState<string | null>(null);
  
  // Modal States
  const [isFoodModalOpen, setIsFoodModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [currentFoodItem, setCurrentFoodItem] = useState<FoodItem | null>(null);
  const [currentCategory, setCurrentCategory] = useState<FoodCategory | null>(null);
  
  // Form States
  const [foodFormData, setFoodFormData] = useState({
    name: "",
    category: "", 
    total_order_price: "",
    quantity: ""
  });
  
  const [categoryFormData, setCategoryFormData] = useState({
    name: ""
  });

  // Determine if current user is Admin/Superuser
  const isAdmin = useMemo(() => {
    return user?.is_superuser || user?.user_type === 'admin' || user?.is_staff;
  }, [user]);

  // --- EFFECTS ---

  useEffect(() => {
    const userData = getUserData();
    setUser(userData);
  }, []);

  const fetchFoodItems = useCallback(async () => {
    setLoadingFood(true);
    setError(null);
    try {
      const response = await fetchApi<any>(FOOD_URL, { method: 'GET' }, 'hotel');
      const data = Array.isArray(response) ? response : (response?.results || []);

      // OPTIMIZATION: Client-side filtering for non-admin users
      let filteredData = data;
      if (user && !isAdmin) {
        filteredData = data.filter((item: FoodItem) => {
          const createdBy = item.created_by;
          if (!createdBy) return false;

          // 1. Handle Object (New server response structure)
          if (typeof createdBy === 'object') {
            const userObj = createdBy as any;
            // Prefer ID matching
            if (userObj.id !== undefined && userObj.id !== null) {
              return userObj.id === user.id;
            }
            // Fallback: Match by email if ID is missing from the nested object
            if (userObj.email && user.email) {
              return userObj.email === user.email;
            }
            return false;
          }

          // 2. Handle Number ID (Legacy)
          if (typeof createdBy === 'number') return createdBy === user.id;

          // 3. Handle String URL (Legacy)
          if (typeof createdBy === 'string') {
            const idMatch = (createdBy as string).match(/\/(\d+)\/?$/);
            if (idMatch) return parseInt(idMatch[1], 10) === user.id;
          }
          
          return false;
        });
      }

      // Sort by created_at descending
      const sortedData = filteredData.sort((a: FoodItem, b: FoodItem) => {
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        return dateB.getTime() - dateA.getTime();
      });

      setFoodItems(sortedData);
    } catch (err: any) {
      console.error("Fetch Error:", err);
      if (err.message === "Unauthorized") {
        setError("Session expired. Please login again.");
      } else {
        setError(`Failed to fetch food items: ${err.message}`);
      }
      setFoodItems([]);
    } finally {
      setLoadingFood(false);
    }
  }, [user, isAdmin]);

  const fetchCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const response = await fetchApi<any>(CATEGORIES_URL, { method: 'GET' }, 'hotel');
      const data = Array.isArray(response) ? response : (response?.results || []);
      setCategories(data);
    } catch (err: any) {
      console.error("Fetch Categories Error:", err);
      if (err.message === "Unauthorized") {
        setError("Session expired. Please login again.");
      } else {
        setError(`Failed to fetch categories: ${err.message}`);
      }
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchFoodItems();
      fetchCategories();
    }
  }, [user, fetchFoodItems, fetchCategories]);

  // --- HELPER FUNCTIONS ---

  const categoryMap = useMemo(() => {
    const map = new Map<number, string>();
    categories.forEach(cat => map.set(cat.id, cat.name));
    return map;
  }, [categories]);

  const getCategoryName = (item: FoodItem): string => {
    // Handle nested object { id, name }
    if (item.category && typeof item.category === 'object' && item.category !== null && 'name' in item.category) {
      return (item.category as any).name;
    }
    
    // Handle ID (number or string)
    let categoryId: number | null = null;
    if (typeof item.category === 'number') categoryId = item.category;
    else if (typeof item.category === 'string') categoryId = parseInt(item.category);
    else if (item.category_id) categoryId = parseInt(String(item.category_id));
    
    return categoryId !== null ? (categoryMap.get(categoryId) || 'Uncategorized') : 'Uncategorized';
  };

  // Helper to get creator name based on new server response
  const getCreatorName = (item: FoodItem): string => {
    const createdBy = item.created_by;
    if (!createdBy) return 'Unknown';

    // If it's an object with user details (New format)
    if (typeof createdBy === 'object') {
      const userObj = createdBy as any;
      
      // Construct name from first_name and last_name
      // filter(Boolean) removes empty strings/nulls so we don't get "Alice "
      const fullName = [userObj.first_name, userObj.last_name]
        .filter(Boolean) 
        .join(' ');

      if (fullName) return fullName;

      // Fallback to email if names are missing
      return userObj.email || 'Unknown User';
    }

    // Legacy Fallbacks
    if (typeof createdBy === 'number') return `User ID: ${createdBy}`;
    if (typeof createdBy === 'string') {
        const idMatch = (createdBy as string).match(/\/(\d+)\/?$/);
        if (idMatch) return `User ID: ${idMatch[1]}`;
    }

    return 'Unknown';
  };

  const parsePrice = (price: string | number | undefined): number => {
    if (!price) return 0;
    if (typeof price === 'number') return price;
    const parsed = parseFloat(price);
    return isNaN(parsed) ? 0 : parsed;
  };

  const handleDelete = async (itemId: number, url: string, type: 'food' | 'category') => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("accessToken");
      const fullUrl = `${API_BASE_URL}/Hotel/${url}${itemId}/`;
      
      const response = await fetch(fullUrl, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          setError("Session expired. Please login again.");
          window.location.href = ROUTES.login;
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (type === 'food') {
        setFoodItems(prev => prev.filter(i => i.id !== itemId));
      } else {
        setCategories(prev => prev.filter(c => c.id !== itemId));
        fetchFoodItems();
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || `Failed to delete ${type}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- FOOD ITEM OPERATIONS ---

  const openCreateFoodModal = () => {
    setCurrentFoodItem(null);
    setFoodFormData({
      name: "",
      category: categories.length > 0 ? String(categories[0].id) : "",
      total_order_price: "",
      quantity: ""
    });
    setIsFoodModalOpen(true);
  };

  const openEditFoodModal = (item: FoodItem) => {
    setCurrentFoodItem(item);
    let categoryId = "";
    
    // Logic to extract category ID from the new object structure {id, name}
    if (item.category) {
      if (typeof item.category === 'object' && item.category !== null && 'id' in item.category) {
        categoryId = String((item.category as any).id);
      } else if (typeof item.category === 'number') {
        categoryId = String(item.category);
      } else if (typeof item.category === 'string') {
        categoryId = item.category;
      }
    }
    // Fallback if category object wasn't fully populated but ID exists
    if (!categoryId && (item as any).category_id) categoryId = String((item as any).category_id);
    
    setFoodFormData({
      name: item.name,
      category: categoryId, // This pre-selects the dropdown correctly
      total_order_price: typeof item.total_order_price === 'string' ? item.total_order_price : String(item.total_order_price || 0),
      quantity: item.quantity?.toString() || ""
    });
    setIsFoodModalOpen(true);
  };

  const handleFoodInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFoodFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFoodSave = async () => {
    if (!foodFormData.name.trim() || !foodFormData.category) {
      setError("Name and Category are required");
      return;
    }
    if (!currentFoodItem && !user?.id) {
      setError("Login required to create items");
      return;
    }

    setIsSubmitting(true);
    try {
      const totalOrderPrice = parseFloat(foodFormData.total_order_price || "0");
      const quantity = parseInt(foodFormData.quantity || "0");
      
      if (isNaN(totalOrderPrice) || totalOrderPrice < 0) {
        setError("Invalid revenue amount");
        setIsSubmitting(false);
        return;
      }

      const foodData: any = {
        name: foodFormData.name,
        category: parseInt(foodFormData.category), // Sends the ID to update the category
      };
      if (foodFormData.total_order_price) foodData.total_order_price = totalOrderPrice.toFixed(2);
      if (foodFormData.quantity) foodData.quantity = quantity;
      if (!currentFoodItem && user?.id) foodData.created_by = user.id;

      if (currentFoodItem) {
        await fetchApi(`${FOOD_URL}${currentFoodItem.id}/`, { method: 'PUT', body: JSON.stringify(foodData) }, 'hotel');
      } else {
        await fetchApi(FOOD_URL, { method: 'POST', body: JSON.stringify(foodData) }, 'hotel');
      }

      setIsFoodModalOpen(false);
      fetchFoodItems();
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to save item");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- CATEGORY OPERATIONS ---

  const openCreateCategoryModal = () => {
    setCurrentCategory(null);
    setCategoryFormData({ name: "" });
    setIsCategoryModalOpen(true);
  };

  const openEditCategoryModal = (category: FoodCategory) => {
    setCurrentCategory(category);
    setCategoryFormData({ name: category.name });
    setIsCategoryModalOpen(true);
  };

  const handleCategoryInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCategoryFormData({ name: e.target.value });
  };

  const handleCategorySave = async () => {
    if (!categoryFormData.name.trim()) {
      setError("Category name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const url = currentCategory ? `${CATEGORIES_URL}${currentCategory.id}/` : CATEGORIES_URL;
      const method = currentCategory ? 'PUT' : 'POST';
      
      await fetchApi(url, { method, body: JSON.stringify({ name: categoryFormData.name }) }, 'hotel');

      setIsCategoryModalOpen(false);
      fetchCategories();
      fetchFoodItems();
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to save category");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCategoryDelete = async (catId: number) => {
    const hasItems = foodItems.some(item => {
      let id = null;
      if (typeof item.category === 'number') id = item.category;
      else if (typeof item.category === 'object') id = (item.category as any).id;
      else if (item.category_id) id = item.category_id;
      return id === catId;
    });

    if (hasItems) {
      setError("Cannot delete category with associated items.");
      return;
    }
    handleDelete(catId, CATEGORIES_URL, 'category');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">🍽️ Food Management</h1>
          <div className="flex space-x-3">
            <button onClick={openCreateCategoryModal} className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg shadow hover:bg-green-700">
              Add Category
            </button>
            <button onClick={openCreateFoodModal} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg shadow hover:bg-blue-700">
              Add Food Item
            </button>
          </div>
        </div>

        {/* Categories Section */}
        <div className="mb-8 bg-white shadow-md rounded-lg p-4">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">📁 Categories</h2>
          {loadingCategories ? (
            <div className="text-center p-4 text-gray-500">Loading categories...</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center bg-gray-100 px-4 py-2 rounded-lg group hover:bg-gray-200 transition relative">
                  <span className="font-medium">{cat.name}</span>
                  <div className="ml-3 flex space-x-1 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => openEditCategoryModal(cat)} className="text-blue-600 hover:text-blue-800 p-1" title="Edit">
                      <i className="fas fa-edit"></i>
                    </button>
                    <button onClick={() => handleCategoryDelete(cat.id)} className="text-red-600 hover:text-red-800 p-1" title="Delete">
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg border border-red-300">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="float-right font-bold">✕</button>
          </div>
        )}

        {/* Food Items Table */}
        {loadingFood ? (
          <div className="text-center p-8 text-gray-600">Loading food items...</div>
        ) : (
          <div className="overflow-x-auto bg-white shadow-md rounded-lg">
            <table className="w-full min-w-full border-collapse">
              <thead className="bg-blue-600 text-white">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Category</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Created By</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold">Total Revenue</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold">Qty Sold</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {foodItems.length > 0 ? (
                  foodItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-semibold text-gray-900">{item.name}</td>
                      <td className="px-6 py-4 text-gray-600">{getCategoryName(item)}</td>
                      {/* Created By Column - Displays formatted name */}
                      <td className="px-6 py-4 text-gray-600 text-sm">
                        {getCreatorName(item)}
                      </td>
                      <td className="px-6 py-4 text-right font-medium">
                        {parsePrice(item.total_order_price) > 0 
                          ? `Ksh ${parsePrice(item.total_order_price).toFixed(2)}` 
                          : 'Not set'}
                      </td>
                      <td className="px-6 py-4 text-center">{item.quantity || 0}</td>
                      <td className="px-6 py-4 flex justify-center space-x-2">
                        <button onClick={() => openEditFoodModal(item)} className="px-3 py-2 text-xs text-indigo-600 border border-indigo-600 rounded hover:bg-indigo-600 hover:text-white transition">
                          Edit
                        </button>
                        <button onClick={() => handleDelete(item.id, FOOD_URL, 'food')} className="px-3 py-2 text-xs text-red-600 border border-red-600 rounded hover:bg-red-600 hover:text-white transition">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-6 text-center text-gray-500 bg-gray-50">
                      No food items found. <button onClick={openCreateFoodModal} className="text-blue-600 font-bold underline">Add your first item</button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Food Item Modal */}
        {isFoodModalOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">{currentFoodItem ? 'Edit Item' : 'Create Item'}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input type="text" name="name" value={foodFormData.name} onChange={handleFoodInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select 
                    name="category" 
                    value={foodFormData.category} 
                    onChange={handleFoodInputChange} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Revenue</label>
                    <input type="number" name="total_order_price" value={foodFormData.total_order_price} onChange={handleFoodInputChange} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Qty Sold</label>
                    <input type="number" name="quantity" value={foodFormData.quantity} onChange={handleFoodInputChange} min="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button onClick={() => setIsFoodModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">Cancel</button>
                <button onClick={handleFoodSave} disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {isSubmitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Category Modal */}
        {isCategoryModalOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">{currentCategory ? 'Edit Category' : 'Create Category'}</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category Name *</label>
                <input type="text" value={categoryFormData.name} onChange={handleCategoryInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button onClick={() => setIsCategoryModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">Cancel</button>
                <button onClick={handleCategorySave} disabled={isSubmitting} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                  {isSubmitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}