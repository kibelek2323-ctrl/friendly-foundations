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
      ai_usage: {
        Row: {
          count: number
          day: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          count?: number
          day?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          count?: number
          day?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bot_runtime_events: {
        Row: {
          bot_id: string
          created_at: string
          description: string
          event: string
          id: number
          level: string
          user_id: string
        }
        Insert: {
          bot_id: string
          created_at?: string
          description?: string
          event: string
          id?: number
          level?: string
          user_id: string
        }
        Update: {
          bot_id?: string
          created_at?: string
          description?: string
          event?: string
          id?: number
          level?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_runtime_events_bot_fkey"
            columns: ["user_id", "bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      bot_runtime_state: {
        Row: {
          bot_id: string
          created_at: string
          guild_count: number | null
          last_error: string | null
          started_at: string | null
          state: string
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          bot_id: string
          created_at?: string
          guild_count?: number | null
          last_error?: string | null
          started_at?: string | null
          state?: string
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          bot_id?: string
          created_at?: string
          guild_count?: number | null
          last_error?: string | null
          started_at?: string | null
          state?: string
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bot_runtime_state_bot_fkey"
            columns: ["user_id", "bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      bot_tokens: {
        Row: {
          application_id: string | null
          bot_id: string
          ciphertext: string
          created_at: string
          id: string
          iv: string
          key_version: number
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          application_id?: string | null
          bot_id: string
          ciphertext: string
          created_at?: string
          id?: string
          iv: string
          key_version?: number
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          application_id?: string | null
          bot_id?: string
          ciphertext?: string
          created_at?: string
          id?: string
          iv?: string
          key_version?: number
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      bots: {
        Row: {
          created_at: string
          data: Json
          flow_id: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          flow_id?: string | null
          id: string
          name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          flow_id?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      discord_connections: {
        Row: {
          access_token: string
          avatar_url: string | null
          created_at: string
          discord_user_id: string | null
          discriminator: string | null
          expires_at: string | null
          id: string
          refresh_token: string | null
          scopes: string[]
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          access_token: string
          avatar_url?: string | null
          created_at?: string
          discord_user_id?: string | null
          discriminator?: string | null
          expires_at?: string | null
          id?: string
          refresh_token?: string | null
          scopes?: string[]
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          access_token?: string
          avatar_url?: string | null
          created_at?: string
          discord_user_id?: string | null
          discriminator?: string | null
          expires_at?: string | null
          id?: string
          refresh_token?: string | null
          scopes?: string[]
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      flow_templates: {
        Row: {
          category: string
          created_at: string
          description: string
          edges: Json
          icon: string
          id: string
          is_public: boolean
          name: string
          nodes: Json
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string
          edges?: Json
          icon?: string
          id: string
          is_public?: boolean
          name: string
          nodes?: Json
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          edges?: Json
          icon?: string
          id?: string
          is_public?: boolean
          name?: string
          nodes?: Json
          updated_at?: string
        }
        Relationships: []
      }
      flows: {
        Row: {
          created_at: string
          data: Json
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id: string
          name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      plan_code_redemptions: {
        Row: {
          code_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          code_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          code_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_code_redemptions_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "plan_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          created_by: string | null
          duration_days: number | null
          expires_at: string | null
          id: string
          max_uses: number
          plan: Database["public"]["Enums"]["plan_tier"]
          updated_at: string
          used_count: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          duration_days?: number | null
          expires_at?: string | null
          id?: string
          max_uses?: number
          plan: Database["public"]["Enums"]["plan_tier"]
          updated_at?: string
          used_count?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          duration_days?: number | null
          expires_at?: string | null
          id?: string
          max_uses?: number
          plan?: Database["public"]["Enums"]["plan_tier"]
          updated_at?: string
          used_count?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_plans: {
        Row: {
          activated_code_id: string | null
          created_at: string
          expires_at: string | null
          plan: Database["public"]["Enums"]["plan_tier"]
          updated_at: string
          user_id: string
        }
        Insert: {
          activated_code_id?: string | null
          created_at?: string
          expires_at?: string | null
          plan?: Database["public"]["Enums"]["plan_tier"]
          updated_at?: string
          user_id: string
        }
        Update: {
          activated_code_id?: string | null
          created_at?: string
          expires_at?: string | null
          plan?: Database["public"]["Enums"]["plan_tier"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_plans_activated_code_id_fkey"
            columns: ["activated_code_id"]
            isOneToOne: false
            referencedRelation: "plan_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bump_ai_usage: { Args: { _user_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      redeem_plan_code: {
        Args: { _code: string; _user_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user"
      plan_tier: "free" | "pro" | "ultimate"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user"],
      plan_tier: ["free", "pro", "ultimate"],
    },
  },
} as const
