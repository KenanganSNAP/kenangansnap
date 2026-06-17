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
      event_audits: {
        Row: {
          changed_fields: Json
          created_at: string
          edited_by: string | null
          event_id: string
          id: string
          note: string | null
        }
        Insert: {
          changed_fields?: Json
          created_at?: string
          edited_by?: string | null
          event_id: string
          id?: string
          note?: string | null
        }
        Update: {
          changed_fields?: Json
          created_at?: string
          edited_by?: string | null
          event_id?: string
          id?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_audits_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_templates: {
        Row: {
          created_at: string
          event_id: string
          id: string
          sort_order: number
          template_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          sort_order?: number
          template_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          sort_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_templates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_templates_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "photo_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          cover_image_url: string | null
          created_at: string
          custom_data: Json
          date: string | null
          event_type: string
          host_id: string
          id: string
          invitation_image_url: string | null
          is_active: boolean
          reveal_at: string | null
          slug: string
          status: string
          title: string
          venue: string | null
          welcome_message: string | null
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          custom_data?: Json
          date?: string | null
          event_type?: string
          host_id: string
          id?: string
          invitation_image_url?: string | null
          is_active?: boolean
          reveal_at?: string | null
          slug: string
          status?: string
          title: string
          venue?: string | null
          welcome_message?: string | null
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          custom_data?: Json
          date?: string | null
          event_type?: string
          host_id?: string
          id?: string
          invitation_image_url?: string | null
          is_active?: boolean
          reveal_at?: string | null
          slug?: string
          status?: string
          title?: string
          venue?: string | null
          welcome_message?: string | null
        }
        Relationships: []
      }
      guests: {
        Row: {
          created_at: string
          event_id: string
          id: string
          name: string
          session_token: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          name: string
          session_token: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          name?: string
          session_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "guests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_media: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          is_hero: boolean
          kind: string
          sort_order: number
          storage_path: string
          updated_at: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          is_hero?: boolean
          kind?: string
          sort_order?: number
          storage_path: string
          updated_at?: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          is_hero?: boolean
          kind?: string
          sort_order?: number
          storage_path?: string
          updated_at?: string
        }
        Relationships: []
      }
      hosts: {
        Row: {
          created_at: string
          email: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      memories: {
        Row: {
          audio_url: string | null
          content: string | null
          created_at: string
          event_id: string
          guest_id: string | null
          guest_name: string
          id: string
          type: string
        }
        Insert: {
          audio_url?: string | null
          content?: string | null
          created_at?: string
          event_id: string
          guest_id?: string | null
          guest_name: string
          id?: string
          type: string
        }
        Update: {
          audio_url?: string | null
          content?: string | null
          created_at?: string
          event_id?: string
          guest_id?: string | null
          guest_name?: string
          id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "memories_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memories_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_templates: {
        Row: {
          asset_path: string
          config: Json
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          kind: string
          name: string
          preview_path: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          asset_path: string
          config?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          kind: string
          name: string
          preview_path?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          asset_path?: string
          config?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          name?: string
          preview_path?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      photos: {
        Row: {
          created_at: string
          event_id: string
          filter_applied: string | null
          guest_id: string | null
          guest_name: string
          id: string
          media_type: string
          original_url: string | null
          storage_url: string
          template_id: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          filter_applied?: string | null
          guest_id?: string | null
          guest_name: string
          id?: string
          media_type?: string
          original_url?: string | null
          storage_url: string
          template_id?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          filter_applied?: string | null
          guest_id?: string | null
          guest_name?: string
          id?: string
          media_type?: string
          original_url?: string | null
          storage_url?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photos_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "photo_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          key: string
          settings: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          key: string
          settings?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          key?: string
          settings?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          author_name: string
          author_photo_path: string | null
          created_at: string
          event_name: string | null
          id: string
          quote: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          author_name: string
          author_photo_path?: string | null
          created_at?: string
          event_name?: string | null
          id?: string
          quote: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          author_name?: string
          author_photo_path?: string | null
          created_at?: string
          event_name?: string | null
          id?: string
          quote?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "host"
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
      app_role: ["admin", "host"],
    },
  },
} as const
