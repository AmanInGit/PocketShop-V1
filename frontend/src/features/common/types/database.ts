/**
 * Database Type Definitions for Supabase
 * 
 * This file contains the TypeScript types that match our Supabase database schema.
 * These types are generated based on the actual database structure and provide
 * type safety for all database operations.
 * 
 * Generated: 2026-11-10T06:04:42.814Z
 * Project: Supabase
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type OrderStatus = 'pending' | 'processing' | 'preparing' | 'ready' | 'completed' | 'cancelled'
export type PaymentStatus = 'pending' | 'unpaid' | 'completed' | 'failed' | 'refunded'
export type PaymentMethod = 'card' | 'upi' | 'cash' | 'wallet'

export interface Database {
  public: {
    Tables: {
      vendor_profiles: {
        Row: {
          id: string
          user_id: string
          business_name: string
          business_type: string | null
          email: string
          mobile_number: string
          owner_name: string | null
          address: string | null
          city: string | null
          state: string | null
          postal_code: string | null
          country: string
          operational_hours: Json | null
          working_days: string[] | null
          logo_url: string | null
          banner_url: string | null
          description: string | null
          qr_code_id: string | null
          qr_code_url: string | null
          onboarding_status: 'incomplete' | 'basic_info' | 'operational_details' | 'planning_selected' | 'completed'
          is_active: boolean
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          business_name: string
          business_type?: string | null
          email: string
          mobile_number: string
          owner_name?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          postal_code?: string | null
          country?: string
          operational_hours?: Json | null
          working_days?: string[] | null
          logo_url?: string | null
          banner_url?: string | null
          description?: string | null
          qr_code_id?: string | null
          qr_code_url?: string | null
          onboarding_status?: 'incomplete' | 'basic_info' | 'operational_details' | 'planning_selected' | 'completed'
          is_active?: boolean
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          business_name?: string
          business_type?: string | null
          email?: string
          mobile_number?: string
          owner_name?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          postal_code?: string | null
          country?: string
          operational_hours?: Json | null
          working_days?: string[] | null
          logo_url?: string | null
          banner_url?: string | null
          description?: string | null
          qr_code_id?: string | null
          qr_code_url?: string | null
          onboarding_status?: 'incomplete' | 'basic_info' | 'operational_details' | 'planning_selected' | 'completed'
          is_active?: boolean
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_profiles_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      customer_profiles: {
        Row: {
          id: string
          user_id: string | null
          name: string
          mobile_number: string
          email: string | null
          phone_verified: boolean
          email_verified: boolean
          is_guest_converted: boolean
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          mobile_number: string
          email?: string | null
          phone_verified?: boolean
          email_verified?: boolean
          is_guest_converted?: boolean
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          mobile_number?: string
          email?: string | null
          phone_verified?: boolean
          email_verified?: boolean
          is_guest_converted?: boolean
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_profiles_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      guest_sessions: {
        Row: {
          id: string
          session_token: string
          customer_name: string | null
          mobile_number: string
          email: string | null
          is_active: boolean
          converted_to_user_id: string | null
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          session_token: string
          customer_name?: string | null
          mobile_number: string
          email?: string | null
          is_active?: boolean
          converted_to_user_id?: string | null
          created_at?: string
          expires_at?: string
        }
        Update: {
          id?: string
          session_token?: string
          customer_name?: string | null
          mobile_number?: string
          email?: string | null
          is_active?: boolean
          converted_to_user_id?: string | null
          created_at?: string
          expires_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_sessions_converted_to_user_id_fkey"
            columns: ["converted_to_user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      products: {
        Row: {
          id: string
          vendor_id: string
          name: string
          description: string | null
          price: number
          category: string | null
          subcategory: string | null
          tags: string | null
          dietary_tags: string[] | null
          sku: string | null
          unit_of_measure: string | null
          allergens: string | null
          ingredients: string | null
          internal_notes: string | null
          availability_mode: 'quantity' | 'requirement' | null
          image_url: string | null
          diet_type: string | null
          is_available: boolean
          stock_quantity: number
          daily_quantity: number | null
          low_stock_threshold: number
          min_order_quantity: number | null
          promo_price: number | null
          promo_valid_until: string | null
          coupon_applicable: boolean | null
          gst_rate: number | null
          packaging_charge: number | null
          handling_charge: number | null
          variants: Json | null
          addons: Json | null
          available_from: string | null
          available_until: string | null
          is_bestseller: boolean | null
          is_recommended: boolean | null
          preparation_time_minutes: number | null
          spicy_level: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          vendor_id: string
          name: string
          description?: string | null
          price: number
          category?: string | null
          subcategory?: string | null
          tags?: string | null
          dietary_tags?: string[] | null
          sku?: string | null
          unit_of_measure?: string | null
          allergens?: string | null
          ingredients?: string | null
          internal_notes?: string | null
          availability_mode?: 'quantity' | 'requirement' | null
          image_url?: string | null
          diet_type?: string | null
          is_available?: boolean
          stock_quantity?: number
          daily_quantity?: number | null
          low_stock_threshold?: number
          min_order_quantity?: number | null
          promo_price?: number | null
          promo_valid_until?: string | null
          coupon_applicable?: boolean | null
          gst_rate?: number | null
          packaging_charge?: number | null
          handling_charge?: number | null
          variants?: Json | null
          addons?: Json | null
          available_from?: string | null
          available_until?: string | null
          is_bestseller?: boolean | null
          is_recommended?: boolean | null
          preparation_time_minutes?: number | null
          spicy_level?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          vendor_id?: string
          name?: string
          description?: string | null
          price?: number
          category?: string | null
          subcategory?: string | null
          tags?: string | null
          dietary_tags?: string[] | null
          sku?: string | null
          unit_of_measure?: string | null
          allergens?: string | null
          ingredients?: string | null
          internal_notes?: string | null
          availability_mode?: 'quantity' | 'requirement' | null
          image_url?: string | null
          diet_type?: string | null
          is_available?: boolean
          stock_quantity?: number
          daily_quantity?: number | null
          low_stock_threshold?: number
          min_order_quantity?: number | null
          promo_price?: number | null
          promo_valid_until?: string | null
          coupon_applicable?: boolean | null
          gst_rate?: number | null
          packaging_charge?: number | null
          handling_charge?: number | null
          variants?: Json | null
          addons?: Json | null
          available_from?: string | null
          available_until?: string | null
          is_bestseller?: boolean | null
          is_recommended?: boolean | null
          preparation_time_minutes?: number | null
          spicy_level?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            referencedRelation: "vendor_profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      orders: {
        Row: {
          id: string
          vendor_id: string
          customer_id: string | null
          guest_session_id: string | null
          items: Json
          total_amount: number
          status: string
          payment_status: string
          payment_method: string | null
          customer_phone: string | null
          customer_name: string | null
          order_number: string
          delivery_address: string | null
          customer_email: string | null
          notes: string | null
          table_code: string | null
          table_slug: string | null
          kitchen_state: 'queued' | 'active' | 'done' | null
          queue_rank: number | null
          activated_at: string | null
          delivered_at: string | null
          is_followup: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          vendor_id: string
          customer_id?: string | null
          guest_session_id?: string | null
          items: Json
          total_amount: number
          status?: string
          payment_status?: string
          payment_method?: string | null
          customer_phone?: string | null
          customer_name?: string | null
          order_number: string
          delivery_address?: string | null
          customer_email?: string | null
          notes?: string | null
          table_code?: string | null
          table_slug?: string | null
          kitchen_state?: 'queued' | 'active' | 'done' | null
          queue_rank?: number | null
          activated_at?: string | null
          delivered_at?: string | null
          is_followup?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          vendor_id?: string
          customer_id?: string | null
          guest_session_id?: string | null
          items?: Json
          total_amount?: number
          status?: string
          payment_status?: string
          payment_method?: string | null
          customer_phone?: string | null
          customer_name?: string | null
          order_number?: string
          delivery_address?: string | null
          customer_email?: string | null
          notes?: string | null
          table_code?: string | null
          table_slug?: string | null
          kitchen_state?: 'queued' | 'active' | 'done' | null
          queue_rank?: number | null
          activated_at?: string | null
          delivered_at?: string | null
          is_followup?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_vendor_id_fkey"
            columns: ["vendor_id"]
            referencedRelation: "vendor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_guest_session_id_fkey"
            columns: ["guest_session_id"]
            referencedRelation: "guest_sessions"
            referencedColumns: ["id"]
          }
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          quantity: number
          unit_price: number
          subtotal: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          product_id?: string | null
          quantity: number
          unit_price: number
          subtotal: number
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string | null
          quantity?: number
          unit_price?: number
          subtotal?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      payments: {
        Row: {
          id: string
          order_id: string
          amount: number
          payment_method: PaymentMethod
          payment_status: PaymentStatus
          transaction_id: string | null
          stripe_payment_intent_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          amount: number
          payment_method: PaymentMethod
          payment_status?: PaymentStatus
          transaction_id?: string | null
          stripe_payment_intent_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          amount?: number
          payment_method?: PaymentMethod
          payment_status?: PaymentStatus
          transaction_id?: string | null
          stripe_payment_intent_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          vendor_id: string | null
          title: string
          message: string
          type: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          vendor_id?: string | null
          title: string
          message: string
          type: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          vendor_id?: string | null
          title?: string
          message?: string
          type?: string
          is_read?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_vendor_id_fkey"
            columns: ["vendor_id"]
            referencedRelation: "vendor_profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      order_messages: {
        Row: {
          id: string
          order_id: string
          sender_type: 'vendor' | 'customer'
          sender_name: string
          message: string
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          sender_type: 'vendor' | 'customer'
          sender_name: string
          message: string
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          sender_type?: 'vendor' | 'customer'
          sender_name?: string
          message?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_messages_order_id_fkey"
            columns: ["order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          }
        ]
      }
      audit_logs: {
        Row: {
          audit_id: number
          entity_table: string
          entity_id: string
          action_type: string
          actor_id: string
          state_before: Json | null
          state_after: Json | null
          timestamp: string
        }
        Insert: {
          audit_id?: number
          entity_table: string
          entity_id: string
          action_type: string
          actor_id: string
          state_before?: Json | null
          state_after?: Json | null
          timestamp?: string
        }
        Update: {
          audit_id?: number
          entity_table?: string
          entity_id?: string
          action_type?: string
          actor_id?: string
          state_before?: Json | null
          state_after?: Json | null
          timestamp?: string
        }
        Relationships: []
      }
      vendor_tables: {
        Row: {
          id: string
          vendor_id: string
          table_slug: string
          table_code: string
          zone: string | null
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          vendor_id: string
          table_slug: string
          table_code: string
          zone?: string | null
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          vendor_id?: string
          table_slug?: string
          table_code?: string
          zone?: string | null
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_tables_vendor_id_fkey"
            columns: ["vendor_id"]
            referencedRelation: "vendor_profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_vendor_id: {
        Args: {
          _user_id: string
        }
        Returns: string | null
      }
      atomic_stock_update: {
        Args: {
          _product_id: string
          _quantity_change: number
        }
        Returns: boolean
      }
      create_table_order_with_queue: {
        Args: {
          p_vendor_id: string
          p_customer_id: string | null
          p_guest_session_id: string | null
          p_items: Json
          p_total_amount: number
          p_status: string
          p_payment_status: string
          p_payment_method: string | null
          p_customer_name: string
          p_customer_phone: string
          p_customer_email: string | null
          p_order_number: string
          p_notes: string | null
          p_table_code: string | null
          p_table_slug: string | null
        }
        Returns: Database['public']['Tables']['orders']['Row']
      }
    }
    Enums: {
      order_status: OrderStatus
      payment_status: PaymentStatus
      payment_method: PaymentMethod
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
