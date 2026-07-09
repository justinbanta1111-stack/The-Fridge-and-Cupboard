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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      community_recipes: {
        Row: {
          chef_approved: boolean
          created_at: string
          cuisine: string | null
          id: string
          image_url: string | null
          ingredients: Json
          status: string
          steps: Json
          summary: string
          title: string
          updated_at: string
          upvotes: number
          user_id: string
        }
        Insert: {
          chef_approved?: boolean
          created_at?: string
          cuisine?: string | null
          id?: string
          image_url?: string | null
          ingredients?: Json
          status?: string
          steps?: Json
          summary: string
          title: string
          updated_at?: string
          upvotes?: number
          user_id: string
        }
        Update: {
          chef_approved?: boolean
          created_at?: string
          cuisine?: string | null
          id?: string
          image_url?: string | null
          ingredients?: Json
          status?: string
          steps?: Json
          summary?: string
          title?: string
          updated_at?: string
          upvotes?: number
          user_id?: string
        }
        Relationships: []
      }
      food_preferences: {
        Row: {
          allergies: string[]
          created_at: string
          diets: string[]
          dislikes: string[]
          favorite_cuisines: string[]
          household_size: number
          notes: string
          spice_level: number
          updated_at: string
          user_id: string
        }
        Insert: {
          allergies?: string[]
          created_at?: string
          diets?: string[]
          dislikes?: string[]
          favorite_cuisines?: string[]
          household_size?: number
          notes?: string
          spice_level?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          allergies?: string[]
          created_at?: string
          diets?: string[]
          dislikes?: string[]
          favorite_cuisines?: string[]
          household_size?: number
          notes?: string
          spice_level?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fridge_scans: {
        Row: {
          created_at: string
          cuisine: string | null
          id: string
          image_path: string
          items: Json
          recipes: Json | null
          summary: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          cuisine?: string | null
          id?: string
          image_path: string
          items?: Json
          recipes?: Json | null
          summary?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          cuisine?: string | null
          id?: string
          image_path?: string
          items?: Json
          recipes?: Json | null
          summary?: string | null
          user_id?: string
        }
        Relationships: []
      }
      premium_favorites: {
        Row: {
          created_at: string
          id: string
          kind: string
          payload: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          payload: Json
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      recipe_votes: {
        Row: {
          created_at: string
          id: string
          recipe_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          recipe_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          recipe_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_votes_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "community_recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          reward_applied: boolean
          reward_applied_at: string | null
          stripe_coupon_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          reward_applied?: boolean
          reward_applied_at?: string | null
          stripe_coupon_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          reward_applied?: boolean
          reward_applied_at?: string | null
          stripe_coupon_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          code: string
          completed: boolean
          created_at: string
          id: string
          referred_user_id: string
          referrer_user_id: string
        }
        Insert: {
          code: string
          completed?: boolean
          created_at?: string
          id?: string
          referred_user_id: string
          referrer_user_id: string
        }
        Update: {
          code?: string
          completed?: boolean
          created_at?: string
          id?: string
          referred_user_id?: string
          referrer_user_id?: string
        }
        Relationships: []
      }
      reminder_preferences: {
        Row: {
          created_at: string
          enabled: boolean
          quiet_end: number
          quiet_start: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          quiet_end?: number
          quiet_start?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          quiet_end?: number
          quiet_start?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reminders_sent: {
        Row: {
          id: string
          item_key: string
          sent_at: string
          user_id: string
        }
        Insert: {
          id?: string
          item_key: string
          sent_at?: string
          user_id: string
        }
        Update: {
          id?: string
          item_key?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: []
      }
      savings_events: {
        Row: {
          cooked_at: string
          created_at: string
          estimated_savings_cents: number
          id: string
          pounds_rescued: number
          recipe_title: string
          scan_id: string | null
          source: string
          user_id: string
        }
        Insert: {
          cooked_at?: string
          created_at?: string
          estimated_savings_cents?: number
          id?: string
          pounds_rescued?: number
          recipe_title: string
          scan_id?: string | null
          source?: string
          user_id: string
        }
        Update: {
          cooked_at?: string
          created_at?: string
          estimated_savings_cents?: number
          id?: string
          pounds_rescued?: number
          recipe_title?: string
          scan_id?: string | null
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "savings_events_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "fridge_scans"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_feedback: {
        Row: {
          corrected_estimated_age: string | null
          corrected_freshness: string | null
          corrected_name: string | null
          corrected_time_left_label: string | null
          created_at: string
          id: string
          image_path: string | null
          note: string | null
          original_estimated_age: string | null
          original_freshness: string | null
          original_name: string
          scan_id: string | null
          share_image: boolean
          storage: string | null
          user_id: string
        }
        Insert: {
          corrected_estimated_age?: string | null
          corrected_freshness?: string | null
          corrected_name?: string | null
          corrected_time_left_label?: string | null
          created_at?: string
          id?: string
          image_path?: string | null
          note?: string | null
          original_estimated_age?: string | null
          original_freshness?: string | null
          original_name: string
          scan_id?: string | null
          share_image?: boolean
          storage?: string | null
          user_id: string
        }
        Update: {
          corrected_estimated_age?: string | null
          corrected_freshness?: string | null
          corrected_name?: string | null
          corrected_time_left_label?: string | null
          created_at?: string
          id?: string
          image_path?: string | null
          note?: string | null
          original_estimated_age?: string | null
          original_freshness?: string | null
          original_name?: string
          scan_id?: string | null
          share_image?: boolean
          storage?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scan_feedback_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "fridge_scans"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          price_id: string
          product_id: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id: string
          product_id: string
          status?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id?: string
          product_id?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_active_subscription: {
        Args: { check_env?: string; user_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
