export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      authentications: {
        Row: {
          brand: string
          code: string
          created_at: string | null
          customer_id: string | null
          date: string
          id: string
          item_category: Database["public"]["Enums"]["item_category"]
          item_name: string
          paid_with_ca: boolean
          partner_store_id: string | null
          price: number
          requester_name: string
          result: Database["public"]["Enums"]["auth_result"]
          updated_at: string | null
        }
        Insert: {
          brand: string
          code: string
          created_at?: string | null
          customer_id?: string | null
          date?: string
          id?: string
          item_category?: Database["public"]["Enums"]["item_category"]
          item_name: string
          paid_with_ca?: boolean
          partner_store_id?: string | null
          price: number
          requester_name: string
          result: Database["public"]["Enums"]["auth_result"]
          updated_at?: string | null
        }
        Update: {
          brand?: string
          code?: string
          created_at?: string | null
          customer_id?: string | null
          date?: string
          id?: string
          item_category?: Database["public"]["Enums"]["item_category"]
          item_name?: string
          paid_with_ca?: boolean
          partner_store_id?: string | null
          price?: number
          requester_name?: string
          result?: Database["public"]["Enums"]["auth_result"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "authentications_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "authentications_partner_store_id_fkey"
            columns: ["partner_store_id"]
            isOneToOne: false
            referencedRelation: "partner_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      ca_packages: {
        Row: {
          created_at: string
          credits: number
          id: string
          is_active: boolean
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits: number
          id?: string
          is_active?: boolean
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits?: number
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      ca_purchases: {
        Row: {
          created_at: string
          credits_purchased: number
          credits_remaining: number
          customer_id: string
          expires_at: string
          id: string
          package_id: string
          price_paid: number
          purchase_date: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits_purchased: number
          credits_remaining: number
          customer_id: string
          expires_at: string
          id?: string
          package_id: string
          price_paid: number
          purchase_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits_purchased?: number
          credits_remaining?: number
          customer_id?: string
          expires_at?: string
          id?: string
          package_id?: string
          price_paid?: number
          purchase_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ca_purchases_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ca_purchases_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "ca_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      ca_transactions: {
        Row: {
          created_at: string
          credits: number
          customer_id: string
          description: string | null
          id: string
          purchase_id: string | null
          type: string
        }
        Insert: {
          created_at?: string
          credits: number
          customer_id: string
          description?: string | null
          id?: string
          purchase_id?: string | null
          type: string
        }
        Update: {
          created_at?: string
          credits?: number
          customer_id?: string
          description?: string | null
          id?: string
          purchase_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ca_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ca_transactions_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "ca_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          ca_balance: number
          created_at: string
          email: string | null
          id: string
          instagram: string | null
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          ca_balance?: number
          created_at?: string
          email?: string | null
          id?: string
          instagram?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          ca_balance?: number
          created_at?: string
          email?: string | null
          id?: string
          instagram?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      investments: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          date: string
          description: string
          id: string
          notes: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          date?: string
          description: string
          id?: string
          notes?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          date?: string
          description?: string
          id?: string
          notes?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      monthly_targets: {
        Row: {
          created_at: string | null
          id: string
          month: string
          target_authentications: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          month: string
          target_authentications: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          month?: string
          target_authentications?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      partner_credits_history: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          partner_store_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          partner_store_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          partner_store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_credits_history_partner_store_id_fkey"
            columns: ["partner_store_id"]
            isOneToOne: false
            referencedRelation: "partner_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_stores: {
        Row: {
          code_prefix: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          credits: number
          id: string
          name: string
          notes: string | null
          updated_at: string | null
        }
        Insert: {
          code_prefix: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          credits?: number
          id?: string
          name: string
          notes?: string | null
          updated_at?: string | null
        }
        Update: {
          code_prefix?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          credits?: number
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      weekly_goals: {
        Row: {
          completed: boolean | null
          created_at: string | null
          goal_text: string
          id: string
          updated_at: string | null
          week_start: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          goal_text: string
          id?: string
          updated_at?: string | null
          week_start: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          goal_text?: string
          id?: string
          updated_at?: string | null
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_auth_code: { Args: never; Returns: string }
      generate_partner_auth_code: {
        Args: { p_partner_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "operator" | "viewer"
      auth_result: "AUTH" | "RÉPLICA"
      item_category: "roupa" | "tenis_calcados" | "personalizado"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "operator", "viewer"],
      auth_result: ["AUTH", "RÉPLICA"],
      item_category: ["roupa", "tenis_calcados", "personalizado"],
    },
  },
} as const
