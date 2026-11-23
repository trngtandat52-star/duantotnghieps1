export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  role: 'admin' | 'customer';
  created_at?: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  status?: string | null;
  product_count?: number;
  created_at?: string;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  sku?: string | null;
  category_id?: number | null;
  category_name?: string | null;
  price: number;
  original_price?: number | null;
  stock: number;
  thumbnail: string;
  images?: string | null;
  variants_size?: string | string[] | null;
  variants_color?: string | string[] | null;
  short_description?: string | null;
  description?: string | null;
  is_active: number | boolean;
  is_featured?: number | boolean;
  is_hot?: number | boolean;
  badge?: string | null;
  status?: 'abundant' | 'low_stock' | 'out_of_stock';
  totalValue?: number;
  created_at?: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  product_name: string;
  price: number;
  quantity: number;
  subtotal: number;
  thumbnail?: string | null;
}

export interface Order {
  id: number;
  order_code: string;
  user_id?: number | null;
  customer_name: string;
  customer_email?: string | null;
  customer_phone: string;
  shipping_address?: string | null;
  payment_method: string;
  payment_status: 'unpaid' | 'paid' | 'refunded';
  order_status: 'pending' | 'processing' | 'shipping' | 'completed' | 'cancelled';
  total_amount: number;
  subtotal?: number;
  shipping_fee?: number;
  discount_amount?: number;
  note?: string | null;
  created_at: string;
  items?: OrderItem[];
}

export interface Coupon {
  id: number;
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  min_order_amount?: number;
  max_discount?: number;
  usage_limit?: number;
  used_count?: number;
  is_active: number | boolean;
  expires_at?: string | null;
  created_at?: string;
}

export interface Post {
  id: number;
  title: string;
  slug: string;
  category?: string | null;
  author?: string | null;
  thumbnail?: string | null;
  excerpt?: string | null;
  content?: string | null;
  views?: number;
  is_published?: number | boolean;
  created_at?: string;
}

export interface InventoryLog {
  id: number;
  product_id: number;
  change_type: 'import' | 'export' | 'adjust';
  quantity_change: number;
  old_stock: number;
  new_stock: number;
  note?: string | null;
  created_by?: string | null;
  created_at: string;
  product_name?: string;
  sku?: string | null;
  thumbnail?: string | null;
  category_name?: string | null;
}

export interface InventoryStats {
  totalProducts: number;
  totalStock: number;
  totalInventoryValue: number;
  outOfStockCount: number;
  lowStockCount: number;
  abundantStockCount: number;
}

export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  totalProducts: number;
  lowStock: number;
  totalUsers: number;
  totalPosts: number;
  recentOrders: Order[];
  statusBreakdown: { order_status: string; count: number }[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  stats?: any;
  products?: any[];
  logs?: any[];
  count?: number;
  token?: string;
  user?: User;
  error?: string;
}
