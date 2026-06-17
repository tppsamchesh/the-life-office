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
      activity_log: {
        Row: {
          activity_type: string | null
          client_id: string | null
          created_at: string | null
          description: string
          family_member_id: string | null
          id: string
          metadata: Json | null
          task_id: string | null
        }
        Insert: {
          activity_type?: string | null
          client_id?: string | null
          created_at?: string | null
          description: string
          family_member_id?: string | null
          id?: string
          metadata?: Json | null
          task_id?: string | null
        }
        Update: {
          activity_type?: string | null
          client_id?: string | null
          created_at?: string | null
          description?: string
          family_member_id?: string | null
          id?: string
          metadata?: Json | null
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_family_member_id_fkey"
            columns: ["family_member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          accommodation_style: string | null
          address_home: Json | null
          address_work: Json | null
          budget_sensitivity: string | null
          children: Json | null
          communication_style: string | null
          country: string | null
          created_at: string | null
          dietary_requirements: Json | null
          email: string | null
          first_name: string
          gift_preferences: Json | null
          household_staff: Json | null
          id: string
          key_contacts: Json | null
          last_name: string
          notes_general: string | null
          onboarding_date: string | null
          partner_email: string | null
          partner_name: string | null
          partner_phone: string | null
          pets: Json | null
          phone_imessage: string | null
          phone_sms: string | null
          phone_whatsapp: string | null
          preferred_channel: string | null
          preferred_name: string | null
          restaurant_preferences: Json | null
          special_requirements: string | null
          status: string | null
          travel_preferences: Json | null
          updated_at: string | null
        }
        Insert: {
          accommodation_style?: string | null
          address_home?: Json | null
          address_work?: Json | null
          budget_sensitivity?: string | null
          children?: Json | null
          communication_style?: string | null
          country?: string | null
          created_at?: string | null
          dietary_requirements?: Json | null
          email?: string | null
          first_name: string
          gift_preferences?: Json | null
          household_staff?: Json | null
          id?: string
          key_contacts?: Json | null
          last_name: string
          notes_general?: string | null
          onboarding_date?: string | null
          partner_email?: string | null
          partner_name?: string | null
          partner_phone?: string | null
          pets?: Json | null
          phone_imessage?: string | null
          phone_sms?: string | null
          phone_whatsapp?: string | null
          preferred_channel?: string | null
          preferred_name?: string | null
          restaurant_preferences?: Json | null
          special_requirements?: string | null
          status?: string | null
          travel_preferences?: Json | null
          updated_at?: string | null
        }
        Update: {
          accommodation_style?: string | null
          address_home?: Json | null
          address_work?: Json | null
          budget_sensitivity?: string | null
          children?: Json | null
          communication_style?: string | null
          country?: string | null
          created_at?: string | null
          dietary_requirements?: Json | null
          email?: string | null
          first_name?: string
          gift_preferences?: Json | null
          household_staff?: Json | null
          id?: string
          key_contacts?: Json | null
          last_name?: string
          notes_general?: string | null
          onboarding_date?: string | null
          partner_email?: string | null
          partner_name?: string | null
          partner_phone?: string | null
          pets?: Json | null
          phone_imessage?: string | null
          phone_sms?: string | null
          phone_whatsapp?: string | null
          preferred_channel?: string | null
          preferred_name?: string | null
          restaurant_preferences?: Json | null
          special_requirements?: string | null
          status?: string | null
          travel_preferences?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      family_members: {
        Row: {
          client_id: string
          created_at: string
          date_of_birth: string | null
          details: Json
          email: string | null
          first_name: string
          id: string
          last_name: string | null
          notes: string | null
          phone: string | null
          preferred_name: string | null
          type: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          date_of_birth?: string | null
          details?: Json
          email?: string | null
          first_name: string
          id?: string
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          preferred_name?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          date_of_birth?: string | null
          details?: Json
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          preferred_name?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          contacted_at: string | null
          converted_at: string | null
          converted_client_id: string | null
          created_at: string
          draft_channel: string | null
          draft_message: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string | null
          meg_edited_message: string | null
          notes: string | null
          phone: string | null
          rejected_reason: string | null
          source: string | null
          stage: string
          updated_at: string
        }
        Insert: {
          contacted_at?: string | null
          converted_at?: string | null
          converted_client_id?: string | null
          created_at?: string
          draft_channel?: string | null
          draft_message?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_name?: string | null
          meg_edited_message?: string | null
          notes?: string | null
          phone?: string | null
          rejected_reason?: string | null
          source?: string | null
          stage?: string
          updated_at?: string
        }
        Update: {
          contacted_at?: string | null
          converted_at?: string | null
          converted_client_id?: string | null
          created_at?: string
          draft_channel?: string | null
          draft_message?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string | null
          meg_edited_message?: string | null
          notes?: string | null
          phone?: string | null
          rejected_reason?: string | null
          source?: string | null
          stage?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_converted_client_id_fkey"
            columns: ["converted_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      lifecycle_dates: {
        Row: {
          category: string | null
          client_id: string | null
          created_at: string | null
          date: string
          family_member_id: string | null
          id: string
          item: string
          last_actioned: string | null
          notes: string | null
          recurrence_interval: string | null
          recurring: boolean | null
          trigger_days_before: number | null
        }
        Insert: {
          category?: string | null
          client_id?: string | null
          created_at?: string | null
          date: string
          family_member_id?: string | null
          id?: string
          item: string
          last_actioned?: string | null
          notes?: string | null
          recurrence_interval?: string | null
          recurring?: boolean | null
          trigger_days_before?: number | null
        }
        Update: {
          category?: string | null
          client_id?: string | null
          created_at?: string | null
          date?: string
          family_member_id?: string | null
          id?: string
          item?: string
          last_actioned?: string | null
          notes?: string | null
          recurrence_interval?: string | null
          recurring?: boolean | null
          trigger_days_before?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lifecycle_dates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lifecycle_dates_family_member_id_fkey"
            columns: ["family_member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          ai_brief: Json | null
          approved_at: string | null
          client_id: string | null
          client_response: string | null
          completed_at: string | null
          created_at: string | null
          dismissed_reason: string | null
          draft_channel: string | null
          draft_message: string | null
          family_member_id: string | null
          id: string
          meg_edited_message: string | null
          meg_notes: string | null
          outcome: string | null
          raw_message: string | null
          request_summary: string | null
          request_type: string | null
          snoozed_until: string | null
          source: string | null
          status: string | null
          thread_id: string | null
          token_usage: Json | null
          updated_at: string | null
          urgency: string | null
        }
        Insert: {
          ai_brief?: Json | null
          approved_at?: string | null
          client_id?: string | null
          client_response?: string | null
          completed_at?: string | null
          created_at?: string | null
          dismissed_reason?: string | null
          draft_channel?: string | null
          draft_message?: string | null
          family_member_id?: string | null
          id?: string
          meg_edited_message?: string | null
          meg_notes?: string | null
          outcome?: string | null
          raw_message?: string | null
          request_summary?: string | null
          request_type?: string | null
          snoozed_until?: string | null
          source?: string | null
          status?: string | null
          thread_id?: string | null
          token_usage?: Json | null
          updated_at?: string | null
          urgency?: string | null
        }
        Update: {
          ai_brief?: Json | null
          approved_at?: string | null
          client_id?: string | null
          client_response?: string | null
          completed_at?: string | null
          created_at?: string | null
          dismissed_reason?: string | null
          draft_channel?: string | null
          draft_message?: string | null
          family_member_id?: string | null
          id?: string
          meg_edited_message?: string | null
          meg_notes?: string | null
          outcome?: string | null
          raw_message?: string | null
          request_summary?: string | null
          request_type?: string | null
          snoozed_until?: string | null
          source?: string | null
          status?: string | null
          thread_id?: string | null
          token_usage?: Json | null
          updated_at?: string | null
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_family_member_id_fkey"
            columns: ["family_member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
