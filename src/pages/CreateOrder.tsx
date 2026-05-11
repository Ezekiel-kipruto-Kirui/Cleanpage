import * as React from "react";
const { useState, useCallback, useMemo, useEffect, useRef } = React;
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
import { Customer, createorderpayload, OrderItem } from '@/services/types'
import { API_BASE_URL } from '../services/url'
import { getAccessToken } from "@/services/api";

// --- API Endpoints ---
const ORDERS_URL = `${API_BASE_URL}/Laundry/orders/`;
const CUSTOMERS_URL = `${API_BASE_URL}/Laundry/customers/`;
const token = getAccessToken()

// --- Constants & Form Types ---
const SERVICE_TYPES = [
  { value: 'Washing', label: 'Washing' },
  { value: 'Ironing', label: 'Ironing' },
  { value: 'Folding', label: 'Folding' },
  { value: 'Dry cleaning', label: 'Dry cleaning' }
];

const ITEM_TYPES = [
  { value: 'Clothing', label: 'Clothing' },
  { value: 'Bedding', label: 'Bedding' },
  { value: 'Household items', label: 'Household items' },
  { value: 'Footwares', label: 'Footwares' }
];

const CONDITIONS = [
  { value: 'New', label: 'New' },
  { value: 'Old', label: 'Old' },
  { value: 'Torn', label: 'Torn' }
];

const PAYMENT_TYPES = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' }, 
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'other', label: 'Other' },
  { value: 'None', label: 'None' }
];

const PAYMENT_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'partial', label: 'Partial' },
  { value: 'completed', label: 'completed' }
];

// --- Types ---
interface ApiErrorResponse {
  phone?: string[];
  name?: string[];
  detail?: string;
  error?: string;
}

interface FormOrderItem {
  servicetype: string[];
  itemtype: string[];
  itemname: string;
  quantity: number;
  itemcondition: string;
  additional_info: string;
  unit_price: number;
}

// Custom MultiSelect Dropdown Component
interface MultiSelectDropdownProps {
  options: { value: string; label: string }[];
  selectedValues: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  options,
  selectedValues,
  onChange,
  placeholder = "Select options..."
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleCheckboxChange = (value: string, checked: boolean) => {
    let newSelected = [...selectedValues];
    if (checked) {
      if (!newSelected.includes(value)) {
        newSelected.push(value);
      }
    } else {
      newSelected = newSelected.filter(v => v !== value);
    }
    onChange(newSelected);
  };

  const handleClear = () => {
    onChange([]);
  };

  const handleSelectAll = () => {
    onChange(options.map(opt => opt.value));
  };

  const getDisplayText = () => {
    if (selectedValues.length === 0) return placeholder;
    if (selectedValues.length === options.length) return "All services selected";
    const selectedLabels = options
      .filter(opt => selectedValues.includes(opt.value))
      .map(opt => opt.label);
    return selectedLabels.join(', ');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-2 text-sm border rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <span className="truncate text-left">{getDisplayText()}</span>
        <span className="ml-2">
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
          <div className="p-2 space-y-1">
            <div className="flex justify-between px-2 py-1 border-b">
              <button type="button" onClick={handleSelectAll} className="text-xs text-blue-600 hover:text-blue-800">Select All</button>
              <button type="button" onClick={handleClear} className="text-xs text-gray-600 hover:text-gray-800">Clear All</button>
            </div>
            {options.map((option) => (
              <label key={option.value} className="flex items-center space-x-2 px-2 py-1.5 hover:bg-gray-50 cursor-pointer rounded">
                <Checkbox
                  checked={selectedValues.includes(option.value)}
                  onCheckedChange={(checked) => handleCheckboxChange(option.value, checked as boolean)}
                  className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
            <div className="px-2 py-1 border-t text-xs text-gray-500">
              {selectedValues.length} of {options.length} selected
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function CreateOrder() {
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [shop, setShop] = useState<"Shop A" | "Shop B">("Shop A");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [address, setAddress] = useState("");
  const [paymentType, setPaymentType] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [amountPaid, setAmountPaid] = useState(0);
  const [items, setItems] = useState<FormOrderItem[]>([{
    servicetype: [], itemtype: [], itemname: '', quantity: 1, itemcondition: '', additional_info: '', unit_price: 0,
  }]);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    console.log("API Endpoints:", { CUSTOMERS_URL, ORDERS_URL });
  }, []);

  const totalPrice = useMemo(() => items.reduce((sum, it) => sum + Number(it.unit_price), 0), [items]);
  const balance = useMemo(() => Math.max(0, totalPrice - amountPaid), [totalPrice, amountPaid]);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const addItem = useCallback(() => {
    setItems(prev => [...prev, {
      servicetype: [], itemtype: [], itemname: '', quantity: 1, itemcondition: '', additional_info: '', unit_price: 0,
    }]);
  }, []);

  const updateItem = useCallback((index: number, field: keyof FormOrderItem, value: any) => {
    setItems(prev => prev.map((it, i) => i === index ? { ...it, [field]: value } : it));
  }, []);

  const handleServiceTypeChange = useCallback((index: number, selectedValues: string[]) => {
    updateItem(index, 'servicetype', selectedValues);
  }, [updateItem]);

  const handleItemTypeChange = useCallback((index: number, selectedValues: string[]) => {
    updateItem(index, 'itemtype', selectedValues);
  }, [updateItem]);

  const removeItem = useCallback((index: number) => {
    if (items.length > 1) setItems(prev => prev.filter((_, i) => i !== index));
  }, [items.length]);

  const normalizePhoneNumber = (phone: string): string => {
    if (!phone) return "";
    const cleaned = phone.replace(/\D/g, ''); // Remove non-digits

    if (cleaned.startsWith('254') && cleaned.length === 12) {
      return '+' + cleaned; 
    }
    
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      return '+254' + cleaned.substring(1);
    }
    
    if (cleaned.startsWith('7') && cleaned.length === 9) {
      return '+254' + cleaned;
    }

    if (cleaned.length === 12 && cleaned.startsWith('254')) {
        return '+' + cleaned;
    }

    return ""; 
  };

  /**
   * Logic to search customer by phone using the by_phone endpoint.
   */
  const handleCustomerLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerPhone) {
      setError("Please enter a phone number to search.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const normalizedPhone = normalizePhoneNumber(customerPhone);
    if (!normalizedPhone) {
      setError("Invalid phone number format. Use 07... or 254...");
      setIsLoading(false);
      return;
    }

    console.log("=== Step 1: Searching customer by phone ===");
    try {
      const selectCustomer = (customer: Customer, message: string) => {
        const resolvedName = customer.name || customerName.trim() || "Existing customer";
        const resolvedCustomer = { ...customer, name: resolvedName, phone: customer.phone || normalizedPhone };
        setSelectedCustomer(resolvedCustomer);
        setCustomerName(resolvedName);
        showToast(message);
        showStep(2);
      };

      const searchResponse = await fetch(`${CUSTOMERS_URL}by_phone/?phone=${encodeURIComponent(normalizedPhone)}`, {
        headers: {
          'Accept': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        }
      });

      if (searchResponse.ok) {
        const existingCustomer = await searchResponse.json() as Customer | null;
        if (!existingCustomer?.id) {
          throw new Error("Customer lookup returned an empty result. Please enter the name to create the customer.");
        }
        console.log("Customer found:", existingCustomer);
        selectCustomer(existingCustomer, "Existing customer found and selected!");
        setIsLoading(false);
        return;
      }

      if (searchResponse.status === 404) {
        // Customer not found, try to create
        if (!customerName.trim()) {
          setError("Customer not found. Please enter a name to create a new customer.");
          setIsLoading(false);
          return;
        }

        console.log("=== Step 2: Customer not found. Creating new one... ===");

        const createResponse = await fetch(CUSTOMERS_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ name: customerName.trim(), phone: normalizedPhone }),
        });

        const responseText = await createResponse.text();

        if (!createResponse.ok) {
          let data: ApiErrorResponse = {};
          try { data = JSON.parse(responseText) as ApiErrorResponse; }
          catch (e) { /* ignore parse error */ }

          const errorObj = data;
          const detail = (errorObj.phone?.[0] || errorObj.detail || "").toString().toLowerCase();

          // If duplicate error occurred (race condition), try searching again
          if (detail.includes('phone') && (detail.includes('exist') || detail.includes('unique'))) {
             console.warn("Creation failed due to duplicate. Re-checking...");
             const retryResponse = await fetch(`${CUSTOMERS_URL}by_phone/?phone=${encodeURIComponent(normalizedPhone)}`, {
               headers: {
                 'Accept': 'application/json',
                 ...(token ? { Authorization: `Bearer ${token}` } : {}),
               }
             });

             if(retryResponse.ok) {
               const reCheckCustomer = await retryResponse.json() as Customer | null;
               if (reCheckCustomer?.id) {
                 selectCustomer(reCheckCustomer, "Customer selected!");
               }
               setIsLoading(false);
               return;
             }
          }

          // If we reach here, it's a real error
          throw new Error(errorObj.phone?.[0] || errorObj.name?.[0] || errorObj.detail || `Failed to create customer (${createResponse.status})`);
        }

        // Success: Parse the text we already read
        const newCustomer = JSON.parse(responseText) as Customer;
        console.log("Customer created successfully:", newCustomer);
        selectCustomer(newCustomer, "Customer created successfully!");
      } else {
        throw new Error(`Failed to search customer (${searchResponse.status})`);
      }

    } catch (err: any) {
      console.error("Error in handleCustomerLookup:", err);
      setError(err.message || "Failed to process customer.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrderSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCustomer) { setError("Please find or create a customer."); return; }
    if (!shop) { setError("Please select a shop."); return; }
    if (!deliveryDate) { setError("Please select a delivery date."); return; }
    if (items.length === 0) { setError("Add at least one item."); return; }
    
    const invalidItems = items.filter(it => !it.servicetype.length || !it.itemtype.length || !it.itemcondition);
    if (invalidItems.length > 0) {
      setError("Fill all required fields (Service, Category, Condition).");
      return;
    }

    setIsLoading(true);
    setError(null);

    console.log("=== DEBUG: handleOrderSubmit ===");
    console.log("Selected customer:", selectedCustomer);
    console.log("Items to submit:", items);

    const mappedItems = items.map(it => ({
      servicetype: it.servicetype,
      itemtype: it.itemtype,
      itemname: it.itemname || "",
      quantity: Number(it.quantity),
      itemcondition: it.itemcondition,
      additional_info: it.additional_info || "",
      unit_price: Number(it.unit_price).toFixed(2),
      total_item_price: Number(it.unit_price).toFixed(2)
    }));

    console.log("Mapped items:", mappedItems);

    const payload: createorderpayload = {
      customer_id: selectedCustomer.id,
      shop: shop,
      delivery_date: deliveryDate,
      addressdetails: address || "",
      payment_type: paymentType || "None",
      payment_status: paymentStatus,
      amount_paid: Number(amountPaid).toFixed(2),
      total_price: totalPrice.toFixed(2),
      items: mappedItems,
    };

    console.log("Payload:", JSON.stringify(payload, null, 2));

    try {
      const response = await fetch(ORDERS_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...token ? { 'Authorization': `Bearer ${token}` } : {}
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      console.log("=== DEBUG: Order Response ===");
      console.log("Status:", response.status);
      console.log("Response:", responseText);

      if (responseText.trim().startsWith('<!DOCTYPE')) throw new Error('Server returned HTML. Check API endpoint.');
      
      let data;
      try { data = JSON.parse(responseText); } 
      catch (e) { throw new Error('Invalid JSON response: ' + responseText.substring(0, 100)); }

      if (!response.ok) {
        console.error("Order creation failed:", data);
        throw new Error(data.detail || data.error || JSON.stringify(data) || "Order submission failed");
      }

      const orderCode = data.uniquecode || data.order_number || data.id || "N/A";
      showToast(`Order ${orderCode} created successfully!`);
      setTimeout(() => window.location.reload(), 2000);

    } catch (err: any) {
      console.error("=== DEBUG: Order submission error ===");
      console.error("Error:", err.message);
      setError(err.message || "Unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedCustomer, shop, deliveryDate, address, paymentType, paymentStatus, amountPaid, totalPrice, items, showToast]);

  const showStep = useCallback((stepNumber: number) => {
    setCurrentStep(stepNumber);
    setError(null);
  }, []);

  return (
    <div className="bg-gray-50 min-h-screen p-4 sm:p-6">
      <div className="max-w-4xl mx-auto bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8 border border-gray-100 mt-4 sm:mt-6 lg:mt-10">
        <div className="flex justify-center mb-6 sm:mb-8">
          <div className="flex items-center space-x-2 sm:space-x-4 max-w-full overflow-x-auto px-2 py-2">
            {[
              { num: 1, label: "Customer" },
              { num: 2, label: "Order Details" },
              { num: 3, label: "Items" },
              { num: 4, label: "Payment" }
            ].map((step, idx) => (
              <React.Fragment key={step.num}>
                <div className="flex items-center flex-shrink-0">
                  <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-semibold text-xs sm:text-sm ${currentStep >= step.num ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-600"}`}>
                    {currentStep > step.num ? "✓" : step.num}
                  </div>
                  <span className={`ml-1 sm:ml-2 text-xs sm:text-sm font-medium ${currentStep >= step.num ? "text-blue-600" : "text-gray-500"} hidden xs:inline`}>{step.label}</span>
                </div>
                {idx < 3 && <div className="w-6 sm:w-8 h-1 bg-gray-300 flex-shrink-0"></div>}
              </React.Fragment>
            ))}
          </div>
        </div>

        {toastMessage && (
          <div className="fixed bottom-4 left-4 right-4 sm:bottom-6 sm:right-6 sm:left-auto bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg text-sm max-w-xs sm:max-w-sm mx-auto sm:mx-0 z-50">
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              {toastMessage}
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg" role="alert">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Step 1 */}
        {currentStep === 1 && (
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 mb-4 sm:mb-6 text-center">Customer Information</h1>
            <form onSubmit={handleCustomerLookup} className="space-y-4 sm:space-y-5 p-2 sm:p-4">
              <div>
                <Label className="block text-sm font-medium text-gray-700">Customer Name <span className="text-gray-500">(new customers)</span></Label>
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Enter customer full name for new customers" className="mt-1 sm:mt-2 w-full rounded-lg border border-gray-300 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 p-2 sm:p-3" />
              </div>
              <div>
                <Label className="block text-sm font-medium text-gray-700">Phone Number <span className="text-red-500">*</span></Label>
                <Input value={customerPhone} onChange={(e) => { setCustomerPhone(e.target.value); setSelectedCustomer(null); }} placeholder="0712345678 or 254712345678" required className="mt-1 sm:mt-2 w-full rounded-lg border border-gray-300 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 p-2 sm:p-3" />
              </div>
              {selectedCustomer && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="font-medium text-green-800">Customer Selected:</p>
                    <p className="text-sm text-green-700">{selectedCustomer.name} - {selectedCustomer.phone}</p>
                  </div>
                  <Button type="button" onClick={() => { setSelectedCustomer(null); setCustomerPhone(""); }} className="text-xs bg-red-100 text-red-700 hover:bg-red-200">Change</Button>
                </div>
              )}
              <div className="flex justify-end mt-4 sm:mt-6">
                <Button type="submit" disabled={isLoading || !customerPhone} className="w-full sm:w-auto px-4 sm:px-6 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 hover:shadow">
                  {isLoading ? "Processing..." : "Next →"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Step 2 */}
        {currentStep === 2 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-700 mb-3">Order Details</h2>
            <form className="space-y-4 sm:space-y-6 p-2 sm:p-4">
              {selectedCustomer && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-800">Customer:</p>
                  <p className="text-sm text-blue-700">{selectedCustomer.name} - {selectedCustomer.phone}</p>
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 sm:gap-6">
                <div>
                  <Label className="block text-sm font-medium text-gray-700">Shop <span className="text-red-500">*</span></Label>
                  <Select value={shop} onValueChange={(value: "Shop A" | "Shop B") => setShop(value)} required>
                    <SelectTrigger className="mt-1 w-full"><SelectValue placeholder="-- Select Shop --" /></SelectTrigger>
                    <SelectContent><SelectItem value="Shop A">Shop A</SelectItem><SelectItem value="Shop B">Shop B</SelectItem></SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="block text-sm font-medium text-gray-700">Delivery/Picked Date <span className="text-red-500">*</span></Label>
                  {/* Removed min={getTomorrowDate()} to allow past dates */}
                  <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} required className="mt-1 w-full" />
                </div>
              </div>
              <div>
                <Label className="block text-sm font-medium text-gray-700">Delivery/Pick Address (Optional)</Label>
                <Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} placeholder="Enter delivery or pickup address" className="mt-1 w-full" />
              </div>
              <div className="flex flex-col sm:flex-row justify-between gap-3 mt-4 sm:mt-6">
                <Button onClick={() => showStep(1)} type="button" className="bg-gray-300 text-gray-700 hover:bg-gray-400">← Back</Button>
                <Button onClick={() => { if (!shop || !deliveryDate) { setError("Select shop and date"); return; } showStep(3); }} type="button" className="bg-blue-600 text-white hover:bg-blue-700">Next →</Button>
              </div>
            </form>
          </div>
        )}

        {/* Step 3 */}
        {currentStep === 3 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-700 mb-3">Order Items</h2>
            <div className="space-y-4 sm:space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
                <h3 className="text-md font-semibold text-gray-700">Add Items</h3>
                <Button onClick={addItem} type="button" className="w-full sm:w-auto text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md"><Plus className="w-4 h-4 mr-1" /> Add Item</Button>
              </div>
              <div className="space-y-4">
                {items.map((it, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium text-gray-700">Item #{index + 1}</h4>
                      {items.length > 1 && <Button onClick={() => removeItem(index)} className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 text-sm"><Trash className="w-3 h-3 mr-1" /> Remove</Button>}
                    </div>
                    <div className="mb-4">
                      <Label className="block text-sm font-medium text-gray-700 mb-2">Service Type <span className="text-red-500">*</span></Label>
                      <MultiSelectDropdown options={SERVICE_TYPES} selectedValues={it.servicetype} onChange={(selected) => handleServiceTypeChange(index, selected)} placeholder="Select services..." />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="block text-sm font-medium text-gray-700 mb-1">Item Category <span className="text-red-500">*</span></Label>
                        <MultiSelectDropdown options={ITEM_TYPES} selectedValues={it.itemtype} onChange={(selected) => handleItemTypeChange(index, selected)} placeholder="Select categories..." />
                      </div>
                      <div>
                        <Label className="block text-sm font-medium text-gray-700 mb-1">Condition <span className="text-red-500">*</span></Label>
                        <Select value={it.itemcondition} onValueChange={(value) => updateItem(index, 'itemcondition', value)}><SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{CONDITIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div><Label className="block text-sm font-medium text-gray-700 mb-1">Item Names</Label><Input value={it.itemname} onChange={(e) => updateItem(index, 'itemname', e.target.value)} placeholder="e.g. Shirts" /></div>
                      <div><Label className="block text-sm font-medium text-gray-700 mb-1">Quantity</Label><Input type="text" min="1" value={it.quantity} onChange={(e) => updateItem(index, 'quantity', Number(e.target.value) || 1)} /></div>
                      <div><Label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</Label><Input type="test" step="0.01" min="0" value={it.unit_price} onChange={(e) => updateItem(index, 'unit_price', Number(e.target.value) || 0)} /></div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-gray-100 rounded-lg flex justify-between items-center">
                <span className="font-medium">Estimated Total:</span>
                <span className="text-xl font-bold text-blue-600">KES {totalPrice.toFixed(2)}</span>
              </div>
              <div className="flex flex-col sm:flex-row justify-between gap-3 mt-4">
                <Button onClick={() => showStep(2)} className="bg-gray-300 text-gray-700 hover:bg-gray-400">← Back</Button>
                <Button onClick={() => { if (items.some(it => !it.servicetype.length || !it.itemtype || !it.itemcondition)) { setError("Fill required fields"); return; } showStep(4); }} className="bg-blue-600 text-white hover:bg-blue-700">Next →</Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4 */}
        {currentStep === 4 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-700 mb-3">Payment</h2>
            <form onSubmit={handleOrderSubmit} className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="block text-sm font-medium text-gray-700">Payment Type</Label>
                  <Select value={paymentType} onValueChange={setPaymentType}><SelectTrigger className="mt-1 w-full"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent>{PAYMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select>
                </div>
                 <div>
                <Label className="block text-sm font-medium text-gray-700">Amount Paid (KES)</Label>
                <Input type="number" step="0.01" min="0" max={totalPrice} value={amountPaid} onChange={(e) => { const val = Number(e.target.value) || 0; setAmountPaid(val); setPaymentStatus(val === 0 ? 'pending' : val >= totalPrice ? 'completed' : 'partial'); }} className="mt-1 w-full" />
              </div>
              </div>
             
              <div className="border-t pt-4">
                <div className="flex justify-between font-medium"><span className="text-gray-700">Balance:</span><span className={balance > 0 ? "text-orange-600" : "text-green-600"}>KES {balance.toFixed(2)}</span></div>
              </div>
              <div className="flex flex-col sm:flex-row justify-between gap-3 mt-6">
                <Button onClick={() => showStep(3)} type="button" className="bg-gray-300 text-gray-700 hover:bg-gray-400">← Back</Button>
                <Button type="submit" disabled={isLoading} className="bg-green-600 hover:bg-green-700 text-white">{isLoading ? "Creating..." : "Create Order"}</Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
