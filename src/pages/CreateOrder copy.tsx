import * as React from "react";
import { useState } from "react";
export interface Customer {
  id: number;
  name: string;
  phone?: string;

}
export interface OrderItem {
  id?: number;
  servicetype?: string | string[];
 
  itemtype: 'Clothing' | 'Bedding' | 'Household Items' | 'Footwares';
  itemname?: string;
  quantity?: number;

  itemcondition?: 'New' | 'Old' | 'Torn';
  additional_info?: string;
  unit_price: number;
  total_item_price?: number;
  created_at?: string;
  item_id?: number;
  price?: number;
}

export interface Order {
  id: number;
  uniquecode: string;
  customer: Customer;
  payment_type: string;
  payment_status: 'pending' | 'partial' | 'paid';
  shop: 'Shop A' | 'Shop B';
  delivery_date: string;
  order_status: 'pending' | 'processing' | 'completed' | 'Delivered_picked';
  addressdetails?: string;
  amount_paid: number;
  total_price: number;
  balance: number;
  created_at: string;
  updated_at?: string;
 
  items: OrderItem[];
  customer_id?: number;
}
interface createorderpayload{
  customerid:string;
  shop:'Shop A'|'Shop B';
  delivarydate:Date;
  addressdetails:string;
  item: OrderItem[];
  amount_paid?: number;
  total_price: number;
  payment_status?: string;
  
}

const servicetypesoptions = ['Washing', 'Ironing', 'Folding', 'Dry cleaning'] 


