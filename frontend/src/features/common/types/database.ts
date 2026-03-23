/**
 * Database Type Definitions for Supabase
 * 
 * This file contains the TypeScript types that match our Supabase database schema.
 * These types are generated based on the actual database structure and provide
 * type safety for all database operations.
 * 
 * Generated: 2026-11-10T06:04:42.814Z
 * Project: https://ovfcyvyavpzkijyfhezp.supabase.co
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type OrderStatus = 'pending' | 'processing' | 'ready' | 'completed' | 'cancelled'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'
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
          image_url: string | null
          diet_type: string | null
          is_available: boolean
          stock_quantity: number
          low_stock_threshold: number
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
          image_url?: string | null
          diet_type?: string | null
          is_available?: boolean
          stock_quantity?: number
          low_stock_threshold?: number
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
          image_url?: string | null
          diet_type?: string | null
          is_available?: boolean
          stock_quantity?: number
          low_stock_threshold?: number
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
