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
      analytics_events: {
        Row: {
          campaign: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          metadata: Json | null
          referrer: string | null
          source: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          campaign?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          referrer?: string | null
          source?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          campaign?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          referrer?: string | null
          source?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      approval_tokens: {
        Row: {
          campaign: string | null
          created_at: string | null
          testimonial_id: string
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          campaign?: string | null
          created_at?: string | null
          testimonial_id: string
          token?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          campaign?: string | null
          created_at?: string | null
          testimonial_id?: string
          token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      case_studies: {
        Row: {
          about_client: string | null
          campaign: string | null
          challenge: string | null
          client_name: string | null
          created_at: string | null
          id: string
          is_published: boolean | null
          key_stats: Json | null
          published_slug: string | null
          pull_quote: string | null
          results: string | null
          solution: string | null
          testimonial_ids: string[] | null
          title: string
          user_id: string
          views: number | null
        }
        Insert: {
          about_client?: string | null
          campaign?: string | null
          challenge?: string | null
          client_name?: string | null
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          key_stats?: Json | null
          published_slug?: string | null
          pull_quote?: string | null
          results?: string | null
          solution?: string | null
          testimonial_ids?: string[] | null
          title: string
          user_id: string
          views?: number | null
        }
        Update: {
          about_client?: string | null
          campaign?: string | null
          challenge?: string | null
          client_name?: string | null
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          key_stats?: Json | null
          published_slug?: string | null
          pull_quote?: string | null
          results?: string | null
          solution?: string | null
          testimonial_ids?: string[] | null
          title?: string
          user_id?: string
          views?: number | null
        }
        Relationships: []
      }
      collection_forms: {
        Row: {
          brand_color: string | null
          campaign: string | null
          collect_rating: boolean | null
          collect_video: boolean | null
          created_at: string | null
          form_name: string
          headline: string
          id: string
          is_active: boolean | null
          logo_url: string | null
          public_slug: string
          questions: Json | null
          subheadline: string | null
          thank_you_message: string | null
          user_id: string
        }
        Insert: {
          brand_color?: string | null
          campaign?: string | null
          collect_rating?: boolean | null
          collect_video?: boolean | null
          created_at?: string | null
          form_name: string
          headline?: string
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          public_slug?: string
          questions?: Json | null
          subheadline?: string | null
          thank_you_message?: string | null
          user_id: string
        }
        Update: {
          brand_color?: string | null
          campaign?: string | null
          collect_rating?: boolean | null
          collect_video?: boolean | null
          created_at?: string | null
          form_name?: string
          headline?: string
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          public_slug?: string
          questions?: Json | null
          subheadline?: string | null
          thank_you_message?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_sends: {
        Row: {
          campaign: string | null
          customer_email: string
          customer_name: string | null
          id: string
          opened_at: string | null
          sent_at: string | null
          sequence_id: string | null
          status: string | null
          submitted_at: string | null
          user_id: string
        }
        Insert: {
          campaign?: string | null
          customer_email: string
          customer_name?: string | null
          id?: string
          opened_at?: string | null
          sent_at?: string | null
          sequence_id?: string | null
          status?: string | null
          submitted_at?: string | null
          user_id: string
        }
        Update: {
          campaign?: string | null
          customer_email?: string
          customer_name?: string | null
          id?: string
          opened_at?: string | null
          sent_at?: string | null
          sequence_id?: string | null
          status?: string | null
          submitted_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_sends_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "email_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sequences: {
        Row: {
          created_at: string | null
          emails: Json
          id: string
          is_active: boolean | null
          sequence_name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emails?: Json
          id?: string
          is_active?: boolean | null
          sequence_name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          emails?: Json
          id?: string
          is_active?: boolean | null
          sequence_name?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          brand_voice: string | null
          business_logo_url: string | null
          business_name: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          onboarding_completed: boolean | null
          plan: string | null
          plan_expires_at: string | null
          razorpay_customer_id: string | null
          rejection_templates: Json | null
          stripe_customer_id: string | null
          updated_at: string | null
        }
        Insert: {
          brand_voice?: string | null
          business_logo_url?: string | null
          business_name?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          onboarding_completed?: boolean | null
          plan?: string | null
          plan_expires_at?: string | null
          razorpay_customer_id?: string | null
          rejection_templates?: Json | null
          stripe_customer_id?: string | null
          updated_at?: string | null
        }
        Update: {
          brand_voice?: string | null
          business_logo_url?: string | null
          business_name?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean | null
          plan?: string | null
          plan_expires_at?: string | null
          razorpay_customer_id?: string | null
          rejection_templates?: Json | null
          stripe_customer_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      social_posts: {
        Row: {
          caption_text: string
          created_at: string | null
          id: string
          platform: string
          status: string | null
          testimonial_id: string
          user_id: string
        }
        Insert: {
          caption_text: string
          created_at?: string | null
          id?: string
          platform: string
          status?: string | null
          testimonial_id: string
          user_id: string
        }
        Update: {
          caption_text?: string
          created_at?: string | null
          id?: string
          platform?: string
          status?: string | null
          testimonial_id?: string
          user_id?: string
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          ai_rewritten_text: string | null
          approved_at: string | null
          approved_text: string | null
          campaign: string | null
          created_at: string | null
          customer_avatar_url: string | null
          customer_company: string | null
          customer_email: string | null
          customer_name: string
          customer_role: string | null
          id: string
          original_text: string
          rating: number | null
          rejected_at: string | null
          rejection_reason: string | null
          source: string | null
          status: string
          user_id: string
        }
        Insert: {
          ai_rewritten_text?: string | null
          approved_at?: string | null
          approved_text?: string | null
          campaign?: string | null
          created_at?: string | null
          customer_avatar_url?: string | null
          customer_company?: string | null
          customer_email?: string | null
          customer_name: string
          customer_role?: string | null
          id?: string
          original_text: string
          rating?: number | null
          rejected_at?: string | null
          rejection_reason?: string | null
          source?: string | null
          status?: string
          user_id: string
        }
        Update: {
          ai_rewritten_text?: string | null
          approved_at?: string | null
          approved_text?: string | null
          campaign?: string | null
          created_at?: string | null
          customer_avatar_url?: string | null
          customer_company?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_role?: string | null
          id?: string
          original_text?: string
          rating?: number | null
          rejected_at?: string | null
          rejection_reason?: string | null
          source?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      widgets: {
        Row: {
          campaign: string | null
          clicks: number | null
          created_at: string | null
          id: string
          is_published: boolean | null
          settings: Json | null
          testimonial_ids: string[] | null
          user_id: string
          views: number | null
          widget_name: string
          widget_type: string
        }
        Insert: {
          campaign?: string | null
          clicks?: number | null
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          settings?: Json | null
          testimonial_ids?: string[] | null
          user_id: string
          views?: number | null
          widget_name: string
          widget_type?: string
        }
        Update: {
          campaign?: string | null
          clicks?: number | null
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          settings?: Json | null
          testimonial_ids?: string[] | null
          user_id?: string
          views?: number | null
          widget_name?: string
          widget_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_widget_clicks: {
        Args: { widget_id: string }
        Returns: undefined
      }
      increment_widget_views: {
        Args: { widget_id: string }
        Returns: undefined
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
