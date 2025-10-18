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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      club_subscriptions: {
        Row: {
          club_id: string
          created_at: string
          current_member_count: number
          current_period_end: string | null
          current_period_start: string | null
          id: string
          monthly_amount: number
          plan_id: string
          status: string
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          current_member_count?: number
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          monthly_amount: number
          plan_id: string
          status?: string
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          current_member_count?: number
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          monthly_amount?: number
          plan_id?: string
          status?: string
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_subscriptions_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          created_at: string
          id: string
          location: string | null
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string | null
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          location?: string | null
          name?: string
        }
        Relationships: []
      }
      ladder_participants: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          joined_at: string
          ladder_id: string
          player_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          joined_at?: string
          ladder_id: string
          player_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          joined_at?: string
          ladder_id?: string
          player_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ladder_participants_ladder_id_fkey"
            columns: ["ladder_id"]
            isOneToOne: false
            referencedRelation: "ladders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ladder_participants_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ladders: {
        Row: {
          club_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          type: string
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          type: string
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ladders_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string
          id: string
          ladder_id: string
          match_date: string
          player1_elo_after: number
          player1_elo_before: number
          player1_id: string
          player1_score: number
          player2_elo_after: number
          player2_elo_before: number
          player2_id: string
          player2_score: number
          winner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ladder_id: string
          match_date?: string
          player1_elo_after: number
          player1_elo_before: number
          player1_id: string
          player1_score: number
          player2_elo_after: number
          player2_elo_before: number
          player2_id: string
          player2_score: number
          winner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ladder_id?: string
          match_date?: string
          player1_elo_after?: number
          player1_elo_before?: number
          player1_id?: string
          player1_score?: number
          player2_elo_after?: number
          player2_elo_before?: number
          player2_id?: string
          player2_score?: number
          winner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_ladder_id_fkey"
            columns: ["ladder_id"]
            isOneToOne: false
            referencedRelation: "ladders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          club_id: string
          created_at: string
          elo_rating: number
          email: string
          first_name: string
          id: string
          last_name: string
          matches_played: number
          matches_won: number
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          elo_rating?: number
          email: string
          first_name: string
          id?: string
          last_name: string
          matches_played?: number
          matches_won?: number
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          elo_rating?: number
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          matches_played?: number
          matches_won?: number
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string
          features: Json | null
          id: string
          max_ladders: number | null
          name: string
          price_per_100_members_monthly: number
        }
        Insert: {
          created_at?: string
          features?: Json | null
          id?: string
          max_ladders?: number | null
          name: string
          price_per_100_members_monthly: number
        }
        Update: {
          created_at?: string
          features?: Json | null
          id?: string
          max_ladders?: number | null
          name?: string
          price_per_100_members_monthly?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          club_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      yearly_winners: {
        Row: {
          created_at: string
          final_elo_rating: number
          id: string
          ladder_id: string
          matches_played: number
          matches_won: number
          player_id: string
          year: number
        }
        Insert: {
          created_at?: string
          final_elo_rating: number
          id?: string
          ladder_id: string
          matches_played: number
          matches_won: number
          player_id: string
          year: number
        }
        Update: {
          created_at?: string
          final_elo_rating?: number
          id?: string
          ladder_id?: string
          matches_played?: number
          matches_won?: number
          player_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "yearly_winners_ladder_id_fkey"
            columns: ["ladder_id"]
            isOneToOne: false
            referencedRelation: "ladders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yearly_winners_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_groups: {
        Row: {
          created_at: string
          gender: Database["public"]["Enums"]["tournament_gender"]
          id: string
          level: string | null
          match_type: Database["public"]["Enums"]["tournament_match_type"]
          name: string
          tournament_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          gender?: Database["public"]["Enums"]["tournament_gender"]
          id?: string
          level?: string | null
          match_type?: Database["public"]["Enums"]["tournament_match_type"]
          name: string
          tournament_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          gender?: Database["public"]["Enums"]["tournament_gender"]
          id?: string
          level?: string | null
          match_type?: Database["public"]["Enums"]["tournament_match_type"]
          name?: string
          tournament_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_groups_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_matches: {
        Row: {
          affects_elo: boolean
          created_at: string
          group_id: string
          id: string
          match_date: string
          player1_elo_after: number
          player1_elo_before: number
          player1_id: string
          player1_score: number
          player2_elo_after: number
          player2_elo_before: number
          player2_id: string
          player2_score: number
          tournament_id: string
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          affects_elo?: boolean
          created_at?: string
          group_id: string
          id?: string
          match_date: string
          player1_elo_after: number
          player1_elo_before: number
          player1_id: string
          player1_score: number
          player2_elo_after: number
          player2_elo_before: number
          player2_id: string
          player2_score: number
          tournament_id: string
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          affects_elo?: boolean
          created_at?: string
          group_id?: string
          id?: string
          match_date?: string
          player1_elo_after?: number
          player1_elo_before?: number
          player1_id?: string
          player1_score?: number
          player2_elo_after?: number
          player2_elo_before?: number
          player2_id?: string
          player2_score?: number
          tournament_id?: string
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_matches_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "tournament_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_participants: {
        Row: {
          created_at: string
          group_id: string
          guest_deleted_at: string | null
          guest_name: string | null
          id: string
          is_guest: boolean
          player_id: string
          tournament_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          guest_deleted_at?: string | null
          guest_name?: string | null
          id?: string
          is_guest?: boolean
          player_id: string
          tournament_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          guest_deleted_at?: string | null
          guest_name?: string | null
          id?: string
          is_guest?: boolean
          player_id?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_participants_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "tournament_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_participants_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_participants_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_winners: {
        Row: {
          bonus_elo_awarded: number
          created_at: string
          final_standing: number
          group_id: string
          id: string
          match_losses: number
          match_wins: number
          player_id: string
          sets_lost: number
          sets_won: number
          tournament_id: string
        }
        Insert: {
          bonus_elo_awarded: number
          created_at?: string
          final_standing: number
          group_id: string
          id?: string
          match_losses?: number
          match_wins?: number
          player_id: string
          sets_lost?: number
          sets_won?: number
          tournament_id: string
        }
        Update: {
          bonus_elo_awarded?: number
          created_at?: string
          final_standing?: number
          group_id?: string
          id?: string
          match_losses?: number
          match_wins?: number
          player_id?: string
          sets_lost?: number
          sets_won?: number
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_winners_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "tournament_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_winners_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_winners_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          club_id: string
          created_at: string
          end_date: string
          format: Database["public"]["Enums"]["tournament_format"]
          id: string
          name: string
          start_date: string
          status: Database["public"]["Enums"]["tournament_status"]
          updated_at: string
          winner_bonus_elo: number
        }
        Insert: {
          club_id: string
          created_at?: string
          end_date: string
          format?: Database["public"]["Enums"]["tournament_format"]
          id?: string
          name: string
          start_date: string
          status?: Database["public"]["Enums"]["tournament_status"]
          updated_at?: string
          winner_bonus_elo?: number
        }
        Update: {
          club_id?: string
          created_at?: string
          end_date?: string
          format?: Database["public"]["Enums"]["tournament_format"]
          id?: string
          name?: string
          start_date?: string
          status?: Database["public"]["Enums"]["tournament_status"]
          updated_at?: string
          winner_bonus_elo?: number
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_club_admin: {
        Args: { _club_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "club_admin" | "user"
      tournament_format: "round_robin"
      tournament_status: "draft" | "active" | "completed"
      tournament_gender: "mens" | "womens" | "mixed"
      tournament_match_type: "singles" | "doubles"
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
      app_role: ["club_admin", "user"],
      tournament_format: ["round_robin"],
      tournament_status: ["draft", "active", "completed"],
      tournament_gender: ["mens", "womens", "mixed"],
      tournament_match_type: ["singles", "doubles"],
    },
  },
} as const
