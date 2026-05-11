export interface Customer {
  id: number;
  name: string;
  phone: string;
  order_count?: number;
  total_spent?: string;
  last_order_date?: string | null;
  created_by?:any;
}
export interface OrderItem {
  id?: number;
  servicetype: string[];
  itemtype: string[];
  itemname?: string;
  quantity?: number;
  itemcondition?: string;
  additional_info?: string;
  unit_price: string;
  total_item_price?: string;
}
export interface createorderpayload {
  customer_id: number;
  shop: 'Shop A' | 'Shop B';
  delivery_date: string;
  addressdetails: string;
  items: OrderItem[];
  amount_paid?: string;
  total_price: string;
  payment_status?: string;
  payment_type: string;
}
export interface User {
  id: number;
  email: string;
  user_type: 'admin' | 'staff';
  is_superuser: boolean;
  is_staff: boolean;
  is_active: boolean;
  first_name: string;
  last_name: string;
  groups: string[];
  user_permissions: string[];
  last_login?: string | null;
  date_joined?: string;
}
export interface Order {
  id: number;
  uniquecode: string;
  customer: Customer;
  payment_type: string;
  payment_status: 'pending' | 'partial' | 'completed';
  shop: string;
  delivery_date: string;
  order_status: 'pending' | 'Completed' | 'Delivered_picked';
  addressdetails?: string;
  amount_paid: string;
  total_price: string;
  balance: string;
  created_at: string;
  updated_at?: string;
  created_by: User;
  updated_by: User | null;
  items: OrderItem[];
}

export interface FoodCategory {
  id: number;
  name: string;
}

export interface FoodItem {
  id: number;
  name: string;
 
  category: FoodCategory;
  category_id: number;
  created_by: User;
  quantity: number;
  created_at:string;
  total_order_price: number;
}

export interface HotelOrderItem {
  id: number;
  order?: number;
  food_item: FoodItem;
  food_item_name: string;
  food_item_id: number;
  quantity: number;
  price: any;
  oncredit:boolean;
  name:string;



}

export interface HotelOrder {
  id: number;
  created_by: User;
  created_at: string;
  order_items: HotelOrderItem[];
  total_order_price: number;
}

export interface ExpenseField {
  id: number;
  label: string;
  created_at?: string;
}

export interface ExpenseRecord {
  id: number;
  field: ExpenseField;
  field_id: number;
  description: string;
  amount: number;
  notes?: string;
  date: string;
  shop: "Shop A" | "Shop B";
}
export interface HotelExpenseField {
  id: number;
  label: string;
  created_at: string;
}

export interface HotelExpenseRecord {
  id: number;
  field: HotelExpenseField;
  field_id: number;
  amount: number;
  date: string;
  notes?: string;
}
export interface AuthResponse {
  access: string;
  refresh: string;
}