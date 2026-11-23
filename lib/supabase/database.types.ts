export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          phone: string | null;
          email: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          phone?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          phone?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      businesses: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          category: string;
          timezone: string;
          deposit_cents: number;
          currency: string;
          address: string | null;
          phone: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          category?: string;
          timezone?: string;
          deposit_cents?: number;
          currency?: string;
          address?: string | null;
          phone?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          description?: string | null;
          category?: string;
          timezone?: string;
          deposit_cents?: number;
          currency?: string;
          address?: string | null;
          phone?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      memberships: {
        Row: {
          id: string;
          business_id: string;
          user_id: string;
          role: "owner" | "staff";
          display_title: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          user_id: string;
          role: "owner" | "staff";
          display_title?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          user_id?: string;
          role?: "owner" | "staff";
          display_title?: string | null;
          created_at?: string;
        };
      };
      services: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          description: string | null;
          duration_min: number;
          price_cents: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          description?: string | null;
          duration_min: number;
          price_cents: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          description?: string | null;
          duration_min?: number;
          price_cents?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      business_hours: {
        Row: {
          id: string;
          business_id: string;
          weekday: number;
          opens: string;
          closes: string;
          is_closed: boolean;
        };
        Insert: {
          id?: string;
          business_id: string;
          weekday: number;
          opens: string;
          closes: string;
          is_closed?: boolean;
        };
        Update: {
          id?: string;
          business_id?: string;
          weekday?: number;
          opens?: string;
          closes?: string;
          is_closed?: boolean;
        };
      };
      bookings: {
        Row: {
          id: string;
          business_id: string;
          service_id: string;
          staff_id: string | null;
          customer_id: string | null;
          customer_name: string;
          customer_email: string;
          customer_phone: string | null;
          starts_at: string;
          ends_at: string;
          status: "pending_payment" | "confirmed" | "cancelled" | "no_show" | "completed";
          deposit_amount_cents: number;
          stripe_session_id: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          service_id: string;
          staff_id?: string | null;
          customer_id?: string | null;
          customer_name: string;
          customer_email: string;
          customer_phone?: string | null;
          starts_at: string;
          ends_at: string;
          status?: "pending_payment" | "confirmed" | "cancelled" | "no_show" | "completed";
          deposit_amount_cents?: number;
          stripe_session_id?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          service_id?: string;
          staff_id?: string | null;
          customer_id?: string | null;
          customer_name?: string;
          customer_email?: string;
          customer_phone?: string | null;
          starts_at?: string;
          ends_at?: string;
          status?: "pending_payment" | "confirmed" | "cancelled" | "no_show" | "completed";
          deposit_amount_cents?: number;
          stripe_session_id?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      queue_entries: {
        Row: {
          id: string;
          business_id: string;
          customer_id: string | null;
          customer_name: string;
          customer_phone: string | null;
          ticket_no: string;
          status: "waiting" | "called" | "served" | "no_show" | "left";
          estimated_wait_min: number;
          called_at: string | null;
          served_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          customer_id?: string | null;
          customer_name: string;
          customer_phone?: string | null;
          ticket_no: string;
          status?: "waiting" | "called" | "served" | "no_show" | "left";
          estimated_wait_min?: number;
          called_at?: string | null;
          served_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          customer_id?: string | null;
          customer_name?: string;
          customer_phone?: string | null;
          ticket_no?: string;
          status?: "waiting" | "called" | "served" | "no_show" | "left";
          estimated_wait_min?: number;
          called_at?: string | null;
          served_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      stripe_events: {
        Row: {
          id: string;
          event_type: string;
          data: Json;
          processed_at: string;
        };
        Insert: {
          id: string;
          event_type: string;
          data: Json;
          processed_at?: string;
        };
        Update: {
          id?: string;
          event_type?: string;
          data?: Json;
          processed_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          target_business_id: string;
          allowed_roles: string[];
        };
        Returns: boolean;
      };
      get_busy_slots: {
        Args: {
          p_business_id: string;
        };
        Returns: { starts_at: string; ends_at: string }[];
      };
      get_queue_public_status: {
        Args: {
          p_business_id: string;
        };
        Returns: {
          waiting_count: number;
          serving_ticket_no: string | null;
        };
      };
      get_queue_position: {
        Args: {
          p_ticket_id: string;
        };
        Returns: {
          people_ahead: number;
          serving_ticket_no: string | null;
          status: "waiting" | "called" | "served" | "no_show" | "left";
          ticket_no: string;
          estimated_wait_min: number;
        } | null;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
