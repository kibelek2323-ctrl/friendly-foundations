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
      announcement_reads: {
        Row: {
          announcement_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "site_announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      balance_adjustments: {
        Row: {
          admin_id: string | null
          amount: number
          created_at: string
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          admin_id?: string | null
          amount: number
          created_at?: string
          id?: string
          reason?: string
          user_id: string
        }
        Update: {
          admin_id?: string | null
          amount?: number
          created_at?: string
          id?: string
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      balance_code_redemptions: {
        Row: {
          amount: number
          code_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          amount: number
          code_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          code_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "balance_code_redemptions_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "balance_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      balance_codes: {
        Row: {
          active: boolean
          amount: number
          code: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          max_uses: number
          used_count: number
        }
        Insert: {
          active?: boolean
          amount: number
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          max_uses?: number
          used_count?: number
        }
        Update: {
          active?: boolean
          amount?: number
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          max_uses?: number
          used_count?: number
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string | null
          body: string
          cover_url: string | null
          created_at: string
          excerpt: string
          id: string
          kind: string
          published: boolean
          published_at: string | null
          slug: string
          title: string
          updated_at: string
          version: string | null
        }
        Insert: {
          author_id?: string | null
          body?: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string
          id?: string
          kind?: string
          published?: boolean
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
          version?: string | null
        }
        Update: {
          author_id?: string | null
          body?: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string
          id?: string
          kind?: string
          published?: boolean
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
          version?: string | null
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
      crypto_payments: {
        Row: {
          amount: number
          created_at: string
          credited_at: string | null
          expires_at: string | null
          id: string
          invoice_id: string | null
          order_id: string
          pay_address: string | null
          pay_amount: number | null
          pay_currency: string | null
          payment_id: string | null
          plan: Database["public"]["Enums"]["plan_tier"] | null
          purpose: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          credited_at?: string | null
          expires_at?: string | null
          id?: string
          invoice_id?: string | null
          order_id: string
          pay_address?: string | null
          pay_amount?: number | null
          pay_currency?: string | null
          payment_id?: string | null
          plan?: Database["public"]["Enums"]["plan_tier"] | null
          purpose: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          credited_at?: string | null
          expires_at?: string | null
          id?: string
          invoice_id?: string | null
          order_id?: string
          pay_address?: string | null
          pay_amount?: number | null
          pay_currency?: string | null
          payment_id?: string | null
          plan?: Database["public"]["Enums"]["plan_tier"] | null
          purpose?: string
          status?: string
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
      discount_code_redemptions: {
        Row: {
          amount_saved: number
          code_id: string
          created_at: string
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          amount_saved?: number
          code_id: string
          created_at?: string
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          amount_saved?: number
          code_id?: string
          created_at?: string
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_code_redemptions_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_code_redemptions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          listing_id: string | null
          max_uses: number
          percent: number
          updated_at: string
          used_count: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          listing_id?: string | null
          max_uses?: number
          percent: number
          updated_at?: string
          used_count?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          listing_id?: string | null
          max_uses?: number
          percent?: number
          updated_at?: string
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "discount_codes_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      email_otp_codes: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          purpose: string
          user_id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          purpose?: string
          user_id: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          purpose?: string
          user_id?: string
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
      listing_favorites: {
        Row: {
          created_at: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_reviews: {
        Row: {
          comment: string
          created_at: string
          id: string
          listing_id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string
          created_at?: string
          id?: string
          listing_id: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          listing_id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_versions: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          notes: string
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          notes?: string
          version: number
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          notes?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "listing_versions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_listings: {
        Row: {
          bot_data: Json
          category: string
          created_at: string
          description: string
          flow_data: Json | null
          id: string
          images: string[]
          price: number
          published: boolean
          sales_count: number
          seller_id: string
          source_bot_id: string | null
          summary: string
          tags: string[]
          title: string
          updated_at: string
          version: number
          views: number
        }
        Insert: {
          bot_data?: Json
          category?: string
          created_at?: string
          description?: string
          flow_data?: Json | null
          id?: string
          images?: string[]
          price?: number
          published?: boolean
          sales_count?: number
          seller_id: string
          source_bot_id?: string | null
          summary?: string
          tags?: string[]
          title: string
          updated_at?: string
          version?: number
          views?: number
        }
        Update: {
          bot_data?: Json
          category?: string
          created_at?: string
          description?: string
          flow_data?: Json | null
          id?: string
          images?: string[]
          price?: number
          published?: boolean
          sales_count?: number
          seller_id?: string
          source_bot_id?: string | null
          summary?: string
          tags?: string[]
          title?: string
          updated_at?: string
          version?: number
          views?: number
        }
        Relationships: []
      }
      marketplace_purchases: {
        Row: {
          bot_id: string
          buyer_id: string
          created_at: string
          id: string
          listing_id: string
          price: number
        }
        Insert: {
          bot_id: string
          buyer_id: string
          created_at?: string
          id?: string
          listing_id: string
          price: number
        }
        Update: {
          bot_id?: string
          buyer_id?: string
          created_at?: string
          id?: string
          listing_id?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_purchases_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_requests: {
        Row: {
          amount: number
          created_at: string
          destination: string
          id: string
          method: string
          note: string
          processed_at: string | null
          processed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          destination: string
          id?: string
          method: string
          note?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          destination?: string
          id?: string
          method?: string
          note?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
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
      profile_badges: {
        Row: {
          badge: string
          created_at: string
          granted_by: string | null
          id: string
          note: string
          user_id: string
        }
        Insert: {
          badge: string
          created_at?: string
          granted_by?: string | null
          id?: string
          note?: string
          user_id: string
        }
        Update: {
          badge?: string
          created_at?: string
          granted_by?: string | null
          id?: string
          note?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banned: boolean
          bio: string
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          username: string | null
          verified: boolean
        }
        Insert: {
          avatar_url?: string | null
          banned?: boolean
          bio?: string
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
          username?: string | null
          verified?: boolean
        }
        Update: {
          avatar_url?: string | null
          banned?: boolean
          bio?: string
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          username?: string | null
          verified?: boolean
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          clicks: number
          code: string
          created_at: string
          user_id: string
        }
        Insert: {
          clicks?: number
          code: string
          created_at?: string
          user_id: string
        }
        Update: {
          clicks?: number
          code?: string
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          code: string
          created_at: string
          id: string
          referred_id: string
          referrer_id: string
          reward_amount: number
          rewarded_at: string | null
          status: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          referred_id: string
          referrer_id: string
          reward_amount?: number
          rewarded_at?: string | null
          status?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          referred_id?: string
          referrer_id?: string
          reward_amount?: number
          rewarded_at?: string | null
          status?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string
          id: string
          reason: string
          reporter_id: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          target_id: string
          target_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          details?: string
          id?: string
          reason: string
          reporter_id: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id: string
          target_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: string
          id?: string
          reason?: string
          reporter_id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id?: string
          target_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_announcements: {
        Row: {
          active: boolean
          body: string
          created_at: string
          cta_label: string | null
          cta_url: string | null
          dismissible: boolean
          ends_at: string | null
          icon: string
          id: string
          kind: string
          starts_at: string | null
          title: string
          updated_at: string
          variant: string
        }
        Insert: {
          active?: boolean
          body?: string
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          dismissible?: boolean
          ends_at?: string | null
          icon?: string
          id?: string
          kind: string
          starts_at?: string | null
          title?: string
          updated_at?: string
          variant?: string
        }
        Update: {
          active?: boolean
          body?: string
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          dismissible?: boolean
          ends_at?: string | null
          icon?: string
          id?: string
          kind?: string
          starts_at?: string | null
          title?: string
          updated_at?: string
          variant?: string
        }
        Relationships: []
      }
      site_content: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      user_2fa: {
        Row: {
          backup_codes: string[]
          email_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          backup_codes?: string[]
          email_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          backup_codes?: string[]
          email_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_balances: {
        Row: {
          balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          body: string
          created_at: string
          dedupe_key: string | null
          href: string | null
          id: string
          kind: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          dedupe_key?: string | null
          href?: string | null
          id?: string
          kind?: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          dedupe_key?: string | null
          href?: string | null
          id?: string
          kind?: string
          read_at?: string | null
          title?: string
          user_id?: string
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
      admin_adjust_balance: {
        Args: {
          _admin_id: string
          _amount: number
          _reason: string
          _user_id: string
        }
        Returns: Json
      }
      attach_referral: {
        Args: { _code: string; _user_id: string }
        Returns: Json
      }
      bump_ai_usage: { Args: { _user_id: string }; Returns: number }
      bump_listing_view: { Args: { _listing_id: string }; Returns: undefined }
      credit_crypto_payment: {
        Args: { _order_id: string; _pay_currency: string; _payment_id: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      purchase_listing: {
        Args: {
          _bot_data: Json
          _bot_id: string
          _listing_id: string
          _user_id: string
        }
        Returns: Json
      }
      purchase_listing_with_code: {
        Args: {
          _bot_data: Json
          _bot_id: string
          _code?: string
          _listing_id: string
          _user_id: string
        }
        Returns: Json
      }
      quote_discount: {
        Args: { _code: string; _listing_id: string; _user_id: string }
        Returns: Json
      }
      redeem_balance_code: {
        Args: { _code: string; _user_id: string }
        Returns: Json
      }
      redeem_plan_code: {
        Args: { _code: string; _user_id: string }
        Returns: Json
      }
      request_payout: {
        Args: {
          _amount: number
          _destination: string
          _method: string
          _user_id: string
        }
        Returns: Json
      }
      resolve_payout: {
        Args: {
          _admin_id: string
          _approve: boolean
          _note: string
          _payout_id: string
        }
        Returns: Json
      }
      settle_referral: {
        Args: { _spent: number; _user_id: string }
        Returns: undefined
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
