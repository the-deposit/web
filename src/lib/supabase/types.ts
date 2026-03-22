export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "cliente" | "vendedor" | "admin";
export type PaymentMethod = "efectivo" | "tarjeta_credito" | "transferencia" | "consignacion";
export type SaleType = "pos" | "online";
export type SaleStatus = "pendiente" | "confirmada" | "en_preparacion" | "enviada" | "entregada" | "cancelada";
export type PaymentStatus = "pendiente" | "parcial" | "pagado";
export type OrderStatus = "pendiente" | "revisado" | "confirmado" | "en_preparacion" | "enviado" | "entregado" | "cancelado" | "listo_para_recoger" | "recogido";
export type DeliveryMethod = "envio" | "recoger_en_tienda";
export type ShipmentType = "repartidor_propio" | "empresa_tercera";
export type ShipmentStatus = "preparando" | "en_camino" | "entregado" | "devuelto";
export type ConsignmentType = "dada" | "recibida";
export type ConsignmentStatus = "activa" | "liquidada" | "cancelada";
export type AccountStatus = "pendiente" | "parcial" | "pagada" | "vencida";
export type MeasurementCategory = "peso" | "volumen" | "cantidad";
export type SourceType = "compra_tarjeta" | "consignacion_recibida";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          email: string | null;
          role: UserRole;
          avatar_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      addresses: {
        Row: {
          id: string;
          user_id: string;
          label: string;
          full_address: string;
          department: string | null;
          municipality: string | null;
          zone: string | null;
          reference: string | null;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["addresses"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["addresses"]["Insert"]>;
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          image_url: string | null;
          parent_id: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["categories"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
      };
      measurement_units: {
        Row: {
          id: string;
          name: string;
          abbreviation: string;
          category: MeasurementCategory;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["measurement_units"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["measurement_units"]["Insert"]>;
      };
      products: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          category_id: string | null;
          brand: string | null;
          images: string[];
          is_active: boolean;
          is_featured: boolean;
          tags: string[];
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["products"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
      };
      suppliers: {
        Row: {
          id: string;
          name: string;
          contact_info: string | null;
          address: string | null;
          notes: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["suppliers"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["suppliers"]["Insert"]>;
      };
      product_presentations: {
        Row: {
          id: string;
          product_id: string;
          name: string;
          barcode: string | null;
          quantity_value: number | null;
          quantity_unit_id: string | null;
          sale_price: number;
          cost_price: number;
          competitor_price: number | null;
          stock: number;
          min_stock: number;
          units_per_presentation: number;
          expiration_date: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["product_presentations"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["product_presentations"]["Insert"]>;
      };
      sales: {
        Row: {
          id: string;
          sale_type: SaleType;
          customer_id: string | null;
          customer_name: string | null;
          seller_id: string;
          status: SaleStatus;
          subtotal: number;
          discount: number;
          shipping_cost: number;
          total: number;
          payment_method: PaymentMethod;
          payment_status: PaymentStatus;
          notes: string | null;
          address_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          sale_type?: SaleType;
          customer_id?: string | null;
          customer_name?: string | null;
          seller_id: string;
          status?: SaleStatus;
          subtotal?: number;
          discount?: number;
          shipping_cost?: number;
          total?: number;
          payment_method?: PaymentMethod;
          payment_status?: PaymentStatus;
          notes?: string | null;
          address_id?: string | null;
        };
        Update: {
          sale_type?: SaleType;
          customer_id?: string | null;
          customer_name?: string | null;
          status?: SaleStatus;
          subtotal?: number;
          discount?: number;
          shipping_cost?: number;
          total?: number;
          payment_method?: PaymentMethod;
          payment_status?: PaymentStatus;
          notes?: string | null;
          address_id?: string | null;
        };
      };
      sale_items: {
        Row: {
          id: string;
          sale_id: string;
          product_presentation_id: string;
          quantity: number;
          unit_price: number;
          subtotal: number;
          created_at: string;
        };
        Insert: {
          sale_id: string;
          product_presentation_id: string;
          quantity: number;
          unit_price: number;
          subtotal: number;
        };
        Update: {
          quantity?: number;
          unit_price?: number;
          subtotal?: number;
        };
      };
      orders: {
        Row: {
          id: string;
          customer_id: string;
          status: OrderStatus;
          delivery_method: DeliveryMethod;
          address_id: string | null;
          notes_customer: string | null;
          notes_internal: string | null;
          estimated_delivery: string | null;
          converted_sale_id: string | null;
          subtotal: number;
          shipping_cost: number;
          total: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          customer_id: string;
          status?: OrderStatus;
          delivery_method: DeliveryMethod;
          address_id?: string | null;
          notes_customer?: string | null;
          notes_internal?: string | null;
          estimated_delivery?: string | null;
          converted_sale_id?: string | null;
          subtotal?: number;
          shipping_cost?: number;
          total?: number;
        };
        Update: {
          status?: OrderStatus;
          delivery_method?: DeliveryMethod;
          address_id?: string | null;
          notes_customer?: string | null;
          notes_internal?: string | null;
          estimated_delivery?: string | null;
          converted_sale_id?: string | null;
          subtotal?: number;
          shipping_cost?: number;
          total?: number;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_presentation_id: string;
          quantity: number;
          unit_price: number;
          subtotal: number;
          created_at: string;
        };
        Insert: {
          order_id: string;
          product_presentation_id: string;
          quantity: number;
          unit_price: number;
          subtotal: number;
        };
        Update: {
          quantity?: number;
          unit_price?: number;
          subtotal?: number;
        };
      };
      invoices: {
        Row: {
          id: string;
          sale_id: string;
          invoice_number: string;
          customer_name: string;
          customer_nit: string;
          customer_address: string | null;
          subtotal: number;
          total: number;
          pdf_url: string | null;
          issued_at: string;
          issued_by: string | null;
        };
        Insert: {
          sale_id: string;
          invoice_number: string;
          customer_name?: string;
          customer_nit?: string;
          customer_address?: string | null;
          subtotal?: number;
          total?: number;
          pdf_url?: string | null;
          issued_by?: string | null;
        };
        Update: {
          customer_name?: string;
          customer_nit?: string;
          customer_address?: string | null;
          pdf_url?: string | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
