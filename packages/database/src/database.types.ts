export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ai_conversations: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_expense_providers: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_expenses: {
        Row: {
          account_email: string
          amount_cents: number
          created_at: string
          currency: string
          id: string
          provider_id: string
          reason: string
          spend_type: Database["public"]["Enums"]["ai_spend_type"]
          transaction_date: string
          transaction_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_email?: string
          amount_cents: number
          created_at?: string
          currency?: string
          id?: string
          provider_id: string
          reason: string
          spend_type?: Database["public"]["Enums"]["ai_spend_type"]
          transaction_date: string
          transaction_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_email?: string
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          provider_id?: string
          reason?: string
          spend_type?: Database["public"]["Enums"]["ai_spend_type"]
          transaction_date?: string
          transaction_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_expenses_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "ai_expense_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_expenses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ai_expenses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ai_expenses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          citations: Json | null
          content: string
          conversation_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          citations?: Json | null
          content: string
          conversation_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          role: string
          updated_at?: string
        }
        Update: {
          citations?: Json | null
          content?: string
          conversation_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_spending_access_grants: {
        Row: {
          access_level: string
          created_at: string
          deleted_at: string | null
          granted_by: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_level?: string
          created_at?: string
          deleted_at?: string | null
          granted_by?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_level?: string
          created_at?: string
          deleted_at?: string | null
          granted_by?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_spending_access_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ai_spending_access_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ai_spending_access_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_attachments: {
        Row: {
          announcement_id: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          uploaded_at: string
        }
        Insert: {
          announcement_id: string
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          uploaded_at?: string
        }
        Update: {
          announcement_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_attachments_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_comments: {
        Row: {
          announcement_id: string
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          content: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_comments_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "announcement_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "announcement_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_reads: {
        Row: {
          announcement_id: string
          id: string
          read_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          id?: string
          read_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "announcement_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "announcement_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_stars: {
        Row: {
          announcement_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_stars_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_stars_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "announcement_stars_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "announcement_stars_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          allow_comments: boolean | null
          author_id: string
          category: Database["public"]["Enums"]["announcement_category"]
          content: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          excerpt: string | null
          expires_at: string | null
          has_attachments: boolean | null
          id: string
          is_pinned: boolean | null
          priority: Database["public"]["Enums"]["announcement_priority"]
          published_at: string | null
          read_count: number | null
          status: Database["public"]["Enums"]["announcement_status"]
          target_departments: string[] | null
          target_employees: string[] | null
          target_roles: Database["public"]["Enums"]["user_role"][] | null
          title: string
          updated_at: string
        }
        Insert: {
          allow_comments?: boolean | null
          author_id: string
          category?: Database["public"]["Enums"]["announcement_category"]
          content: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          excerpt?: string | null
          expires_at?: string | null
          has_attachments?: boolean | null
          id?: string
          is_pinned?: boolean | null
          priority?: Database["public"]["Enums"]["announcement_priority"]
          published_at?: string | null
          read_count?: number | null
          status?: Database["public"]["Enums"]["announcement_status"]
          target_departments?: string[] | null
          target_employees?: string[] | null
          target_roles?: Database["public"]["Enums"]["user_role"][] | null
          title: string
          updated_at?: string
        }
        Update: {
          allow_comments?: boolean | null
          author_id?: string
          category?: Database["public"]["Enums"]["announcement_category"]
          content?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          excerpt?: string | null
          expires_at?: string | null
          has_attachments?: boolean | null
          id?: string
          is_pinned?: boolean | null
          priority?: Database["public"]["Enums"]["announcement_priority"]
          published_at?: string | null
          read_count?: number | null
          status?: Database["public"]["Enums"]["announcement_status"]
          target_departments?: string[] | null
          target_employees?: string[] | null
          target_roles?: Database["public"]["Enums"]["user_role"][] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      associate_evaluations: {
        Row: {
          areas_for_continued_growth: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          employee_id: string
          evaluated_at: string
          evaluated_by: string
          id: string
          internship_id: string
          key_strengths: string
          overall_assessment: string
          overall_performance: number
          stage: number
          updated_at: string
        }
        Insert: {
          areas_for_continued_growth: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          employee_id: string
          evaluated_at?: string
          evaluated_by: string
          id?: string
          internship_id: string
          key_strengths: string
          overall_assessment: string
          overall_performance: number
          stage: number
          updated_at?: string
        }
        Update: {
          areas_for_continued_growth?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          employee_id?: string
          evaluated_at?: string
          evaluated_by?: string
          id?: string
          internship_id?: string
          key_strengths?: string
          overall_assessment?: string
          overall_performance?: number
          stage?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "associate_evaluations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "associate_evaluations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "associate_evaluations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "associate_evaluations_evaluated_by_fkey"
            columns: ["evaluated_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "associate_evaluations_evaluated_by_fkey"
            columns: ["evaluated_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "associate_evaluations_evaluated_by_fkey"
            columns: ["evaluated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "associate_evaluations_internship_id_fkey"
            columns: ["internship_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["internship_id"]
          },
          {
            foreignKeyName: "associate_evaluations_internship_id_fkey"
            columns: ["internship_id"]
            isOneToOne: false
            referencedRelation: "internships"
            referencedColumns: ["id"]
          },
        ]
      }
      ats_access_grants: {
        Row: {
          access_level: string
          created_at: string
          deleted_at: string | null
          granted_by: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_level?: string
          created_at?: string
          deleted_at?: string | null
          granted_by?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_level?: string
          created_at?: string
          deleted_at?: string | null
          granted_by?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ats_access_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ats_access_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ats_access_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string | null
          id: string
          ip_address: unknown | null
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          operation: string
          performed_at: string
          performed_by: string | null
          record_id: string
          table_name: string
          user_agent: string | null
        }
        Insert: {
          action?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          operation: string
          performed_at?: string
          performed_by?: string | null
          record_id: string
          table_name: string
          user_agent?: string | null
        }
        Update: {
          action?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          operation?: string
          performed_at?: string
          performed_by?: string | null
          record_id?: string
          table_name?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      badge_definitions: {
        Row: {
          created_at: string
          department: string | null
          description: string
          icon: string
          id: string
          name: string
          rarity: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          description: string
          icon: string
          id: string
          name: string
          rarity?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          description?: string
          icon?: string
          id?: string
          name?: string
          rarity?: string
        }
        Relationships: []
      }
      bank_registry: {
        Row: {
          bank_code: string | null
          bank_name: string
          country_code: string
          created_at: string
          id: string
          is_active: boolean | null
          swift_code: string | null
          updated_at: string
        }
        Insert: {
          bank_code?: string | null
          bank_name: string
          country_code: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          swift_code?: string | null
          updated_at?: string
        }
        Update: {
          bank_code?: string | null
          bank_name?: string
          country_code?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          swift_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      business_units: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          display_order: number | null
          hero_image_url: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          overview: string | null
          services: Json | null
          slug: string
          tagline: string | null
          testimonials: Json | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          display_order?: number | null
          hero_image_url?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          overview?: string | null
          services?: Json | null
          slug: string
          tagline?: string | null
          testimonials?: Json | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          display_order?: number | null
          hero_image_url?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          overview?: string | null
          services?: Json | null
          slug?: string
          tagline?: string | null
          testimonials?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      checklist_templates: {
        Row: {
          created_at: string
          created_by: string | null
          flow_type: Database["public"]["Enums"]["checklist_template_flow"]
          id: string
          scope: Database["public"]["Enums"]["checklist_template_scope"]
          tasks: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          flow_type: Database["public"]["Enums"]["checklist_template_flow"]
          id?: string
          scope: Database["public"]["Enums"]["checklist_template_scope"]
          tasks?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          flow_type?: Database["public"]["Enums"]["checklist_template_flow"]
          id?: string
          scope?: Database["public"]["Enums"]["checklist_template_scope"]
          tasks?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "checklist_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "checklist_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      christmas_ornaments: {
        Row: {
          asset_type: Database["public"]["Enums"]["christmas_ornament_asset"]
          created_at: string
          created_by: string | null
          deleted_at: string | null
          event_id: string
          id: string
          position_x: number
          position_y: number
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_type: Database["public"]["Enums"]["christmas_ornament_asset"]
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          event_id: string
          id?: string
          position_x: number
          position_y: number
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_type?: Database["public"]["Enums"]["christmas_ornament_asset"]
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          event_id?: string
          id?: string
          position_x?: number
          position_y?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "christmas_ornaments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "christmas_tree_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "christmas_ornaments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "christmas_ornaments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "christmas_ornaments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      christmas_tree_events: {
        Row: {
          created_at: string
          created_by: string | null
          december_closes_at: string
          december_opens_at: string
          deleted_at: string | null
          event_key: string
          garland_manually_enabled: boolean
          id: string
          is_active: boolean
          lights_manually_enabled: boolean
          november_closes_at: string
          november_opens_at: string
          october_closes_at: string
          october_opens_at: string
          star_manually_enabled: boolean
          timezone: string
          title: string
          updated_at: string
          visible_until: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          december_closes_at: string
          december_opens_at: string
          deleted_at?: string | null
          event_key: string
          garland_manually_enabled?: boolean
          id?: string
          is_active?: boolean
          lights_manually_enabled?: boolean
          november_closes_at: string
          november_opens_at: string
          october_closes_at: string
          october_opens_at: string
          star_manually_enabled?: boolean
          timezone?: string
          title: string
          updated_at?: string
          visible_until: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          december_closes_at?: string
          december_opens_at?: string
          deleted_at?: string | null
          event_key?: string
          garland_manually_enabled?: boolean
          id?: string
          is_active?: boolean
          lights_manually_enabled?: boolean
          november_closes_at?: string
          november_opens_at?: string
          october_closes_at?: string
          october_opens_at?: string
          star_manually_enabled?: boolean
          timezone?: string
          title?: string
          updated_at?: string
          visible_until?: string
        }
        Relationships: []
      }
      christmas_tree_strands: {
        Row: {
          created_at: string
          created_by: string | null
          end_x: number
          end_y: number
          event_id: string
          id: string
          kind: string
          start_x: number
          start_y: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_x: number
          end_y: number
          event_id: string
          id?: string
          kind: string
          start_x: number
          start_y: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_x?: number
          end_y?: number
          event_id?: string
          id?: string
          kind?: string
          start_x?: number
          start_y?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "christmas_tree_strands_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "christmas_tree_strands_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "christmas_tree_strands_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "christmas_tree_strands_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "christmas_tree_events"
            referencedColumns: ["id"]
          },
        ]
      }
      christmas_wishes: {
        Row: {
          category: Database["public"]["Enums"]["christmas_wish_category"]
          content: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          item_number: number
          link_url: string | null
          ornament_id: string
          submitted_at: string
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["christmas_wish_category"]
          content: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          item_number?: number
          link_url?: string | null
          ornament_id: string
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["christmas_wish_category"]
          content?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          item_number?: number
          link_url?: string | null
          ornament_id?: string
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "christmas_wishes_ornament_id_fkey"
            columns: ["ornament_id"]
            isOneToOne: false
            referencedRelation: "christmas_ornaments"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_resources: {
        Row: {
          collection_id: string
          created_at: string
          display_order: number | null
          id: string
          resource_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          display_order?: number | null
          id?: string
          resource_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          display_order?: number | null
          id?: string
          resource_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_resources_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "resource_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_resources_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      company_calendar_event_sync: {
        Row: {
          all_day: boolean
          created_at: string
          end_time: string
          first_seen_at: string
          google_event_id: string
          html_link: string | null
          last_seen_at: string
          location: string | null
          notification_sent_at: string | null
          source_created_at: string | null
          start_time: string
          summary: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          created_at?: string
          end_time: string
          first_seen_at?: string
          google_event_id: string
          html_link?: string | null
          last_seen_at?: string
          location?: string | null
          notification_sent_at?: string | null
          source_created_at?: string | null
          start_time: string
          summary: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          created_at?: string
          end_time?: string
          first_seen_at?: string
          google_event_id?: string
          html_link?: string | null
          last_seen_at?: string
          location?: string | null
          notification_sent_at?: string | null
          source_created_at?: string | null
          start_time?: string
          summary?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_calendar_sync_state: {
        Row: {
          created_at: string
          id: boolean
          initialized_at: string | null
          last_synced_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: boolean
          initialized_at?: string | null
          last_synced_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: boolean
          initialized_at?: string | null
          last_synced_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      company_events: {
        Row: {
          all_day: boolean
          category: Database["public"]["Enums"]["event_category"]
          created_at: string
          created_by: string
          deleted_at: string | null
          department_id: string | null
          description: string | null
          end_time: string
          id: string
          location: string | null
          start_time: string
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          category?: Database["public"]["Enums"]["event_category"]
          created_at?: string
          created_by: string
          deleted_at?: string | null
          department_id?: string | null
          description?: string | null
          end_time: string
          id?: string
          location?: string | null
          start_time: string
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          category?: Database["public"]["Enums"]["event_category"]
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          department_id?: string | null
          description?: string | null
          end_time?: string
          id?: string
          location?: string | null
          start_time?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_events_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_access_grants: {
        Row: {
          created_at: string
          deleted_at: string | null
          granted_by: string | null
          id: string
          tracker: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          granted_by?: string | null
          id?: string
          tracker: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          granted_by?: string | null
          id?: string
          tracker?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_access_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "crm_access_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "crm_access_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_sfo_leads: {
        Row: {
          action_plan: string | null
          action_taken: string | null
          address: string | null
          amount: number
          contact_number: string | null
          created_at: string
          created_by: string | null
          customer_name: string
          customer_type: string
          date_of_contact: string
          deleted_at: string | null
          follow_up_status: string
          id: string
          invoice_number: string | null
          message_source: string | null
          order_date: string | null
          platform: string
          products: string[]
          reason_for_reaching_out: string | null
          remarks: string | null
          social_link: string | null
          status: string
          updated_at: string
        }
        Insert: {
          action_plan?: string | null
          action_taken?: string | null
          address?: string | null
          amount?: number
          contact_number?: string | null
          created_at?: string
          created_by?: string | null
          customer_name: string
          customer_type?: string
          date_of_contact: string
          deleted_at?: string | null
          follow_up_status?: string
          id?: string
          invoice_number?: string | null
          message_source?: string | null
          order_date?: string | null
          platform: string
          products?: string[]
          reason_for_reaching_out?: string | null
          remarks?: string | null
          social_link?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          action_plan?: string | null
          action_taken?: string | null
          address?: string | null
          amount?: number
          contact_number?: string | null
          created_at?: string
          created_by?: string | null
          customer_name?: string
          customer_type?: string
          date_of_contact?: string
          deleted_at?: string | null
          follow_up_status?: string
          id?: string
          invoice_number?: string | null
          message_source?: string | null
          order_date?: string | null
          platform?: string
          products?: string[]
          reason_for_reaching_out?: string | null
          remarks?: string | null
          social_link?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_tech_inquiries: {
        Row: {
          assigned_rep: string | null
          company_background: string | null
          company_name: string
          contact_person: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          follow_up_date: string | null
          id: string
          long_form_remarks: string | null
          pipeline_stage: string
          requirements_checklist: string[]
          requirements_summary: string
          updated_at: string
        }
        Insert: {
          assigned_rep?: string | null
          company_background?: string | null
          company_name: string
          contact_person: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          follow_up_date?: string | null
          id?: string
          long_form_remarks?: string | null
          pipeline_stage?: string
          requirements_checklist?: string[]
          requirements_summary: string
          updated_at?: string
        }
        Update: {
          assigned_rep?: string | null
          company_background?: string | null
          company_name?: string
          contact_person?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          follow_up_date?: string | null
          id?: string
          long_form_remarks?: string | null
          pipeline_stage?: string
          requirements_checklist?: string[]
          requirements_summary?: string
          updated_at?: string
        }
        Relationships: []
      }
      department_leads: {
        Row: {
          appointed_at: string
          appointed_by: string
          department_id: string
          id: string
          revoked_at: string | null
          revoked_by: string | null
          user_id: string
        }
        Insert: {
          appointed_at?: string
          appointed_by: string
          department_id: string
          id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          user_id: string
        }
        Update: {
          appointed_at?: string
          appointed_by?: string
          department_id?: string
          id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_leads_appointed_by_fkey"
            columns: ["appointed_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "department_leads_appointed_by_fkey"
            columns: ["appointed_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "department_leads_appointed_by_fkey"
            columns: ["appointed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_leads_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_leads_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "department_leads_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "department_leads_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_leads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "department_leads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "department_leads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          head_id: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          head_id?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          head_id?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      divisions: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          employee_id: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          is_confidential: boolean
          mime_type: string | null
          notes: string | null
          updated_at: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          employee_id: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          is_confidential?: boolean
          mime_type?: string | null
          notes?: string | null
          updated_at?: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          document_type?: Database["public"]["Enums"]["document_type"]
          employee_id?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          is_confidential?: boolean
          mime_type?: string | null
          notes?: string | null
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      employee_banking_info: {
        Row: {
          account_holder_name: string
          account_number: string | null
          account_type: string | null
          bank_name: string | null
          country_code: string
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          employee_id: string
          iban: string | null
          id: string
          is_verified: boolean | null
          routing_number: string | null
          swift_code: string | null
          updated_at: string
          verified_at: string | null
          wise_recipient_id: string | null
        }
        Insert: {
          account_holder_name: string
          account_number?: string | null
          account_type?: string | null
          bank_name?: string | null
          country_code?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          employee_id: string
          iban?: string | null
          id?: string
          is_verified?: boolean | null
          routing_number?: string | null
          swift_code?: string | null
          updated_at?: string
          verified_at?: string | null
          wise_recipient_id?: string | null
        }
        Update: {
          account_holder_name?: string
          account_number?: string | null
          account_type?: string | null
          bank_name?: string | null
          country_code?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          employee_id?: string
          iban?: string | null
          id?: string
          is_verified?: boolean | null
          routing_number?: string | null
          swift_code?: string | null
          updated_at?: string
          verified_at?: string | null
          wise_recipient_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_banking_info_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employee_directory"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_banking_info_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_banking_info_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      employees: {
        Row: {
          address: string | null
          birthday: string | null
          city: string | null
          company_email: string | null
          created_at: string
          created_by: string | null
          date_hired: string
          date_terminated: string | null
          deleted_at: string | null
          department: string
          division: string | null
          education: string | null
          emergency_contact_country_code: string | null
          emergency_contact_name: string | null
          emergency_contact_number: string | null
          emergency_contact_relationship: string | null
          employee_number: string
          employment_type: Database["public"]["Enums"]["employment_type"]
          first_name: string
          id: string
          immediate_head: string | null
          last_name: string
          linkedin_profile_url: string | null
          manual_probation_status: string | null
          middle_name: string | null
          nationality: string | null
          nicknames: string[]
          payment_account_name: string | null
          payment_account_number: string | null
          payment_address: string | null
          payment_city: string | null
          payment_email: string | null
          payment_phone_number: string | null
          payment_province: string | null
          payment_zipcode: string | null
          payroll_account_name: string | null
          payroll_account_number: string | null
          personal_email: string | null
          phone: string | null
          phone_country_code: string | null
          position: string | null
          postal_code: string | null
          probation_end_date: string | null
          province: string | null
          termination_reason: string | null
          updated_at: string
          user_id: string
          work_arrangement: Database["public"]["Enums"]["work_arrangement"]
        }
        Insert: {
          address?: string | null
          birthday?: string | null
          city?: string | null
          company_email?: string | null
          created_at?: string
          created_by?: string | null
          date_hired: string
          date_terminated?: string | null
          deleted_at?: string | null
          department: string
          division?: string | null
          education?: string | null
          emergency_contact_country_code?: string | null
          emergency_contact_name?: string | null
          emergency_contact_number?: string | null
          emergency_contact_relationship?: string | null
          employee_number: string
          employment_type: Database["public"]["Enums"]["employment_type"]
          first_name: string
          id?: string
          immediate_head?: string | null
          last_name: string
          linkedin_profile_url?: string | null
          manual_probation_status?: string | null
          middle_name?: string | null
          nationality?: string | null
          nicknames?: string[]
          payment_account_name?: string | null
          payment_account_number?: string | null
          payment_address?: string | null
          payment_city?: string | null
          payment_email?: string | null
          payment_phone_number?: string | null
          payment_province?: string | null
          payment_zipcode?: string | null
          payroll_account_name?: string | null
          payroll_account_number?: string | null
          personal_email?: string | null
          phone?: string | null
          phone_country_code?: string | null
          position?: string | null
          postal_code?: string | null
          probation_end_date?: string | null
          province?: string | null
          termination_reason?: string | null
          updated_at?: string
          user_id: string
          work_arrangement: Database["public"]["Enums"]["work_arrangement"]
        }
        Update: {
          address?: string | null
          birthday?: string | null
          city?: string | null
          company_email?: string | null
          created_at?: string
          created_by?: string | null
          date_hired?: string
          date_terminated?: string | null
          deleted_at?: string | null
          department?: string
          division?: string | null
          education?: string | null
          emergency_contact_country_code?: string | null
          emergency_contact_name?: string | null
          emergency_contact_number?: string | null
          emergency_contact_relationship?: string | null
          employee_number?: string
          employment_type?: Database["public"]["Enums"]["employment_type"]
          first_name?: string
          id?: string
          immediate_head?: string | null
          last_name?: string
          linkedin_profile_url?: string | null
          manual_probation_status?: string | null
          middle_name?: string | null
          nationality?: string | null
          nicknames?: string[]
          payment_account_name?: string | null
          payment_account_number?: string | null
          payment_address?: string | null
          payment_city?: string | null
          payment_email?: string | null
          payment_phone_number?: string | null
          payment_province?: string | null
          payment_zipcode?: string | null
          payroll_account_name?: string | null
          payroll_account_number?: string | null
          personal_email?: string | null
          phone?: string | null
          phone_country_code?: string | null
          position?: string | null
          postal_code?: string | null
          probation_end_date?: string | null
          province?: string | null
          termination_reason?: string | null
          updated_at?: string
          user_id?: string
          work_arrangement?: Database["public"]["Enums"]["work_arrangement"]
        }
        Relationships: [
          {
            foreignKeyName: "employees_immediate_head_fkey"
            columns: ["immediate_head"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "employees_immediate_head_fkey"
            columns: ["immediate_head"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "employees_immediate_head_fkey"
            columns: ["immediate_head"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "employees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "employees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_entries: {
        Row: {
          ai_confidence: number | null
          ai_credit_account: string | null
          ai_debit_account: string | null
          approval_state: string
          business_justification: string | null
          category_code: string | null
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          department_id: string | null
          employee_id: string | null
          exchange_rate_to_aud: number | null
          expense_type: Database["public"]["Enums"]["expense_type"]
          fx_rates_fetched_at: string | null
          fx_source: string | null
          id: string
          leadership_decision_at: string | null
          leadership_decision_by: string | null
          match_status: Database["public"]["Enums"]["expense_match_status"]
          matched_at: string | null
          matched_by: string | null
          matched_entry_id: string | null
          matched_notes: string | null
          matched_variance_amount: number | null
          payment_source: string
          payment_status: string
          processing_status: string
          receipt_document_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          risk_bucket: string
          source_record_id: string | null
          source_system: string
          source_type: Database["public"]["Enums"]["expense_source_type"]
          submitted_by: string
          subscription_id: string | null
          tax_amount: number
          tax_amount_aud: number | null
          total_amount: number
          total_amount_aud: number | null
          transaction_date: string
          updated_at: string
          vendor_name: string
          verified_credit_account: string | null
          verified_debit_account: string | null
        }
        Insert: {
          ai_confidence?: number | null
          ai_credit_account?: string | null
          ai_debit_account?: string | null
          approval_state?: string
          business_justification?: string | null
          category_code?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          department_id?: string | null
          employee_id?: string | null
          exchange_rate_to_aud?: number | null
          expense_type?: Database["public"]["Enums"]["expense_type"]
          fx_rates_fetched_at?: string | null
          fx_source?: string | null
          id?: string
          leadership_decision_at?: string | null
          leadership_decision_by?: string | null
          match_status?: Database["public"]["Enums"]["expense_match_status"]
          matched_at?: string | null
          matched_by?: string | null
          matched_entry_id?: string | null
          matched_notes?: string | null
          matched_variance_amount?: number | null
          payment_source?: string
          payment_status?: string
          processing_status?: string
          receipt_document_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          risk_bucket?: string
          source_record_id?: string | null
          source_system?: string
          source_type?: Database["public"]["Enums"]["expense_source_type"]
          submitted_by: string
          subscription_id?: string | null
          tax_amount?: number
          tax_amount_aud?: number | null
          total_amount: number
          total_amount_aud?: number | null
          transaction_date: string
          updated_at?: string
          vendor_name: string
          verified_credit_account?: string | null
          verified_debit_account?: string | null
        }
        Update: {
          ai_confidence?: number | null
          ai_credit_account?: string | null
          ai_debit_account?: string | null
          approval_state?: string
          business_justification?: string | null
          category_code?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          department_id?: string | null
          employee_id?: string | null
          exchange_rate_to_aud?: number | null
          expense_type?: Database["public"]["Enums"]["expense_type"]
          fx_rates_fetched_at?: string | null
          fx_source?: string | null
          id?: string
          leadership_decision_at?: string | null
          leadership_decision_by?: string | null
          match_status?: Database["public"]["Enums"]["expense_match_status"]
          matched_at?: string | null
          matched_by?: string | null
          matched_entry_id?: string | null
          matched_notes?: string | null
          matched_variance_amount?: number | null
          payment_source?: string
          payment_status?: string
          processing_status?: string
          receipt_document_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          risk_bucket?: string
          source_record_id?: string | null
          source_system?: string
          source_type?: Database["public"]["Enums"]["expense_source_type"]
          submitted_by?: string
          subscription_id?: string | null
          tax_amount?: number
          tax_amount_aud?: number | null
          total_amount?: number
          total_amount_aud?: number | null
          transaction_date?: string
          updated_at?: string
          vendor_name?: string
          verified_credit_account?: string | null
          verified_debit_account?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_entries_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "expense_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "expense_entries_matched_entry_id_fkey"
            columns: ["matched_entry_id"]
            isOneToOne: false
            referencedRelation: "expense_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_entries_receipt_document_id_fkey"
            columns: ["receipt_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_subscription_fk"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "finance_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_approval_settings: {
        Row: {
          ceo_user_id: string | null
          coo_user_id: string | null
          id: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ceo_user_id?: string | null
          coo_user_id?: string | null
          id?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ceo_user_id?: string | null
          coo_user_id?: string | null
          id?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_approval_settings_ceo_user_id_fkey"
            columns: ["ceo_user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "finance_approval_settings_ceo_user_id_fkey"
            columns: ["ceo_user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "finance_approval_settings_ceo_user_id_fkey"
            columns: ["ceo_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_approval_settings_coo_user_id_fkey"
            columns: ["coo_user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "finance_approval_settings_coo_user_id_fkey"
            columns: ["coo_user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "finance_approval_settings_coo_user_id_fkey"
            columns: ["coo_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_approval_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "finance_approval_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "finance_approval_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_budgets: {
        Row: {
          amount_aud: number
          category_code: string
          id: string
          month: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount_aud: number
          category_code: string
          id?: string
          month: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount_aud?: number
          category_code?: string
          id?: string
          month?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_budgets_category_code_fkey"
            columns: ["category_code"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "finance_budgets_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "finance_budgets_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "finance_budgets_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_categories: {
        Row: {
          code: string
          example: string
          name: string
          sort_order: number
        }
        Insert: {
          code: string
          example: string
          name: string
          sort_order: number
        }
        Update: {
          code?: string
          example?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      finance_properties: {
        Row: {
          created_at: string
          created_by: string
          due_day: number
          id: string
          name: string
          occupancy: string
          property_type: string
          tenant_name: string | null
          weekly_rent_aud: number
        }
        Insert: {
          created_at?: string
          created_by: string
          due_day: number
          id?: string
          name: string
          occupancy?: string
          property_type: string
          tenant_name?: string | null
          weekly_rent_aud: number
        }
        Update: {
          created_at?: string
          created_by?: string
          due_day?: number
          id?: string
          name?: string
          occupancy?: string
          property_type?: string
          tenant_name?: string | null
          weekly_rent_aud?: number
        }
        Relationships: [
          {
            foreignKeyName: "finance_properties_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "finance_properties_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "finance_properties_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_property_maintenance: {
        Row: {
          contractor: string | null
          cost_aud: number
          created_at: string
          created_by: string
          description: string
          id: string
          invoice_reference: string | null
          job_date: string
          property_id: string
          status: string
        }
        Insert: {
          contractor?: string | null
          cost_aud: number
          created_at?: string
          created_by: string
          description: string
          id?: string
          invoice_reference?: string | null
          job_date: string
          property_id: string
          status: string
        }
        Update: {
          contractor?: string | null
          cost_aud?: number
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          invoice_reference?: string | null
          job_date?: string
          property_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_property_maintenance_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "finance_property_maintenance_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "finance_property_maintenance_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_property_maintenance_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "finance_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_property_maintenance_status_events: {
        Row: {
          changed_at: string
          changed_by: string
          id: string
          maintenance_id: string
          next_status: string
          previous_status: string
        }
        Insert: {
          changed_at?: string
          changed_by: string
          id?: string
          maintenance_id: string
          next_status: string
          previous_status: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          id?: string
          maintenance_id?: string
          next_status?: string
          previous_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_property_maintenance_status_events_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "finance_property_maintenance_status_events_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "finance_property_maintenance_status_events_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_property_maintenance_status_events_maintenance_id_fkey"
            columns: ["maintenance_id"]
            isOneToOne: false
            referencedRelation: "finance_property_maintenance"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_property_monthly_expected_rent: {
        Row: {
          calculation_note: string | null
          expected_rent_aud: number
          period_month: string
          property_id: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          calculation_note?: string | null
          expected_rent_aud: number
          period_month: string
          property_id: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          calculation_note?: string | null
          expected_rent_aud?: number
          period_month?: string
          property_id?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_property_monthly_expected_rent_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "finance_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_property_monthly_expected_rent_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "finance_property_monthly_expected_rent_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "finance_property_monthly_expected_rent_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_property_rent_payments: {
        Row: {
          amount_aud: number
          created_at: string
          created_by: string
          id: string
          period_month: string
          property_id: string
          received_on: string
          reference: string | null
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          amount_aud: number
          created_at?: string
          created_by: string
          id?: string
          period_month: string
          property_id: string
          received_on: string
          reference?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          amount_aud?: number
          created_at?: string
          created_by?: string
          id?: string
          period_month?: string
          property_id?: string
          received_on?: string
          reference?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_property_rent_payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "finance_property_rent_payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "finance_property_rent_payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_property_rent_payments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "finance_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_property_rent_payments_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "finance_property_rent_payments_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "finance_property_rent_payments_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_property_terms: {
        Row: {
          changed_at: string
          changed_by: string
          due_day: number
          effective_month: string
          occupancy: string
          property_id: string
          tenant_name: string | null
          weekly_rent_aud: number
        }
        Insert: {
          changed_at?: string
          changed_by: string
          due_day: number
          effective_month: string
          occupancy: string
          property_id: string
          tenant_name?: string | null
          weekly_rent_aud: number
        }
        Update: {
          changed_at?: string
          changed_by?: string
          due_day?: number
          effective_month?: string
          occupancy?: string
          property_id?: string
          tenant_name?: string | null
          weekly_rent_aud?: number
        }
        Relationships: [
          {
            foreignKeyName: "finance_property_terms_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "finance_property_terms_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "finance_property_terms_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_property_terms_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "finance_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_report_snapshots: {
        Row: {
          created_at: string
          created_by: string
          exception_count: number
          finalized_at: string | null
          id: string
          report_data: Json
          report_month: string
          status: string
        }
        Insert: {
          created_at?: string
          created_by: string
          exception_count?: number
          finalized_at?: string | null
          id?: string
          report_data: Json
          report_month: string
          status: string
        }
        Update: {
          created_at?: string
          created_by?: string
          exception_count?: number
          finalized_at?: string | null
          id?: string
          report_data?: Json
          report_month?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_report_snapshots_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "finance_report_snapshots_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "finance_report_snapshots_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_subscriptions: {
        Row: {
          active: boolean
          category_code: string
          created_at: string
          created_by: string | null
          id: string
          monthly_amount_aud: number | null
          next_renewal: string | null
          notes: string | null
          payment_source: string
          seats: number | null
          updated_at: string
          vendor_name: string
        }
        Insert: {
          active?: boolean
          category_code: string
          created_at?: string
          created_by?: string | null
          id?: string
          monthly_amount_aud?: number | null
          next_renewal?: string | null
          notes?: string | null
          payment_source?: string
          seats?: number | null
          updated_at?: string
          vendor_name: string
        }
        Update: {
          active?: boolean
          category_code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          monthly_amount_aud?: number | null
          next_renewal?: string | null
          notes?: string | null
          payment_source?: string
          seats?: number | null
          updated_at?: string
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_subscriptions_category_code_fkey"
            columns: ["category_code"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "finance_subscriptions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "finance_subscriptions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "finance_subscriptions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_variance_signoffs: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision: string
          expense_id: string
          reason: string
          required_approver: string | null
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision?: string
          expense_id: string
          reason: string
          required_approver?: string | null
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision?: string
          expense_id?: string
          reason?: string
          required_approver?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_variance_signoffs_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "finance_variance_signoffs_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "finance_variance_signoffs_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_variance_signoffs_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: true
            referencedRelation: "expense_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_variance_signoffs_required_approver_fkey"
            columns: ["required_approver"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "finance_variance_signoffs_required_approver_fkey"
            columns: ["required_approver"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "finance_variance_signoffs_required_approver_fkey"
            columns: ["required_approver"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      five_percent_reflections: {
        Row: {
          created_at: string
          created_by: string | null
          deep_dive_parking_lot: string
          deleted_at: string | null
          department_role: string
          employee_id: string | null
          exploration_topics: string
          family_action: string
          family_feelings: string
          family_headline: string
          family_rank: number
          family_significance: string
          full_name: string
          id: string
          month_key: string
          personal_action: string
          personal_feelings: string
          personal_headline: string
          personal_rank: number
          personal_significance: string
          submitted_at: string
          updated_at: string
          user_id: string
          work_action: string
          work_feelings: string
          work_headline: string
          work_rank: number
          work_significance: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deep_dive_parking_lot: string
          deleted_at?: string | null
          department_role: string
          employee_id?: string | null
          exploration_topics: string
          family_action: string
          family_feelings: string
          family_headline: string
          family_rank: number
          family_significance: string
          full_name: string
          id?: string
          month_key: string
          personal_action: string
          personal_feelings: string
          personal_headline: string
          personal_rank: number
          personal_significance: string
          submitted_at?: string
          updated_at?: string
          user_id: string
          work_action: string
          work_feelings: string
          work_headline: string
          work_rank: number
          work_significance: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deep_dive_parking_lot?: string
          deleted_at?: string | null
          department_role?: string
          employee_id?: string | null
          exploration_topics?: string
          family_action?: string
          family_feelings?: string
          family_headline?: string
          family_rank?: number
          family_significance?: string
          full_name?: string
          id?: string
          month_key?: string
          personal_action?: string
          personal_feelings?: string
          personal_headline?: string
          personal_rank?: number
          personal_significance?: string
          submitted_at?: string
          updated_at?: string
          user_id?: string
          work_action?: string
          work_feelings?: string
          work_headline?: string
          work_rank?: number
          work_significance?: string
        }
        Relationships: [
          {
            foreignKeyName: "five_percent_reflections_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "five_percent_reflections_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "five_percent_reflections_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "five_percent_reflections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "five_percent_reflections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "five_percent_reflections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      fx_rates: {
        Row: {
          base_currency: string
          created_at: string
          fetched_at: string
          id: string
          rates: Json
        }
        Insert: {
          base_currency?: string
          created_at?: string
          fetched_at?: string
          id?: string
          rates: Json
        }
        Update: {
          base_currency?: string
          created_at?: string
          fetched_at?: string
          id?: string
          rates?: Json
        }
        Relationships: []
      }
      hub_usage_daily: {
        Row: {
          activity_date: string
          first_seen_at: string
          heartbeat_count: number
          last_seen_at: string
          session_count: number
          user_id: string
        }
        Insert: {
          activity_date: string
          first_seen_at: string
          heartbeat_count?: number
          last_seen_at: string
          session_count?: number
          user_id: string
        }
        Update: {
          activity_date?: string
          first_seen_at?: string
          heartbeat_count?: number
          last_seen_at?: string
          session_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hub_usage_daily_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "hub_usage_daily_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "hub_usage_daily_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_usage_session_windows: {
        Row: {
          activity_date: string
          last_seen_at: string
          session_id: string
          user_id: string
        }
        Insert: {
          activity_date: string
          last_seen_at?: string
          session_id: string
          user_id: string
        }
        Update: {
          activity_date?: string
          last_seen_at?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hub_usage_session_windows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "hub_usage_session_windows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "hub_usage_session_windows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiry_deduplication_keys: {
        Row: {
          expires_at: string
          fingerprint: string
        }
        Insert: {
          expires_at: string
          fingerprint: string
        }
        Update: {
          expires_at?: string
          fingerprint?: string
        }
        Relationships: []
      }
      inquiry_rate_limit_buckets: {
        Row: {
          expires_at: string
          identifier_hash: string
          last_refill_at: string
          scope: string
          tokens: number
        }
        Insert: {
          expires_at: string
          identifier_hash: string
          last_refill_at: string
          scope: string
          tokens: number
        }
        Update: {
          expires_at?: string
          identifier_hash?: string
          last_refill_at?: string
          scope?: string
          tokens?: number
        }
        Relationships: []
      }
      intern_daily_logs: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          attachments: Json
          challenges: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          hours_worked: number
          id: string
          internship_id: string
          is_approved: boolean
          learnings: string | null
          log_date: string
          project_entries: Json
          status: string
          supervisor_notes: string | null
          tasks_completed: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          attachments?: Json
          challenges?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          hours_worked: number
          id?: string
          internship_id: string
          is_approved?: boolean
          learnings?: string | null
          log_date: string
          project_entries?: Json
          status?: string
          supervisor_notes?: string | null
          tasks_completed: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          attachments?: Json
          challenges?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          hours_worked?: number
          id?: string
          internship_id?: string
          is_approved?: boolean
          learnings?: string | null
          log_date?: string
          project_entries?: Json
          status?: string
          supervisor_notes?: string | null
          tasks_completed?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intern_daily_logs_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "intern_daily_logs_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "intern_daily_logs_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intern_daily_logs_internship_id_fkey"
            columns: ["internship_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["internship_id"]
          },
          {
            foreignKeyName: "intern_daily_logs_internship_id_fkey"
            columns: ["internship_id"]
            isOneToOne: false
            referencedRelation: "internships"
            referencedColumns: ["id"]
          },
        ]
      }
      intern_eod_digest_runs: {
        Row: {
          channel: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          destination_key: string
          error_message: string | null
          id: string
          report_date: string
          sent_at: string | null
          status: string
          summary_json: Json
          updated_at: string
          workflow_execution_id: string | null
        }
        Insert: {
          channel?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          destination_key: string
          error_message?: string | null
          id?: string
          report_date: string
          sent_at?: string | null
          status?: string
          summary_json?: Json
          updated_at?: string
          workflow_execution_id?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          destination_key?: string
          error_message?: string | null
          id?: string
          report_date?: string
          sent_at?: string | null
          status?: string
          summary_json?: Json
          updated_at?: string
          workflow_execution_id?: string | null
        }
        Relationships: []
      }
      internships: {
        Row: {
          completed_hours: number
          created_at: string
          created_by: string | null
          deleted_at: string | null
          department: string
          division: string | null
          employee_id: string
          end_date: string
          id: string
          program: string | null
          required_hours: number
          school: string | null
          start_date: string
          status: Database["public"]["Enums"]["internship_status"]
          supervisor_id: string | null
          updated_at: string
          weekly_required_hours: number
        }
        Insert: {
          completed_hours?: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          department: string
          division?: string | null
          employee_id: string
          end_date: string
          id?: string
          program?: string | null
          required_hours?: number
          school?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["internship_status"]
          supervisor_id?: string | null
          updated_at?: string
          weekly_required_hours?: number
        }
        Update: {
          completed_hours?: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          department?: string
          division?: string | null
          employee_id?: string
          end_date?: string
          id?: string
          program?: string | null
          required_hours?: number
          school?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["internship_status"]
          supervisor_id?: string | null
          updated_at?: string
          weekly_required_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "internships_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "internships_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internships_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "internships_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "internships_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "internships_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          quantity: number
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          quantity?: number
          total: number
          unit_price: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          converted_amount: number | null
          created_at: string
          created_by: string | null
          deductions: number | null
          deleted_at: string | null
          document_id: string | null
          employee_id: string
          exchange_rate: number | null
          gross_amount: number
          hourly_rate: number | null
          hours_worked: number | null
          id: string
          invoice_number: string
          net_amount: number
          notes: string | null
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          period_end: string
          period_start: string
          source_currency: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          submitted_at: string | null
          target_currency: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          converted_amount?: number | null
          created_at?: string
          created_by?: string | null
          deductions?: number | null
          deleted_at?: string | null
          document_id?: string | null
          employee_id: string
          exchange_rate?: number | null
          gross_amount: number
          hourly_rate?: number | null
          hours_worked?: number | null
          id?: string
          invoice_number: string
          net_amount: number
          notes?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          period_end: string
          period_start: string
          source_currency?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          submitted_at?: string | null
          target_currency?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          converted_amount?: number | null
          created_at?: string
          created_by?: string | null
          deductions?: number | null
          deleted_at?: string | null
          document_id?: string | null
          employee_id?: string
          exchange_rate?: number | null
          gross_amount?: number
          hourly_rate?: number | null
          hours_worked?: number | null
          id?: string
          invoice_number?: string
          net_amount?: number
          notes?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          period_end?: string
          period_start?: string
          source_currency?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          submitted_at?: string | null
          target_currency?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "invoices_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "invoices_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "invoices_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      job_applications: {
        Row: {
          ai_evaluated_at: string | null
          ai_evaluation_model: string | null
          ai_evaluation_status: string
          ai_executive_summary: string | null
          ai_match_score: number | null
          ai_missing_requirements: Json | null
          ai_top_strengths: Json | null
          cover_letter: string | null
          created_at: string
          cv_url: string
          deleted_at: string | null
          email: string
          full_name: string
          id: string
          job_posting_id: string | null
          notes: string | null
          parsed_resume_markdown: string | null
          phone: string | null
          resume_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          ai_evaluated_at?: string | null
          ai_evaluation_model?: string | null
          ai_evaluation_status?: string
          ai_executive_summary?: string | null
          ai_match_score?: number | null
          ai_missing_requirements?: Json | null
          ai_top_strengths?: Json | null
          cover_letter?: string | null
          created_at?: string
          cv_url: string
          deleted_at?: string | null
          email: string
          full_name: string
          id?: string
          job_posting_id?: string | null
          notes?: string | null
          parsed_resume_markdown?: string | null
          phone?: string | null
          resume_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          ai_evaluated_at?: string | null
          ai_evaluation_model?: string | null
          ai_evaluation_status?: string
          ai_executive_summary?: string | null
          ai_match_score?: number | null
          ai_missing_requirements?: Json | null
          ai_top_strengths?: Json | null
          cover_letter?: string | null
          created_at?: string
          cv_url?: string
          deleted_at?: string | null
          email?: string
          full_name?: string
          id?: string
          job_posting_id?: string | null
          notes?: string | null
          parsed_resume_markdown?: string | null
          phone?: string | null
          resume_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_job_posting_id_fkey"
            columns: ["job_posting_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
        ]
      }
      job_postings: {
        Row: {
          benefits: string | null
          business_unit_id: string | null
          closes_at: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          department: string | null
          description: string
          employment_type: string | null
          id: string
          is_active: boolean
          location: string | null
          published_at: string | null
          requirements: string | null
          salary_range: string | null
          title: string
          updated_at: string
        }
        Insert: {
          benefits?: string | null
          business_unit_id?: string | null
          closes_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          department?: string | null
          description: string
          employment_type?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          published_at?: string | null
          requirements?: string | null
          salary_range?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          benefits?: string | null
          business_unit_id?: string | null
          closes_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          department?: string | null
          description?: string
          employment_type?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          published_at?: string | null
          requirements?: string | null
          salary_range?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_postings_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
        ]
      }
      job_requisitions: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          filled_headcount: number
          id: string
          job_posting_id: string | null
          status: string
          total_headcount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          filled_headcount?: number
          id?: string
          job_posting_id?: string | null
          status?: string
          total_headcount: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          filled_headcount?: number
          id?: string
          job_posting_id?: string | null
          status?: string
          total_headcount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_requisitions_job_posting_id_fkey"
            columns: ["job_posting_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_embeddings: {
        Row: {
          chunk_index: number
          chunk_text: string
          created_at: string
          embedding: string
          id: string
          metadata: Json | null
          source_id: string
        }
        Insert: {
          chunk_index: number
          chunk_text: string
          created_at?: string
          embedding: string
          id?: string
          metadata?: Json | null
          source_id: string
        }
        Update: {
          chunk_index?: number
          chunk_text?: string
          created_at?: string
          embedding?: string
          id?: string
          metadata?: Json | null
          source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_knowledge_embeddings_knowledge_sources_source_id"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "knowledge_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_source_versions: {
        Row: {
          change_summary: string | null
          changed_by: string
          content: string
          created_at: string
          id: string
          metadata: Json | null
          source_id: string
          title: string
          version_number: number
        }
        Insert: {
          change_summary?: string | null
          changed_by: string
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          source_id: string
          title: string
          version_number: number
        }
        Update: {
          change_summary?: string | null
          changed_by?: string
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          source_id?: string
          title?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_source_versions_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "knowledge_source_versions_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "knowledge_source_versions_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_source_versions_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "knowledge_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_sources: {
        Row: {
          access_level: string | null
          content: string | null
          created_at: string
          created_by: string | null
          current_version: number | null
          deleted_at: string | null
          description: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: string
          is_active: boolean
          metadata: Json | null
          mime_type: string | null
          processing_status: string | null
          source_type: Database["public"]["Enums"]["knowledge_source_type"]
          tags: string[] | null
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          access_level?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          current_version?: number | null
          deleted_at?: string | null
          description?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          mime_type?: string | null
          processing_status?: string | null
          source_type: Database["public"]["Enums"]["knowledge_source_type"]
          tags?: string[] | null
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          access_level?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          current_version?: number | null
          deleted_at?: string | null
          description?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          mime_type?: string | null
          processing_status?: string | null
          source_type?: Database["public"]["Enums"]["knowledge_source_type"]
          tags?: string[] | null
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      kpi_evidence: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          evidence_type: string
          file_name: string | null
          file_size: number | null
          id: string
          kpi_id: string
          label: string | null
          mime_type: string | null
          submitted_by: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          deleted_at?: string | null
          evidence_type: string
          file_name?: string | null
          file_size?: number | null
          id?: string
          kpi_id: string
          label?: string | null
          mime_type?: string | null
          submitted_by: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          evidence_type?: string
          file_name?: string | null
          file_size?: number | null
          id?: string
          kpi_id?: string
          label?: string | null
          mime_type?: string | null
          submitted_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpi_evidence_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "kpis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_evidence_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "kpi_evidence_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "kpi_evidence_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      kpis: {
        Row: {
          admin_comments: string | null
          admin_rating: string | null
          created_at: string
          current_value: number | null
          cycle_id: string | null
          employee_id: string
          evaluated_at: string | null
          evaluated_by: string | null
          id: string
          kpi_type: string
          name: string
          period_end: string
          period_start: string
          progress_pct: number | null
          rubric_1: string | null
          rubric_2: string | null
          rubric_3: string | null
          rubric_4: string | null
          self_rating: number | null
          status: string | null
          submitted_at: string | null
          target_value: number
          unit: string | null
          updated_at: string
        }
        Insert: {
          admin_comments?: string | null
          admin_rating?: string | null
          created_at?: string
          current_value?: number | null
          cycle_id?: string | null
          employee_id: string
          evaluated_at?: string | null
          evaluated_by?: string | null
          id?: string
          kpi_type?: string
          name: string
          period_end: string
          period_start: string
          progress_pct?: number | null
          rubric_1?: string | null
          rubric_2?: string | null
          rubric_3?: string | null
          rubric_4?: string | null
          self_rating?: number | null
          status?: string | null
          submitted_at?: string | null
          target_value: number
          unit?: string | null
          updated_at?: string
        }
        Update: {
          admin_comments?: string | null
          admin_rating?: string | null
          created_at?: string
          current_value?: number | null
          cycle_id?: string | null
          employee_id?: string
          evaluated_at?: string | null
          evaluated_by?: string | null
          id?: string
          kpi_type?: string
          name?: string
          period_end?: string
          period_start?: string
          progress_pct?: number | null
          rubric_1?: string | null
          rubric_2?: string | null
          rubric_3?: string | null
          rubric_4?: string | null
          self_rating?: number | null
          status?: string | null
          submitted_at?: string | null
          target_value?: number
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpis_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "review_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpis_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "kpis_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpis_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      leaderboard_snapshots: {
        Row: {
          created_at: string
          id: string
          period_end: string
          period_start: string
          ranking: Json
          scope: string
        }
        Insert: {
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          ranking: Json
          scope?: string
        }
        Update: {
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          ranking?: Json
          scope?: string
        }
        Relationships: []
      }
      marketing_access_grants: {
        Row: {
          can_submit: boolean
          can_view_overview: boolean
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          platform_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          can_submit?: boolean
          can_view_overview?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          platform_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          can_submit?: boolean
          can_view_overview?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          platform_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_access_grants_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "marketing_platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          billing_cycle: string
          campaign_month: string
          cap_amount: number
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          id: string
          name: string
          platform_id: string
          status: string
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          campaign_month: string
          cap_amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          id?: string
          name: string
          platform_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          campaign_month?: string
          cap_amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          id?: string
          name?: string
          platform_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "marketing_platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_deliverables_reminder_recipients: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          included: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          included?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          included?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_deliverables_reminder_recipients_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employee_directory"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "marketing_deliverables_reminder_recipients_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_deliverables_reminder_recipients_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "marketing_deliverables_reminder_recipients_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "marketing_deliverables_reminder_recipients_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "marketing_deliverables_reminder_recipients_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_entries: {
        Row: {
          amount: number
          campaign_id: string
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          employee_id: string | null
          entry_date: string
          id: string
          import_source: string
          invoice_file_name: string | null
          invoice_reference: string | null
          notes: string | null
          payment_method: string | null
          platform_id: string
          submitted_by: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          campaign_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          employee_id?: string | null
          entry_date: string
          id?: string
          import_source?: string
          invoice_file_name?: string | null
          invoice_reference?: string | null
          notes?: string | null
          payment_method?: string | null
          platform_id: string
          submitted_by: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          campaign_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          employee_id?: string | null
          entry_date?: string
          id?: string
          import_source?: string
          invoice_file_name?: string | null
          invoice_reference?: string | null
          notes?: string | null
          payment_method?: string | null
          platform_id?: string
          submitted_by?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_entries_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "marketing_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "marketing_entries_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "marketing_platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_entry_receipts: {
        Row: {
          created_at: string
          created_by: string
          deleted_at: string | null
          file_name: string
          file_path: string
          file_size_bytes: number
          id: string
          marketing_entry_id: string
          mime_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          deleted_at?: string | null
          file_name: string
          file_path: string
          file_size_bytes: number
          id?: string
          marketing_entry_id: string
          mime_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          file_name?: string
          file_path?: string
          file_size_bytes?: number
          id?: string
          marketing_entry_id?: string
          mime_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_entry_receipts_marketing_entry_id_fkey"
            columns: ["marketing_entry_id"]
            isOneToOne: false
            referencedRelation: "marketing_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_platforms: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      milestone_reward_runs: {
        Row: {
          completed_at: string
          eligible_task_count: number
          milestone_id: string
          project_id: string
          total_points: number
          triggered_by: string | null
        }
        Insert: {
          completed_at?: string
          eligible_task_count: number
          milestone_id: string
          project_id: string
          total_points: number
          triggered_by?: string | null
        }
        Update: {
          completed_at?: string
          eligible_task_count?: number
          milestone_id?: string
          project_id?: string
          total_points?: number
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "milestone_reward_runs_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: true
            referencedRelation: "project_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestone_reward_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestone_reward_runs_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "milestone_reward_runs_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "milestone_reward_runs_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_call_feedback: {
        Row: {
          call_length: string
          clarity_financial_growth_discussion: string
          clarity_five_percent_reflection_worksheet: string
          clarity_icebreaker_conversation_starters: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          department_role: string
          employee_id: string | null
          engagement_level: number
          engagement_reason: string
          full_name: string
          future_improvements: string
          id: string
          key_takeaway: string
          month_key: string
          next_topics: string
          overall_rating: number
          submitted_at: string
          updated_at: string
          user_id: string
          valuable_parts: string[]
          valuable_parts_reason: string
        }
        Insert: {
          call_length: string
          clarity_financial_growth_discussion: string
          clarity_five_percent_reflection_worksheet: string
          clarity_icebreaker_conversation_starters: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          department_role: string
          employee_id?: string | null
          engagement_level: number
          engagement_reason: string
          full_name: string
          future_improvements: string
          id?: string
          key_takeaway: string
          month_key: string
          next_topics: string
          overall_rating: number
          submitted_at?: string
          updated_at?: string
          user_id: string
          valuable_parts: string[]
          valuable_parts_reason: string
        }
        Update: {
          call_length?: string
          clarity_financial_growth_discussion?: string
          clarity_five_percent_reflection_worksheet?: string
          clarity_icebreaker_conversation_starters?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          department_role?: string
          employee_id?: string | null
          engagement_level?: number
          engagement_reason?: string
          full_name?: string
          future_improvements?: string
          id?: string
          key_takeaway?: string
          month_key?: string
          next_topics?: string
          overall_rating?: number
          submitted_at?: string
          updated_at?: string
          user_id?: string
          valuable_parts?: string[]
          valuable_parts_reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_call_feedback_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "monthly_call_feedback_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_call_feedback_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "monthly_call_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "monthly_call_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "monthly_call_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_self_evaluations: {
        Row: {
          additional_comments: string | null
          biggest_impact: string
          challenge_resolved: string
          comfortable_raising_concerns: string
          contributions_visible: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          department_role: string
          employee_id: string | null
          full_name: string
          hidden_productivity_issue: string
          id: string
          immediate_improvement: string
          impact_reason: string
          leadership_can_improve: string
          leadership_did_well: string
          month_key: string
          monthly_improvement: string
          next_month_goal: string
          next_skill_to_learn: string
          ownership_outside_role: string
          productivity_reason: string
          productivity_score: number
          professional_improvement_area: string
          requested_support: string
          significant_achievement: string
          submitted_at: string
          top_three_things_worked_on: string
          unseen_workflow_issue: string
          updated_at: string
          user_id: string
          work_slowdown: string
        }
        Insert: {
          additional_comments?: string | null
          biggest_impact: string
          challenge_resolved: string
          comfortable_raising_concerns: string
          contributions_visible: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          department_role: string
          employee_id?: string | null
          full_name: string
          hidden_productivity_issue: string
          id?: string
          immediate_improvement: string
          impact_reason: string
          leadership_can_improve: string
          leadership_did_well: string
          month_key: string
          monthly_improvement: string
          next_month_goal: string
          next_skill_to_learn: string
          ownership_outside_role: string
          productivity_reason: string
          productivity_score: number
          professional_improvement_area: string
          requested_support: string
          significant_achievement: string
          submitted_at?: string
          top_three_things_worked_on: string
          unseen_workflow_issue: string
          updated_at?: string
          user_id: string
          work_slowdown: string
        }
        Update: {
          additional_comments?: string | null
          biggest_impact?: string
          challenge_resolved?: string
          comfortable_raising_concerns?: string
          contributions_visible?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          department_role?: string
          employee_id?: string | null
          full_name?: string
          hidden_productivity_issue?: string
          id?: string
          immediate_improvement?: string
          impact_reason?: string
          leadership_can_improve?: string
          leadership_did_well?: string
          month_key?: string
          monthly_improvement?: string
          next_month_goal?: string
          next_skill_to_learn?: string
          ownership_outside_role?: string
          productivity_reason?: string
          productivity_score?: number
          professional_improvement_area?: string
          requested_support?: string
          significant_achievement?: string
          submitted_at?: string
          top_three_things_worked_on?: string
          unseen_workflow_issue?: string
          updated_at?: string
          user_id?: string
          work_slowdown?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_self_evaluations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "monthly_self_evaluations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_self_evaluations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "monthly_self_evaluations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "monthly_self_evaluations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "monthly_self_evaluations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string | null
          metadata: Json | null
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          metadata?: Json | null
          read_at?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          metadata?: Json | null
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      offboarding: {
        Row: {
          created_at: string
          deleted_at: string | null
          employee_id: string
          exit_interview_date: string | null
          exit_interview_notes: string | null
          exit_type: Database["public"]["Enums"]["exit_type"]
          id: string
          initiated_by: string
          last_working_day: string
          status: Database["public"]["Enums"]["offboarding_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          employee_id: string
          exit_interview_date?: string | null
          exit_interview_notes?: string | null
          exit_type: Database["public"]["Enums"]["exit_type"]
          id?: string
          initiated_by: string
          last_working_day: string
          status?: Database["public"]["Enums"]["offboarding_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          employee_id?: string
          exit_interview_date?: string | null
          exit_interview_notes?: string | null
          exit_type?: Database["public"]["Enums"]["exit_type"]
          id?: string
          initiated_by?: string
          last_working_day?: string
          status?: Database["public"]["Enums"]["offboarding_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offboarding_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "offboarding_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offboarding_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "offboarding_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "offboarding_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "offboarding_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      offboarding_tasks: {
        Row: {
          assigned_to: string | null
          category: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          due_date: string | null
          id: string
          is_completed: boolean | null
          offboarding_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          offboarding_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          offboarding_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offboarding_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "offboarding_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "offboarding_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offboarding_tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "offboarding_tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "offboarding_tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offboarding_tasks_offboarding_id_fkey"
            columns: ["offboarding_id"]
            isOneToOne: false
            referencedRelation: "offboarding"
            referencedColumns: ["id"]
          },
        ]
      }
      okr_target_evidence: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          evidence_type: string
          file_name: string | null
          file_size: number | null
          id: string
          label: string | null
          mime_type: string | null
          okr_target_id: string
          submitted_by: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          deleted_at?: string | null
          evidence_type: string
          file_name?: string | null
          file_size?: number | null
          id?: string
          label?: string | null
          mime_type?: string | null
          okr_target_id: string
          submitted_by: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          evidence_type?: string
          file_name?: string | null
          file_size?: number | null
          id?: string
          label?: string | null
          mime_type?: string | null
          okr_target_id?: string
          submitted_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "okr_target_evidence_okr_target_id_fkey"
            columns: ["okr_target_id"]
            isOneToOne: false
            referencedRelation: "okr_targets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_target_evidence_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "okr_target_evidence_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "okr_target_evidence_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      okr_targets: {
        Row: {
          admin_comments: string | null
          admin_rating: string | null
          created_at: string
          current_value: number | null
          cycle_id: string | null
          deleted_at: string | null
          description: string | null
          employee_id: string
          evaluated_at: string | null
          evaluated_by: string | null
          id: string
          metric_type: Database["public"]["Enums"]["target_metric_type"]
          name: string
          okr_id: string
          rubric_1: string | null
          rubric_2: string | null
          rubric_3: string | null
          rubric_4: string | null
          self_rating: number | null
          sort_order: number | null
          start_value: number | null
          target_value: number
          unit: string | null
          updated_at: string
          weight: number | null
        }
        Insert: {
          admin_comments?: string | null
          admin_rating?: string | null
          created_at?: string
          current_value?: number | null
          cycle_id?: string | null
          deleted_at?: string | null
          description?: string | null
          employee_id: string
          evaluated_at?: string | null
          evaluated_by?: string | null
          id?: string
          metric_type?: Database["public"]["Enums"]["target_metric_type"]
          name: string
          okr_id: string
          rubric_1?: string | null
          rubric_2?: string | null
          rubric_3?: string | null
          rubric_4?: string | null
          self_rating?: number | null
          sort_order?: number | null
          start_value?: number | null
          target_value: number
          unit?: string | null
          updated_at?: string
          weight?: number | null
        }
        Update: {
          admin_comments?: string | null
          admin_rating?: string | null
          created_at?: string
          current_value?: number | null
          cycle_id?: string | null
          deleted_at?: string | null
          description?: string | null
          employee_id?: string
          evaluated_at?: string | null
          evaluated_by?: string | null
          id?: string
          metric_type?: Database["public"]["Enums"]["target_metric_type"]
          name?: string
          okr_id?: string
          rubric_1?: string | null
          rubric_2?: string | null
          rubric_3?: string | null
          rubric_4?: string | null
          self_rating?: number | null
          sort_order?: number | null
          start_value?: number | null
          target_value?: number
          unit?: string | null
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "okr_targets_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "review_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_targets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "okr_targets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_targets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "okr_targets_okr_id_fkey"
            columns: ["okr_id"]
            isOneToOne: false
            referencedRelation: "okrs"
            referencedColumns: ["id"]
          },
        ]
      }
      okrs: {
        Row: {
          admin_comments: string | null
          admin_rating: string | null
          created_at: string
          cycle_id: string | null
          description: string | null
          employee_id: string
          evaluated_at: string | null
          evaluated_by: string | null
          id: string
          key_results: Json
          objective: string
          progress: number | null
          status: string | null
          submitted_at: string | null
          updated_at: string
          weight: number | null
        }
        Insert: {
          admin_comments?: string | null
          admin_rating?: string | null
          created_at?: string
          cycle_id?: string | null
          description?: string | null
          employee_id: string
          evaluated_at?: string | null
          evaluated_by?: string | null
          id?: string
          key_results?: Json
          objective: string
          progress?: number | null
          status?: string | null
          submitted_at?: string | null
          updated_at?: string
          weight?: number | null
        }
        Update: {
          admin_comments?: string | null
          admin_rating?: string | null
          created_at?: string
          cycle_id?: string | null
          description?: string | null
          employee_id?: string
          evaluated_at?: string | null
          evaluated_by?: string | null
          id?: string
          key_results?: Json
          objective?: string
          progress?: number | null
          status?: string | null
          submitted_at?: string | null
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "okrs_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "review_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okrs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "okrs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okrs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      onboarding_checklists: {
        Row: {
          completed_at: string | null
          created_at: string
          employee_id: string
          id: string
          started_at: string | null
          status: Database["public"]["Enums"]["onboarding_status"]
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          employee_id: string
          id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["onboarding_status"]
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["onboarding_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_checklists_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "onboarding_checklists_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_checklists_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      onboarding_documents: {
        Row: {
          created_at: string
          deleted_at: string | null
          document_type: Database["public"]["Enums"]["onboarding_document_type"]
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          onboarding_profile_id: string
          updated_at: string
          uploaded_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          document_type: Database["public"]["Enums"]["onboarding_document_type"]
          file_name: string
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          onboarding_profile_id: string
          updated_at?: string
          uploaded_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          document_type?: Database["public"]["Enums"]["onboarding_document_type"]
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          onboarding_profile_id?: string
          updated_at?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_documents_onboarding_profile_id_fkey"
            columns: ["onboarding_profile_id"]
            isOneToOne: false
            referencedRelation: "onboarding_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_profiles: {
        Row: {
          address: string | null
          age: number | null
          birthday: string | null
          company_email: string | null
          completed_at: string | null
          contact_country_code: string | null
          contact_number: string | null
          created_at: string
          current_step: Database["public"]["Enums"]["onboarding_step"] | null
          deleted_at: string | null
          department_id: string | null
          division_id: string | null
          education: string | null
          email_address: string | null
          emergency_contact_country_code: string | null
          emergency_contact_email: string | null
          emergency_contact_name: string | null
          emergency_contact_number: string | null
          emergency_contact_relationship: string | null
          first_name: string | null
          id: string
          invite_probation_auto_90: boolean
          invite_probation_end_date: string | null
          invite_probation_mode: string
          is_completed: boolean
          last_name: string | null
          linkedin_profile_url: string | null
          major: string | null
          middle_name: string | null
          nationality: string | null
          payment_account_name: string | null
          payment_account_number: string | null
          payment_address: string | null
          payment_bank_id: string | null
          payment_bank_name: string | null
          payment_city: string | null
          payment_country_code: string | null
          payment_email: string | null
          payment_phone_country_code: string | null
          payment_phone_number: string | null
          payment_province: string | null
          payment_zipcode: string | null
          personal_email: string | null
          position: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_count: number
          rejection_notes: string | null
          review_state: string | null
          start_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          age?: number | null
          birthday?: string | null
          company_email?: string | null
          completed_at?: string | null
          contact_country_code?: string | null
          contact_number?: string | null
          created_at?: string
          current_step?: Database["public"]["Enums"]["onboarding_step"] | null
          deleted_at?: string | null
          department_id?: string | null
          division_id?: string | null
          education?: string | null
          email_address?: string | null
          emergency_contact_country_code?: string | null
          emergency_contact_email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_number?: string | null
          emergency_contact_relationship?: string | null
          first_name?: string | null
          id?: string
          invite_probation_auto_90?: boolean
          invite_probation_end_date?: string | null
          invite_probation_mode?: string
          is_completed?: boolean
          last_name?: string | null
          linkedin_profile_url?: string | null
          major?: string | null
          middle_name?: string | null
          nationality?: string | null
          payment_account_name?: string | null
          payment_account_number?: string | null
          payment_address?: string | null
          payment_bank_id?: string | null
          payment_bank_name?: string | null
          payment_city?: string | null
          payment_country_code?: string | null
          payment_email?: string | null
          payment_phone_country_code?: string | null
          payment_phone_number?: string | null
          payment_province?: string | null
          payment_zipcode?: string | null
          personal_email?: string | null
          position?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_count?: number
          rejection_notes?: string | null
          review_state?: string | null
          start_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          age?: number | null
          birthday?: string | null
          company_email?: string | null
          completed_at?: string | null
          contact_country_code?: string | null
          contact_number?: string | null
          created_at?: string
          current_step?: Database["public"]["Enums"]["onboarding_step"] | null
          deleted_at?: string | null
          department_id?: string | null
          division_id?: string | null
          education?: string | null
          email_address?: string | null
          emergency_contact_country_code?: string | null
          emergency_contact_email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_number?: string | null
          emergency_contact_relationship?: string | null
          first_name?: string | null
          id?: string
          invite_probation_auto_90?: boolean
          invite_probation_end_date?: string | null
          invite_probation_mode?: string
          is_completed?: boolean
          last_name?: string | null
          linkedin_profile_url?: string | null
          major?: string | null
          middle_name?: string | null
          nationality?: string | null
          payment_account_name?: string | null
          payment_account_number?: string | null
          payment_address?: string | null
          payment_bank_id?: string | null
          payment_bank_name?: string | null
          payment_city?: string | null
          payment_country_code?: string | null
          payment_email?: string | null
          payment_phone_country_code?: string | null
          payment_phone_number?: string | null
          payment_province?: string | null
          payment_zipcode?: string | null
          personal_email?: string | null
          position?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_count?: number
          rejection_notes?: string | null
          review_state?: string | null
          start_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_profiles_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_profiles_payment_bank_id_fkey"
            columns: ["payment_bank_id"]
            isOneToOne: false
            referencedRelation: "bank_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "onboarding_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "onboarding_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_tasks: {
        Row: {
          assigned_to: string | null
          category: string
          checklist_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          due_days_from_start: number | null
          id: string
          is_completed: boolean | null
          is_required: boolean | null
          reference_url: string | null
          requires_submission: boolean
          submission_description: string | null
          submission_label: string | null
          submission_type: string
          title: string
        }
        Insert: {
          assigned_to?: string | null
          category: string
          checklist_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_days_from_start?: number | null
          id?: string
          is_completed?: boolean | null
          is_required?: boolean | null
          reference_url?: string | null
          requires_submission?: boolean
          submission_description?: string | null
          submission_label?: string | null
          submission_type?: string
          title: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          checklist_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_days_from_start?: number | null
          id?: string
          is_completed?: boolean | null
          is_required?: boolean | null
          reference_url?: string | null
          requires_submission?: boolean
          submission_description?: string | null
          submission_label?: string | null
          submission_type?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "onboarding_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "onboarding_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_tasks_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "onboarding_checklists"
            referencedColumns: ["id"]
          },
        ]
      }
      pa_task_access_grants: {
        Row: {
          access_level: string
          created_at: string
          deleted_at: string | null
          granted_by: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_level?: string
          created_at?: string
          deleted_at?: string | null
          granted_by?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_level?: string
          created_at?: string
          deleted_at?: string | null
          granted_by?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pa_task_access_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pa_task_access_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pa_task_access_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pa_task_attachments: {
        Row: {
          attachment_type: string
          created_at: string
          created_by: string
          deleted_at: string | null
          file_size_bytes: number | null
          id: string
          mime_type: string | null
          pa_task_id: string
          storage_path: string | null
          title: string
          url: string | null
        }
        Insert: {
          attachment_type: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          pa_task_id: string
          storage_path?: string | null
          title: string
          url?: string | null
        }
        Update: {
          attachment_type?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          pa_task_id?: string
          storage_path?: string | null
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pa_task_attachments_pa_task_id_fkey"
            columns: ["pa_task_id"]
            isOneToOne: false
            referencedRelation: "pa_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      pa_task_categories: {
        Row: {
          color: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_default: boolean
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_default?: boolean
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_default?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      pa_task_priorities: {
        Row: {
          color: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_default: boolean
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_default?: boolean
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_default?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      pa_task_statuses: {
        Row: {
          color: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_default: boolean
          is_terminal: boolean
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_default?: boolean
          is_terminal?: boolean
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_default?: boolean
          is_terminal?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      pa_tasks: {
        Row: {
          assigned_to: string | null
          blocker_reason: string | null
          category_id: string | null
          created_at: string
          created_by: string
          date_given: string
          deleted_at: string | null
          description: string | null
          due_date: string | null
          id: string
          notes: string | null
          priority_id: string
          status_id: string
          title: string
          updated_at: string
          waiting_on: string | null
        }
        Insert: {
          assigned_to?: string | null
          blocker_reason?: string | null
          category_id?: string | null
          created_at?: string
          created_by: string
          date_given?: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          priority_id: string
          status_id: string
          title: string
          updated_at?: string
          waiting_on?: string | null
        }
        Update: {
          assigned_to?: string | null
          blocker_reason?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string
          date_given?: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          priority_id?: string
          status_id?: string
          title?: string
          updated_at?: string
          waiting_on?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pa_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pa_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pa_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pa_tasks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "pa_task_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pa_tasks_priority_id_fkey"
            columns: ["priority_id"]
            isOneToOne: false
            referencedRelation: "pa_task_priorities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pa_tasks_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "pa_task_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_evaluation_drafts: {
        Row: {
          created_at: string
          created_by: string | null
          cycle_key: string
          employee_id: string | null
          evaluation_kind: string
          id: string
          payload: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          cycle_key: string
          employee_id?: string | null
          evaluation_kind: string
          id?: string
          payload?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          cycle_key?: string
          employee_id?: string | null
          evaluation_kind?: string
          id?: string
          payload?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_evaluation_drafts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "performance_evaluation_drafts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_evaluation_drafts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "performance_evaluation_drafts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "performance_evaluation_drafts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "performance_evaluation_drafts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_evaluation_summaries: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          email_recipient_count: number | null
          email_trigger: string | null
          emailed_at: string | null
          emailed_by: string | null
          evaluation_kind: string
          generated_at: string
          generated_by: string | null
          id: string
          period_key: string
          sentiment_distribution: Json | null
          source_snapshot_hash: string
          summary_markdown: string
          total_submissions_analyzed: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email_recipient_count?: number | null
          email_trigger?: string | null
          emailed_at?: string | null
          emailed_by?: string | null
          evaluation_kind: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          period_key: string
          sentiment_distribution?: Json | null
          source_snapshot_hash: string
          summary_markdown: string
          total_submissions_analyzed: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email_recipient_count?: number | null
          email_trigger?: string | null
          emailed_at?: string | null
          emailed_by?: string | null
          evaluation_kind?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          period_key?: string
          sentiment_distribution?: Json | null
          source_snapshot_hash?: string
          summary_markdown?: string
          total_submissions_analyzed?: number
          updated_at?: string
        }
        Relationships: []
      }
      performance_insight_conversations: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          evaluation_kind: string
          id: string
          last_message_at: string
          months_back: number
          period_key: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          evaluation_kind: string
          id?: string
          last_message_at?: string
          months_back?: number
          period_key: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          evaluation_kind?: string
          id?: string
          last_message_at?: string
          months_back?: number
          period_key?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_insight_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "performance_insight_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "performance_insight_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_insight_messages: {
        Row: {
          content: string
          context_meta: Json | null
          context_snapshot_hash: string | null
          conversation_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          input_tokens: number | null
          model: string | null
          output_tokens: number | null
          role: string
          status: string
          user_id: string
        }
        Insert: {
          content: string
          context_meta?: Json | null
          context_snapshot_hash?: string | null
          conversation_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          input_tokens?: number | null
          model?: string | null
          output_tokens?: number | null
          role: string
          status?: string
          user_id: string
        }
        Update: {
          content?: string
          context_meta?: Json | null
          context_snapshot_hash?: string | null
          conversation_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          input_tokens?: number | null
          model?: string | null
          output_tokens?: number | null
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_insight_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "performance_insight_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_insight_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "performance_insight_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "performance_insight_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_reviews: {
        Row: {
          completed_at: string | null
          created_at: string
          cycle_id: string
          employee_id: string
          final_rating: number | null
          goals_for_next_period: string | null
          id: string
          manager_comments: string | null
          manager_rating: number | null
          reviewer_id: string | null
          self_comments: string | null
          self_rating: number | null
          status: Database["public"]["Enums"]["review_status"]
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          cycle_id: string
          employee_id: string
          final_rating?: number | null
          goals_for_next_period?: string | null
          id?: string
          manager_comments?: string | null
          manager_rating?: number | null
          reviewer_id?: string | null
          self_comments?: string | null
          self_rating?: number | null
          status?: Database["public"]["Enums"]["review_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          cycle_id?: string
          employee_id?: string
          final_rating?: number | null
          goals_for_next_period?: string | null
          id?: string
          manager_comments?: string | null
          manager_rating?: number | null
          reviewer_id?: string | null
          self_comments?: string | null
          self_rating?: number | null
          status?: Database["public"]["Enums"]["review_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_reviews_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "review_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "performance_reviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "performance_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "performance_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "performance_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      points_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json
          milestone_department: string | null
          points: number
          source_milestone_id: string | null
          source_project_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          milestone_department?: string | null
          points: number
          source_milestone_id?: string | null
          source_project_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          milestone_department?: string | null
          points?: number
          source_milestone_id?: string | null
          source_project_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_events_source_milestone_id_fkey"
            columns: ["source_milestone_id"]
            isOneToOne: false
            referencedRelation: "project_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_events_source_project_id_fkey"
            columns: ["source_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "points_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "points_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_change_requests: {
        Row: {
          changes: Json
          created_at: string
          deleted_at: string | null
          employee_id: string
          id: string
          requested_at: string
          requested_by: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["profile_change_status"]
          updated_at: string
        }
        Insert: {
          changes: Json
          created_at?: string
          deleted_at?: string | null
          employee_id: string
          id?: string
          requested_at?: string
          requested_by: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["profile_change_status"]
          updated_at?: string
        }
        Update: {
          changes?: Json
          created_at?: string
          deleted_at?: string | null
          employee_id?: string
          id?: string
          requested_at?: string
          requested_by?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["profile_change_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_change_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "profile_change_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_change_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      project_backlog: {
        Row: {
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          created_by: string | null
          extraction_model: string | null
          id: string
          objective: string
          priority: string
          problem_statement: string
          project_id: string | null
          raw_transcript: string | null
          source_chat_id: string | null
          source_message_id: string | null
          status: string
          target_departments: Json
          technical_scope: Json
          title: string
          updated_at: string
        }
        Insert: {
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          created_by?: string | null
          extraction_model?: string | null
          id?: string
          objective: string
          priority?: string
          problem_statement: string
          project_id?: string | null
          raw_transcript?: string | null
          source_chat_id?: string | null
          source_message_id?: string | null
          status?: string
          target_departments?: Json
          technical_scope?: Json
          title: string
          updated_at?: string
        }
        Update: {
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          created_by?: string | null
          extraction_model?: string | null
          id?: string
          objective?: string
          priority?: string
          problem_statement?: string
          project_id?: string | null
          raw_transcript?: string | null
          source_chat_id?: string | null
          source_message_id?: string | null
          status?: string
          target_departments?: Json
          technical_scope?: Json
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_backlog_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_checklist_items: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          description: string | null
          id: string
          milestone_id: string
          position: number
          status: Database["public"]["Enums"]["checklist_item_status"]
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          milestone_id: string
          position?: number
          status?: Database["public"]["Enums"]["checklist_item_status"]
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          milestone_id?: string
          position?: number
          status?: Database["public"]["Enums"]["checklist_item_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_checklist_items_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "project_checklist_items_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "project_checklist_items_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_checklist_items_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "project_milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      project_contributors: {
        Row: {
          joined_at: string
          project_id: string
          role: Database["public"]["Enums"]["project_contributor_role"]
          user_id: string
        }
        Insert: {
          joined_at?: string
          project_id: string
          role?: Database["public"]["Enums"]["project_contributor_role"]
          user_id: string
        }
        Update: {
          joined_at?: string
          project_id?: string
          role?: Database["public"]["Enums"]["project_contributor_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_contributors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_contributors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "project_contributors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "project_contributors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      project_departments: {
        Row: {
          department_id: string
          id: string
          invited_at: string
          invited_by: string
          project_id: string
          responded_at: string | null
          responded_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          department_id: string
          id?: string
          invited_at?: string
          invited_by: string
          project_id: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          department_id?: string
          id?: string
          invited_at?: string
          invited_by?: string
          project_id?: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_departments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_departments_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "project_departments_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "project_departments_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_departments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_departments_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "project_departments_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "project_departments_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      project_documentations: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          documentation_type: string
          file_name: string | null
          file_size: number | null
          id: string
          label: string | null
          mime_type: string | null
          project_id: string
          submitted_by: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          deleted_at?: string | null
          documentation_type: string
          file_name?: string | null
          file_size?: number | null
          id?: string
          label?: string | null
          mime_type?: string | null
          project_id: string
          submitted_by: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          documentation_type?: string
          file_name?: string | null
          file_size?: number | null
          id?: string
          label?: string | null
          mime_type?: string | null
          project_id?: string
          submitted_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_documentations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_milestones: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          completed_at: string | null
          completed_by: string | null
          complexity_tier:
            | Database["public"]["Enums"]["milestone_complexity_tier"]
            | null
          created_at: string
          deleted_at: string | null
          department: string | null
          description: string | null
          due_date: string
          id: string
          parent_milestone_id: string | null
          period_end: string
          period_start: string
          period_type: Database["public"]["Enums"]["milestone_period_type"]
          position: number
          progress_pct: number
          project_id: string
          status: Database["public"]["Enums"]["milestone_status"]
          submitted_at: string | null
          submitted_by: string | null
          title: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          completed_by?: string | null
          complexity_tier?:
            | Database["public"]["Enums"]["milestone_complexity_tier"]
            | null
          created_at?: string
          deleted_at?: string | null
          department?: string | null
          description?: string | null
          due_date: string
          id?: string
          parent_milestone_id?: string | null
          period_end: string
          period_start: string
          period_type: Database["public"]["Enums"]["milestone_period_type"]
          position?: number
          progress_pct?: number
          project_id: string
          status?: Database["public"]["Enums"]["milestone_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          completed_by?: string | null
          complexity_tier?:
            | Database["public"]["Enums"]["milestone_complexity_tier"]
            | null
          created_at?: string
          deleted_at?: string | null
          department?: string | null
          description?: string | null
          due_date?: string
          id?: string
          parent_milestone_id?: string | null
          period_end?: string
          period_start?: string
          period_type?: Database["public"]["Enums"]["milestone_period_type"]
          position?: number
          progress_pct?: number
          project_id?: string
          status?: Database["public"]["Enums"]["milestone_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "project_milestones_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "project_milestones_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_milestones_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "project_milestones_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "project_milestones_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_milestones_parent_milestone_id_fkey"
            columns: ["parent_milestone_id"]
            isOneToOne: false
            referencedRelation: "project_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_milestones_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "project_milestones_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "project_milestones_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          health: Database["public"]["Enums"]["project_health"]
          id: string
          lead_user_id: string
          name: string
          points_total: number
          progress_pct: number
          start_date: string
          status: Database["public"]["Enums"]["project_status"]
          supervisor_id: string | null
          target_end_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          health?: Database["public"]["Enums"]["project_health"]
          id?: string
          lead_user_id: string
          name: string
          points_total?: number
          progress_pct?: number
          start_date: string
          status?: Database["public"]["Enums"]["project_status"]
          supervisor_id?: string | null
          target_end_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          health?: Database["public"]["Enums"]["project_health"]
          id?: string
          lead_user_id?: string
          name?: string
          points_total?: number
          progress_pct?: number
          start_date?: string
          status?: Database["public"]["Enums"]["project_status"]
          supervisor_id?: string | null
          target_end_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_lead_user_id_fkey"
            columns: ["lead_user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "projects_lead_user_id_fkey"
            columns: ["lead_user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "projects_lead_user_id_fkey"
            columns: ["lead_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "projects_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "projects_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      public_inquiries: {
        Row: {
          business_unit_id: string | null
          confirmation_email_error: string | null
          confirmation_email_resend_id: string | null
          confirmation_email_status: string
          created_at: string
          deleted_at: string | null
          email: string
          id: string
          internal_email_error: string | null
          internal_email_resend_id: string | null
          internal_email_status: string
          message: string
          name: string
          phone: string | null
          responded_at: string | null
          responded_by: string | null
          source: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          business_unit_id?: string | null
          confirmation_email_error?: string | null
          confirmation_email_resend_id?: string | null
          confirmation_email_status?: string
          created_at?: string
          deleted_at?: string | null
          email: string
          id?: string
          internal_email_error?: string | null
          internal_email_resend_id?: string | null
          internal_email_status?: string
          message: string
          name: string
          phone?: string | null
          responded_at?: string | null
          responded_by?: string | null
          source?: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          business_unit_id?: string | null
          confirmation_email_error?: string | null
          confirmation_email_resend_id?: string | null
          confirmation_email_status?: string
          created_at?: string
          deleted_at?: string | null
          email?: string
          id?: string
          internal_email_error?: string | null
          internal_email_resend_id?: string | null
          internal_email_status?: string
          message?: string
          name?: string
          phone?: string | null
          responded_at?: string | null
          responded_by?: string | null
          source?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_inquiries_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
        ]
      }
      quarterly_temperature_checks: {
        Row: {
          achievement_recognition: string
          clarity_support: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          department_role: string
          employee_id: string | null
          energy_workload_reason: string
          energy_workload_score: number
          feedback_suggestions: string
          full_name: string
          id: string
          improvement_change: string
          overall_experience_reason: string
          overall_experience_score: number
          quarter_key: string
          submitted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          achievement_recognition: string
          clarity_support: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          department_role: string
          employee_id?: string | null
          energy_workload_reason: string
          energy_workload_score: number
          feedback_suggestions: string
          full_name: string
          id?: string
          improvement_change: string
          overall_experience_reason: string
          overall_experience_score: number
          quarter_key: string
          submitted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          achievement_recognition?: string
          clarity_support?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          department_role?: string
          employee_id?: string | null
          energy_workload_reason?: string
          energy_workload_score?: number
          feedback_suggestions?: string
          full_name?: string
          id?: string
          improvement_change?: string
          overall_experience_reason?: string
          overall_experience_score?: number
          quarter_key?: string
          submitted_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quarterly_temperature_checks_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "quarterly_temperature_checks_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarterly_temperature_checks_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "quarterly_temperature_checks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "quarterly_temperature_checks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "quarterly_temperature_checks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      query_cache: {
        Row: {
          created_at: string
          expires_at: string
          hit_count: number
          id: string
          query_embedding: string
          query_text: string
          response_text: string
          source_citations: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          hit_count?: number
          id?: string
          query_embedding: string
          query_text: string
          response_text: string
          source_citations?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          hit_count?: number
          id?: string
          query_embedding?: string
          query_text?: string
          response_text?: string
          source_citations?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      recognition_nominations: {
        Row: {
          category: string
          created_at: string
          evidence_url: string | null
          id: string
          nominator_user_id: string
          nominee_user_id: string
          result_summary: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          work_period_end: string
          work_period_start: string
        }
        Insert: {
          category: string
          created_at?: string
          evidence_url?: string | null
          id?: string
          nominator_user_id: string
          nominee_user_id: string
          result_summary: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          work_period_end: string
          work_period_start: string
        }
        Update: {
          category?: string
          created_at?: string
          evidence_url?: string | null
          id?: string
          nominator_user_id?: string
          nominee_user_id?: string
          result_summary?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          work_period_end?: string
          work_period_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "recognition_nominations_nominator_user_id_fkey"
            columns: ["nominator_user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "recognition_nominations_nominator_user_id_fkey"
            columns: ["nominator_user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "recognition_nominations_nominator_user_id_fkey"
            columns: ["nominator_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recognition_nominations_nominee_user_id_fkey"
            columns: ["nominee_user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "recognition_nominations_nominee_user_id_fkey"
            columns: ["nominee_user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "recognition_nominations_nominee_user_id_fkey"
            columns: ["nominee_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recognition_nominations_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "recognition_nominations_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "recognition_nominations_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      recognition_periods: {
        Row: {
          created_at: string
          id: string
          last_error: string | null
          period_end: string
          period_start: string
          period_type: string
          public_intro: string | null
          published_at: string | null
          published_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          telegram_message_id: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_error?: string | null
          period_end: string
          period_start: string
          period_type: string
          public_intro?: string | null
          published_at?: string | null
          published_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          telegram_message_id?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_error?: string | null
          period_end?: string
          period_start?: string
          period_type?: string
          public_intro?: string | null
          published_at?: string | null
          published_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          telegram_message_id?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recognition_periods_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "recognition_periods_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "recognition_periods_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recognition_periods_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "recognition_periods_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "recognition_periods_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      recognition_selections: {
        Row: {
          category: string | null
          created_at: string
          display_order: number
          evidence_refs: Json
          id: string
          period_id: string
          public_reason: string
          recipient_user_id: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          display_order?: number
          evidence_refs?: Json
          id?: string
          period_id: string
          public_reason: string
          recipient_user_id: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          display_order?: number
          evidence_refs?: Json
          id?: string
          period_id?: string
          public_reason?: string
          recipient_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recognition_selections_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "recognition_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recognition_selections_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "recognition_selections_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "recognition_selections_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      report_metrics: {
        Row: {
          created_at: string
          id: string
          metric_name: string
          metric_unit: string | null
          metric_value: number
          notes: string | null
          report_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metric_name: string
          metric_unit?: string | null
          metric_value: number
          notes?: string | null
          report_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metric_name?: string
          metric_unit?: string | null
          metric_value?: number
          notes?: string | null
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_metrics_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_metrics_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "root_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          employee_id: string
          hierarchy_path: string[] | null
          id: string
          notes: string | null
          parent_report_id: string | null
          period_end: string
          period_start: string
          report_group: string | null
          report_type: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          employee_id: string
          hierarchy_path?: string[] | null
          id?: string
          notes?: string | null
          parent_report_id?: string | null
          period_end: string
          period_start: string
          report_group?: string | null
          report_type: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          employee_id?: string
          hierarchy_path?: string[] | null
          id?: string
          notes?: string | null
          parent_report_id?: string | null
          period_end?: string
          period_start?: string
          report_group?: string | null
          report_type?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "reports_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "reports_parent_report_id_fkey"
            columns: ["parent_report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_parent_report_id_fkey"
            columns: ["parent_report_id"]
            isOneToOne: false
            referencedRelation: "root_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_bookmarks: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          resource_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          resource_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          resource_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_bookmarks_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "resource_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "resource_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_categories: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "resource_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_collections: {
        Row: {
          author_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          target_departments: string[] | null
          thumbnail_path: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          target_departments?: string[] | null
          thumbnail_path?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          target_departments?: string[] | null
          thumbnail_path?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_collections_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "resource_collections_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "resource_collections_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_folders: {
        Row: {
          approval_status: string
          color: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          updated_at: string
        }
        Insert: {
          approval_status?: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          updated_at?: string
        }
        Update: {
          approval_status?: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      resource_views: {
        Row: {
          completed: boolean | null
          duration_seconds: number | null
          id: string
          resource_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          completed?: boolean | null
          duration_seconds?: number | null
          id?: string
          resource_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          completed?: boolean | null
          duration_seconds?: number | null
          id?: string
          resource_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_views_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "resource_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "resource_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          access_level:
            | Database["public"]["Enums"]["resource_access_level"]
            | null
          approval_status: string
          author_id: string
          bookmark_count: number | null
          category: Database["public"]["Enums"]["resource_category"]
          category_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          display_order: number | null
          download_count: number | null
          duration_seconds: number | null
          excerpt: string | null
          expires_at: string | null
          external_url: string | null
          file_path: string | null
          file_size: number | null
          folder_id: string | null
          id: string
          is_featured: boolean | null
          is_pinned: boolean | null
          is_public: boolean | null
          mime_type: string | null
          pending_changes: Json | null
          previous_version_id: string | null
          published_at: string | null
          resource_type: Database["public"]["Enums"]["resource_type"]
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          status: Database["public"]["Enums"]["resource_status"]
          subcategory: string | null
          tags: string[] | null
          target_departments: string[] | null
          target_employees: string[] | null
          target_roles: Database["public"]["Enums"]["user_role"][] | null
          thumbnail_path: string | null
          title: string
          updated_at: string
          version: number | null
          view_count: number | null
        }
        Insert: {
          access_level?:
            | Database["public"]["Enums"]["resource_access_level"]
            | null
          approval_status?: string
          author_id: string
          bookmark_count?: number | null
          category: Database["public"]["Enums"]["resource_category"]
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          display_order?: number | null
          download_count?: number | null
          duration_seconds?: number | null
          excerpt?: string | null
          expires_at?: string | null
          external_url?: string | null
          file_path?: string | null
          file_size?: number | null
          folder_id?: string | null
          id?: string
          is_featured?: boolean | null
          is_pinned?: boolean | null
          is_public?: boolean | null
          mime_type?: string | null
          pending_changes?: Json | null
          previous_version_id?: string | null
          published_at?: string | null
          resource_type: Database["public"]["Enums"]["resource_type"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: Database["public"]["Enums"]["resource_status"]
          subcategory?: string | null
          tags?: string[] | null
          target_departments?: string[] | null
          target_employees?: string[] | null
          target_roles?: Database["public"]["Enums"]["user_role"][] | null
          thumbnail_path?: string | null
          title: string
          updated_at?: string
          version?: number | null
          view_count?: number | null
        }
        Update: {
          access_level?:
            | Database["public"]["Enums"]["resource_access_level"]
            | null
          approval_status?: string
          author_id?: string
          bookmark_count?: number | null
          category?: Database["public"]["Enums"]["resource_category"]
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          display_order?: number | null
          download_count?: number | null
          duration_seconds?: number | null
          excerpt?: string | null
          expires_at?: string | null
          external_url?: string | null
          file_path?: string | null
          file_size?: number | null
          folder_id?: string | null
          id?: string
          is_featured?: boolean | null
          is_pinned?: boolean | null
          is_public?: boolean | null
          mime_type?: string | null
          pending_changes?: Json | null
          previous_version_id?: string | null
          published_at?: string | null
          resource_type?: Database["public"]["Enums"]["resource_type"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: Database["public"]["Enums"]["resource_status"]
          subcategory?: string | null
          tags?: string[] | null
          target_departments?: string[] | null
          target_employees?: string[] | null
          target_roles?: Database["public"]["Enums"]["user_role"][] | null
          thumbnail_path?: string | null
          title?: string
          updated_at?: string
          version?: number | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "resources_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "resources_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "resources_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "resource_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "resource_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_previous_version_id_fkey"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_forecast_access_grants: {
        Row: {
          access_level: string
          created_at: string
          deleted_at: string | null
          granted_by: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_level?: string
          created_at?: string
          deleted_at?: string | null
          granted_by?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_level?: string
          created_at?: string
          deleted_at?: string | null
          granted_by?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_forecast_access_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "revenue_forecast_access_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "revenue_forecast_access_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      review_cycles: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string
          id: string
          kpi_submission_deadline: string | null
          manager_review_deadline: string | null
          name: string
          okr_submission_deadline: string | null
          self_review_deadline: string | null
          start_date: string
          status: Database["public"]["Enums"]["review_cycle_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date: string
          id?: string
          kpi_submission_deadline?: string | null
          manager_review_deadline?: string | null
          name: string
          okr_submission_deadline?: string | null
          self_review_deadline?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["review_cycle_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string
          id?: string
          kpi_submission_deadline?: string | null
          manager_review_deadline?: string | null
          name?: string
          okr_submission_deadline?: string | null
          self_review_deadline?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["review_cycle_status"]
          updated_at?: string
        }
        Relationships: []
      }
      review_demo_items: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          kind: string
          progress: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          kind: string
          progress?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          kind?: string
          progress?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_demo_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "review_demo_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "review_demo_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      review_engagements: {
        Row: {
          created_at: string
          ended_at: string | null
          expires_at: string
          id: string
          purpose: string
          reviewer_user_id: string
          sponsor_user_id: string
          starts_at: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          expires_at: string
          id?: string
          purpose: string
          reviewer_user_id: string
          sponsor_user_id: string
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          expires_at?: string
          id?: string
          purpose?: string
          reviewer_user_id?: string
          sponsor_user_id?: string
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_engagements_reviewer_user_id_fkey"
            columns: ["reviewer_user_id"]
            isOneToOne: true
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "review_engagements_reviewer_user_id_fkey"
            columns: ["reviewer_user_id"]
            isOneToOne: true
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "review_engagements_reviewer_user_id_fkey"
            columns: ["reviewer_user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_engagements_sponsor_user_id_fkey"
            columns: ["sponsor_user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "review_engagements_sponsor_user_id_fkey"
            columns: ["sponsor_user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "review_engagements_sponsor_user_id_fkey"
            columns: ["sponsor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      review_feedback: {
        Row: {
          category: string
          created_at: string
          engagement_id: string
          id: string
          reviewer_user_id: string
          route: string
          screenshot_url: string | null
          severity: string
          suggestion: string
        }
        Insert: {
          category: string
          created_at?: string
          engagement_id: string
          id?: string
          reviewer_user_id: string
          route: string
          screenshot_url?: string | null
          severity: string
          suggestion: string
        }
        Update: {
          category?: string
          created_at?: string
          engagement_id?: string
          id?: string
          reviewer_user_id?: string
          route?: string
          screenshot_url?: string | null
          severity?: string
          suggestion?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_feedback_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "review_engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_feedback_reviewer_user_id_fkey"
            columns: ["reviewer_user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "review_feedback_reviewer_user_id_fkey"
            columns: ["reviewer_user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "review_feedback_reviewer_user_id_fkey"
            columns: ["reviewer_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      role_kpi_entries: {
        Row: {
          created_at: string
          entry_date: string
          id: string
          kpi_name: string
          kpi_unit: string | null
          kpi_value: number
          metadata: Json | null
          notes: string | null
          role_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entry_date?: string
          id?: string
          kpi_name: string
          kpi_unit?: string | null
          kpi_value: number
          metadata?: Json | null
          notes?: string | null
          role_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entry_date?: string
          id?: string
          kpi_name?: string
          kpi_unit?: string | null
          kpi_value?: number
          metadata?: Json | null
          notes?: string | null
          role_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_kpi_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "role_kpi_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "role_kpi_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sfo_revenue_entries: {
        Row: {
          actual_revenue_aud: number
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          month: number
          notes: string | null
          updated_at: string
          updated_by: string | null
          year: number
        }
        Insert: {
          actual_revenue_aud: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          month: number
          notes?: string | null
          updated_at?: string
          updated_by?: string | null
          year: number
        }
        Update: {
          actual_revenue_aud?: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          month?: number
          notes?: string | null
          updated_at?: string
          updated_by?: string | null
          year?: number
        }
        Relationships: []
      }
      sfo_revenue_goals: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          goal_amount_aud: number
          id: string
          label: string | null
          sort_order: number
          updated_at: string
          updated_by: string | null
          year: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          goal_amount_aud: number
          id?: string
          label?: string | null
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
          year: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          goal_amount_aud?: number
          id?: string
          label?: string | null
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
          year?: number
        }
        Relationships: []
      }
      standup_recordings: {
        Row: {
          attendees: string[] | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          duration_seconds: number | null
          file_path: string
          file_size: number | null
          id: string
          recording_date: string
          summary: string | null
          title: string
          transcript: string | null
          updated_at: string
        }
        Insert: {
          attendees?: string[] | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          duration_seconds?: number | null
          file_path: string
          file_size?: number | null
          id?: string
          recording_date: string
          summary?: string | null
          title: string
          transcript?: string | null
          updated_at?: string
        }
        Update: {
          attendees?: string[] | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          duration_seconds?: number | null
          file_path?: string
          file_size?: number | null
          id?: string
          recording_date?: string
          summary?: string | null
          title?: string
          transcript?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      standup_topics: {
        Row: {
          created_at: string
          id: string
          recording_id: string
          timestamp_end: number | null
          timestamp_start: number | null
          topic: string
        }
        Insert: {
          created_at?: string
          id?: string
          recording_id: string
          timestamp_end?: number | null
          timestamp_start?: number | null
          topic: string
        }
        Update: {
          created_at?: string
          id?: string
          recording_id?: string
          timestamp_end?: number | null
          timestamp_start?: number | null
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "standup_topics_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "standup_recordings"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "task_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "task_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      task_proofs: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          label: string | null
          proof_type: string
          submitted_by: string
          task_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          label?: string | null
          proof_type: string
          submitted_by: string
          task_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          label?: string | null
          proof_type?: string
          submitted_by?: string
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_proofs_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "task_proofs_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "task_proofs_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_proofs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_by: string
          assigned_to: string | null
          blocked_reason: string | null
          category: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          due_date: string | null
          id: string
          legacy_checklist_item_id: string | null
          milestone_id: string | null
          position: number
          priority: Database["public"]["Enums"]["task_priority"]
          project_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_by: string
          assigned_to?: string | null
          blocked_reason?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          legacy_checklist_item_id?: string | null
          milestone_id?: string | null
          position?: number
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string
          assigned_to?: string | null
          blocked_reason?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          legacy_checklist_item_id?: string | null
          milestone_id?: string | null
          position?: number
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tasks_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tasks_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_legacy_checklist_item_id_fkey"
            columns: ["legacy_checklist_item_id"]
            isOneToOne: false
            referencedRelation: "project_checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "project_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_account_links: {
        Row: {
          linked_at: string
          private_chat_id: number
          telegram_user_id: number
          telegram_username: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          linked_at?: string
          private_chat_id: number
          telegram_user_id: number
          telegram_username?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          linked_at?: string
          private_chat_id?: number
          telegram_user_id?: number
          telegram_username?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "telegram_account_links_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "telegram_account_links_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "telegram_account_links_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_ticket_delivery_events: {
        Row: {
          attempts: number
          created_at: string
          event_type: string
          id: string
          last_error: string | null
          payload: Json
          sent_at: string | null
          status: string
          telegram_message_id: number | null
          ticket_id: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          event_type: string
          id?: string
          last_error?: string | null
          payload: Json
          sent_at?: string | null
          status?: string
          telegram_message_id?: number | null
          ticket_id: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          event_type?: string
          id?: string
          last_error?: string | null
          payload?: Json
          sent_at?: string | null
          status?: string
          telegram_message_id?: number | null
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "telegram_ticket_delivery_events_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          ticket_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          ticket_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          ticket_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ticket_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ticket_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          ticket_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ticket_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ticket_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_handlers: {
        Row: {
          assigned_by: string | null
          created_at: string
          id: string
          is_active: boolean
          team: Database["public"]["Enums"]["ticket_team"]
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          team: Database["public"]["Enums"]["ticket_team"]
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          team?: Database["public"]["Enums"]["ticket_team"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_handlers_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ticket_handlers_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ticket_handlers_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_handlers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ticket_handlers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ticket_handlers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_telegram_origins: {
        Row: {
          chat_id: number
          converted_by: string
          created_at: string
          source_message_id: number
          ticket_id: string
          topic_id: number
        }
        Insert: {
          chat_id: number
          converted_by: string
          created_at?: string
          source_message_id: number
          ticket_id: string
          topic_id: number
        }
        Update: {
          chat_id?: number
          converted_by?: string
          created_at?: string
          source_message_id?: number
          ticket_id?: string
          topic_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "ticket_telegram_origins_converted_by_fkey"
            columns: ["converted_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ticket_telegram_origins_converted_by_fkey"
            columns: ["converted_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ticket_telegram_origins_converted_by_fkey"
            columns: ["converted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_telegram_origins_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: true
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assigned_by: string | null
          assigned_to: string | null
          category: Database["public"]["Enums"]["ticket_category"]
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string
          expected_behavior: string | null
          feature_area:
            | Database["public"]["Enums"]["ticket_feature_area"]
            | null
          has_attachments: boolean
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          resolution_summary: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          steps_to_reproduce: string | null
          submitted_by: string
          team: Database["public"]["Enums"]["ticket_team"]
          title: string
          triaged_at: string | null
          triaged_by: string | null
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          assigned_to?: string | null
          category: Database["public"]["Enums"]["ticket_category"]
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description: string
          expected_behavior?: string | null
          feature_area?:
            | Database["public"]["Enums"]["ticket_feature_area"]
            | null
          has_attachments?: boolean
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolution_summary?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          steps_to_reproduce?: string | null
          submitted_by: string
          team: Database["public"]["Enums"]["ticket_team"]
          title: string
          triaged_at?: string | null
          triaged_by?: string | null
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["ticket_category"]
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string
          expected_behavior?: string | null
          feature_area?:
            | Database["public"]["Enums"]["ticket_feature_area"]
            | null
          has_attachments?: boolean
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolution_summary?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          steps_to_reproduce?: string | null
          submitted_by?: string
          team?: Database["public"]["Enums"]["ticket_team"]
          title?: string
          triaged_at?: string | null
          triaged_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tickets_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tickets_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tickets_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tickets_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_triaged_by_fkey"
            columns: ["triaged_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tickets_triaged_by_fkey"
            columns: ["triaged_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tickets_triaged_by_fkey"
            columns: ["triaged_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      uhp_access_grants: {
        Row: {
          created_at: string
          deleted_at: string | null
          granted_by: string | null
          id: string
          module: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          granted_by?: string | null
          id?: string
          module: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          granted_by?: string | null
          id?: string
          module?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "uhp_access_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "uhp_access_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "uhp_access_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      uhp_client_activities: {
        Row: {
          activity_type: string
          appointment_at: string | null
          appointment_type: string | null
          channel: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          direction: string | null
          follow_up_at: string | null
          id: string
          legacy_metadata: Json
          migration_review_required: boolean
          notes: string | null
          notion_page_id: string | null
          notion_url: string | null
          occurred_at: string
          prospect_outcome: string | null
          reply_received: boolean
          status: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activity_type?: string
          appointment_at?: string | null
          appointment_type?: string | null
          channel?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          direction?: string | null
          follow_up_at?: string | null
          id?: string
          legacy_metadata?: Json
          migration_review_required?: boolean
          notes?: string | null
          notion_page_id?: string | null
          notion_url?: string | null
          occurred_at?: string
          prospect_outcome?: string | null
          reply_received?: boolean
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activity_type?: string
          appointment_at?: string | null
          appointment_type?: string | null
          channel?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          direction?: string | null
          follow_up_at?: string | null
          id?: string
          legacy_metadata?: Json
          migration_review_required?: boolean
          notes?: string | null
          notion_page_id?: string | null
          notion_url?: string | null
          occurred_at?: string
          prospect_outcome?: string | null
          reply_received?: boolean
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uhp_client_activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "uhp_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uhp_client_activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "uhp_client_activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "uhp_client_activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uhp_client_activities_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "uhp_client_activities_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "uhp_client_activities_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      uhp_client_attachments: {
        Row: {
          activity_id: string | null
          client_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          file_name: string
          file_size: number
          id: string
          mime_type: string
          storage_path: string
          updated_at: string
        }
        Insert: {
          activity_id?: string | null
          client_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          file_name: string
          file_size: number
          id?: string
          mime_type: string
          storage_path: string
          updated_at?: string
        }
        Update: {
          activity_id?: string | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          file_name?: string
          file_size?: number
          id?: string
          mime_type?: string
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "uhp_client_attachments_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "uhp_client_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uhp_client_attachments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "uhp_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uhp_client_attachments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "uhp_client_attachments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "uhp_client_attachments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      uhp_client_notes: {
        Row: {
          attachment_urls: Json
          body: string | null
          client_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          legacy_metadata: Json
          notion_page_id: string | null
          notion_url: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attachment_urls?: Json
          body?: string | null
          client_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          legacy_metadata?: Json
          notion_page_id?: string | null
          notion_url?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attachment_urls?: Json
          body?: string | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          legacy_metadata?: Json
          notion_page_id?: string | null
          notion_url?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uhp_client_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "uhp_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uhp_client_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "uhp_client_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "uhp_client_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uhp_client_notes_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "uhp_client_notes_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "uhp_client_notes_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      uhp_clients: {
        Row: {
          alternate_phone: string | null
          attachment_urls: Json
          called: boolean
          called_at: string | null
          chatgpt_url: string | null
          client_type: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          due_date: string | null
          email: string | null
          id: string
          instagram_url: string | null
          interest_state: string
          job_title: string | null
          lead_owner: string | null
          legacy_metadata: Json
          migration_review_required: boolean
          name: string
          notion_page_id: string | null
          notion_url: string | null
          office_address: string | null
          phone: string | null
          replied: boolean
          replied_at: string | null
          source_created_date: string | null
          source_name: string | null
          source_url: string | null
          status: string
          updated_at: string
          updated_by: string | null
          we_call: boolean
          we_form: boolean
          website: string | null
        }
        Insert: {
          alternate_phone?: string | null
          attachment_urls?: Json
          called?: boolean
          called_at?: string | null
          chatgpt_url?: string | null
          client_type?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          due_date?: string | null
          email?: string | null
          id?: string
          instagram_url?: string | null
          interest_state?: string
          job_title?: string | null
          lead_owner?: string | null
          legacy_metadata?: Json
          migration_review_required?: boolean
          name: string
          notion_page_id?: string | null
          notion_url?: string | null
          office_address?: string | null
          phone?: string | null
          replied?: boolean
          replied_at?: string | null
          source_created_date?: string | null
          source_name?: string | null
          source_url?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          we_call?: boolean
          we_form?: boolean
          website?: string | null
        }
        Update: {
          alternate_phone?: string | null
          attachment_urls?: Json
          called?: boolean
          called_at?: string | null
          chatgpt_url?: string | null
          client_type?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          due_date?: string | null
          email?: string | null
          id?: string
          instagram_url?: string | null
          interest_state?: string
          job_title?: string | null
          lead_owner?: string | null
          legacy_metadata?: Json
          migration_review_required?: boolean
          name?: string
          notion_page_id?: string | null
          notion_url?: string | null
          office_address?: string | null
          phone?: string | null
          replied?: boolean
          replied_at?: string | null
          source_created_date?: string | null
          source_name?: string | null
          source_url?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          we_call?: boolean
          we_form?: boolean
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uhp_clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "uhp_clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "uhp_clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uhp_clients_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "uhp_clients_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "uhp_clients_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      uhp_outreach_digest_runs: {
        Row: {
          created_at: string
          destination_key: string
          error_message: string | null
          id: string
          idempotency_key: string
          interval_ended_at: string
          interval_started_at: string
          n8n_execution_id: string | null
          sent_at: string | null
          status: string
          summary_json: Json
          telegram_message_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          destination_key: string
          error_message?: string | null
          id?: string
          idempotency_key: string
          interval_ended_at: string
          interval_started_at: string
          n8n_execution_id?: string | null
          sent_at?: string | null
          status?: string
          summary_json?: Json
          telegram_message_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          destination_key?: string
          error_message?: string | null
          id?: string
          idempotency_key?: string
          interval_ended_at?: string
          interval_started_at?: string
          n8n_execution_id?: string | null
          sent_at?: string | null
          status?: string
          summary_json?: Json
          telegram_message_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      uhp_reminder_runs: {
        Row: {
          created_at: string
          deadline_date: string | null
          destination_key: string
          error_message: string | null
          id: string
          idempotency_key: string
          metadata: Json
          n8n_execution_id: string | null
          reminder_type: string
          scheduled_for: string
          sent_at: string | null
          status: string
          telegram_message_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deadline_date?: string | null
          destination_key: string
          error_message?: string | null
          id?: string
          idempotency_key: string
          metadata?: Json
          n8n_execution_id?: string | null
          reminder_type: string
          scheduled_for: string
          sent_at?: string | null
          status?: string
          telegram_message_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deadline_date?: string | null
          destination_key?: string
          error_message?: string | null
          id?: string
          idempotency_key?: string
          metadata?: Json
          n8n_execution_id?: string | null
          reminder_type?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          telegram_message_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      uhp_vp_digest_runs: {
        Row: {
          created_at: string
          destination_key: string
          error_message: string | null
          id: string
          idempotency_key: string
          interval_ended_at: string
          interval_started_at: string
          n8n_execution_id: string | null
          reporting_month: string
          sent_at: string | null
          status: string
          summary_json: Json
          telegram_message_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          destination_key: string
          error_message?: string | null
          id?: string
          idempotency_key: string
          interval_ended_at: string
          interval_started_at: string
          n8n_execution_id?: string | null
          reporting_month: string
          sent_at?: string | null
          status?: string
          summary_json?: Json
          telegram_message_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          destination_key?: string
          error_message?: string | null
          id?: string
          idempotency_key?: string
          interval_ended_at?: string
          interval_started_at?: string
          n8n_execution_id?: string | null
          reporting_month?: string
          sent_at?: string | null
          status?: string
          summary_json?: Json
          telegram_message_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      uhp_vp_entries: {
        Row: {
          amount: number | null
          category: string
          created_at: string
          created_by: string | null
          currency: string | null
          deleted_at: string | null
          discount_percent: number | null
          handler_name: string | null
          id: string
          legacy_metadata: Json
          member_id: string | null
          member_level: string | null
          member_name: string
          order_date: string
          order_id: string | null
          original_amount_text: string | null
          payment_status: string | null
          reporting_month: string
          source_row: number | null
          source_sheet: string | null
          updated_at: string
          updated_by: string | null
          volume_points: number
        }
        Insert: {
          amount?: number | null
          category: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          deleted_at?: string | null
          discount_percent?: number | null
          handler_name?: string | null
          id?: string
          legacy_metadata?: Json
          member_id?: string | null
          member_level?: string | null
          member_name: string
          order_date: string
          order_id?: string | null
          original_amount_text?: string | null
          payment_status?: string | null
          reporting_month: string
          source_row?: number | null
          source_sheet?: string | null
          updated_at?: string
          updated_by?: string | null
          volume_points: number
        }
        Update: {
          amount?: number | null
          category?: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          deleted_at?: string | null
          discount_percent?: number | null
          handler_name?: string | null
          id?: string
          legacy_metadata?: Json
          member_id?: string | null
          member_level?: string | null
          member_name?: string
          order_date?: string
          order_id?: string | null
          original_amount_text?: string | null
          payment_status?: string | null
          reporting_month?: string
          source_row?: number | null
          source_sheet?: string | null
          updated_at?: string
          updated_by?: string | null
          volume_points?: number
        }
        Relationships: [
          {
            foreignKeyName: "uhp_vp_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "uhp_vp_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "uhp_vp_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uhp_vp_entries_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "uhp_vp_entries_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "uhp_vp_entries_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      uhp_vp_month_targets: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          forecast_vp: number
          id: string
          reporting_month: string
          target_vp: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          forecast_vp?: number
          id?: string
          reporting_month: string
          target_vp?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          forecast_vp?: number
          id?: string
          reporting_month?: string
          target_vp?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uhp_vp_month_targets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "uhp_vp_month_targets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "uhp_vp_month_targets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uhp_vp_month_targets_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "uhp_vp_month_targets_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "uhp_vp_month_targets_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          source_metadata: Json
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          source_metadata?: Json
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          source_metadata?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badge_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_domain_mastery: {
        Row: {
          department: string
          mastery_level: number
          mastery_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          department: string
          mastery_level?: number
          mastery_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          department?: string
          mastery_level?: number
          mastery_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_domain_mastery_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_domain_mastery_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_domain_mastery_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_gamification: {
        Row: {
          current_streak: number
          current_tier: string
          last_activity_at: string | null
          longest_streak: number
          points_total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          current_tier?: string
          last_activity_at?: string | null
          longest_streak?: number
          points_total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          current_tier?: string
          last_activity_at?: string | null
          longest_streak?: number
          points_total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_gamification_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_gamification_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_gamification_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_role_metadata: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          role_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          role_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          role_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_role_metadata_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_role_metadata_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_role_metadata_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          access_expires_at: string | null
          account_kind: Database["public"]["Enums"]["account_kind"]
          account_purpose: string | null
          avatar_url: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          department_id: string | null
          division_id: string | null
          id: string
          manager_id: string | null
          role: Database["public"]["Enums"]["user_role"]
          sponsor_user_id: string | null
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
        }
        Insert: {
          access_expires_at?: string | null
          account_kind?: Database["public"]["Enums"]["account_kind"]
          account_purpose?: string | null
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          department_id?: string | null
          division_id?: string | null
          id: string
          manager_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          sponsor_user_id?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Update: {
          access_expires_at?: string | null
          account_kind?: Database["public"]["Enums"]["account_kind"]
          account_purpose?: string | null
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          department_id?: string | null
          division_id?: string | null
          id?: string
          manager_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          sponsor_user_id?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "users_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "users_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_sponsor_user_id_fkey"
            columns: ["sponsor_user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "users_sponsor_user_id_fkey"
            columns: ["sponsor_user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "users_sponsor_user_id_fkey"
            columns: ["sponsor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      website_content: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          key: string
          metadata: Json | null
          section: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          key: string
          metadata?: Json | null
          section: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          key?: string
          metadata?: Json | null
          section?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      weekly_commitment_items: {
        Row: {
          commitment_id: string
          created_at: string
          id: string
          milestone_id: string
          slot_order: number
        }
        Insert: {
          commitment_id: string
          created_at?: string
          id?: string
          milestone_id: string
          slot_order: number
        }
        Update: {
          commitment_id?: string
          created_at?: string
          id?: string
          milestone_id?: string
          slot_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "weekly_commitment_items_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "weekly_commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_commitment_items_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "project_milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_commitments: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          iso_week: number
          iso_year: number
          locked_at: string | null
          project_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          iso_week: number
          iso_year: number
          locked_at?: string | null
          project_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          iso_week?: number
          iso_year?: number
          locked_at?: string | null
          project_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_commitments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      wellness_bingo_boards: {
        Row: {
          created_at: string
          created_by: string | null
          cumulative_completed_squares: number
          cumulative_horizontal_bingos: number
          cumulative_vertical_bingos: number
          current_week_index: number
          custom_habit_text: string | null
          cycle_id: string
          deleted_at: string | null
          id: string
          tile_state: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          cumulative_completed_squares?: number
          cumulative_horizontal_bingos?: number
          cumulative_vertical_bingos?: number
          current_week_index?: number
          custom_habit_text?: string | null
          cycle_id: string
          deleted_at?: string | null
          id?: string
          tile_state?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          cumulative_completed_squares?: number
          cumulative_horizontal_bingos?: number
          cumulative_vertical_bingos?: number
          current_week_index?: number
          custom_habit_text?: string | null
          cycle_id?: string
          deleted_at?: string | null
          id?: string
          tile_state?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wellness_bingo_boards_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "wellness_bingo_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wellness_bingo_boards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "wellness_bingo_boards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "wellness_bingo_boards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      wellness_bingo_cycles: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          end_date: string
          id: string
          is_active: boolean
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          end_date: string
          id?: string
          is_active?: boolean
          start_date: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          end_date?: string
          id?: string
          is_active?: boolean
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      wellness_bingo_partnerships: {
        Row: {
          created_at: string
          created_by: string | null
          cycle_id: string
          deleted_at: string | null
          id: string
          updated_at: string
          user_a_id: string
          user_b_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          cycle_id: string
          deleted_at?: string | null
          id?: string
          updated_at?: string
          user_a_id: string
          user_b_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          cycle_id?: string
          deleted_at?: string | null
          id?: string
          updated_at?: string
          user_a_id?: string
          user_b_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wellness_bingo_partnerships_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "wellness_bingo_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wellness_bingo_partnerships_user_a_id_fkey"
            columns: ["user_a_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "wellness_bingo_partnerships_user_a_id_fkey"
            columns: ["user_a_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "wellness_bingo_partnerships_user_a_id_fkey"
            columns: ["user_a_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wellness_bingo_partnerships_user_b_id_fkey"
            columns: ["user_b_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "wellness_bingo_partnerships_user_b_id_fkey"
            columns: ["user_b_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "wellness_bingo_partnerships_user_b_id_fkey"
            columns: ["user_b_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      wellness_bingo_weekly_recordings: {
        Row: {
          created_at: string
          created_by: string | null
          cycle_id: string
          deleted_at: string | null
          id: string
          partnership_id: string
          recording_url: string
          updated_at: string
          updated_by: string | null
          week_end_date: string
          week_index: number
          week_start_date: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          cycle_id: string
          deleted_at?: string | null
          id?: string
          partnership_id: string
          recording_url: string
          updated_at?: string
          updated_by?: string | null
          week_end_date: string
          week_index: number
          week_start_date: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          cycle_id?: string
          deleted_at?: string | null
          id?: string
          partnership_id?: string
          recording_url?: string
          updated_at?: string
          updated_by?: string | null
          week_end_date?: string
          week_index?: number
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "wellness_bingo_weekly_recordings_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "wellness_bingo_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wellness_bingo_weekly_recordings_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "wellness_bingo_partnerships"
            referencedColumns: ["id"]
          },
        ]
      }
      wise_batch_import_rows: {
        Row: {
          batch_id: string
          detail: string | null
          id: string
          imported_at: string
          imported_by: string
          payment_reference: string | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          result: string
          transfer_status: string
          wise_transfer_id: string | null
        }
        Insert: {
          batch_id: string
          detail?: string | null
          id?: string
          imported_at?: string
          imported_by: string
          payment_reference?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          result: string
          transfer_status: string
          wise_transfer_id?: string | null
        }
        Update: {
          batch_id?: string
          detail?: string | null
          id?: string
          imported_at?: string
          imported_by?: string
          payment_reference?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          result?: string
          transfer_status?: string
          wise_transfer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wise_batch_import_rows_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "wise_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wise_batch_import_rows_imported_by_fkey"
            columns: ["imported_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "wise_batch_import_rows_imported_by_fkey"
            columns: ["imported_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "wise_batch_import_rows_imported_by_fkey"
            columns: ["imported_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wise_batch_import_rows_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "wise_batch_import_rows_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "wise_batch_import_rows_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      wise_batch_items: {
        Row: {
          amount: number
          batch_id: string
          completed_at: string | null
          id: string
          invoice_id: string
          payment_reference: string
          recipient_id: string
          source_currency: string
          status: string
          target_currency: string
          wise_transfer_id: string | null
        }
        Insert: {
          amount: number
          batch_id: string
          completed_at?: string | null
          id?: string
          invoice_id: string
          payment_reference: string
          recipient_id: string
          source_currency: string
          status?: string
          target_currency: string
          wise_transfer_id?: string | null
        }
        Update: {
          amount?: number
          batch_id?: string
          completed_at?: string | null
          id?: string
          invoice_id?: string
          payment_reference?: string
          recipient_id?: string
          source_currency?: string
          status?: string
          target_currency?: string
          wise_transfer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wise_batch_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "wise_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wise_batch_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: true
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      wise_batches: {
        Row: {
          created_at: string
          created_by: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wise_batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "wise_batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "wise_batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      wise_payments: {
        Row: {
          completed_at: string | null
          created_at: string
          employee_id: string
          error_message: string | null
          exchange_rate: number | null
          fee: number | null
          id: string
          idempotency_key: string
          initiated_by: string
          invoice_id: string
          payment_status: Database["public"]["Enums"]["payment_status"]
          source_amount: number
          source_currency: string
          target_amount: number | null
          target_currency: string
          updated_at: string
          wise_quote_id: string | null
          wise_recipient_id: string
          wise_transfer_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          employee_id: string
          error_message?: string | null
          exchange_rate?: number | null
          fee?: number | null
          id?: string
          idempotency_key: string
          initiated_by: string
          invoice_id: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          source_amount: number
          source_currency?: string
          target_amount?: number | null
          target_currency?: string
          updated_at?: string
          wise_quote_id?: string | null
          wise_recipient_id: string
          wise_transfer_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          employee_id?: string
          error_message?: string | null
          exchange_rate?: number | null
          fee?: number | null
          id?: string
          idempotency_key?: string
          initiated_by?: string
          invoice_id?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          source_amount?: number
          source_currency?: string
          target_amount?: number | null
          target_currency?: string
          updated_at?: string
          wise_quote_id?: string | null
          wise_recipient_id?: string
          wise_transfer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wise_payments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "wise_payments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wise_payments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "wise_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      employee_directory: {
        Row: {
          account_kind: Database["public"]["Enums"]["account_kind"] | null
          address: string | null
          avatar_url: string | null
          birthday: string | null
          city: string | null
          completed_hours: number | null
          contact_number: string | null
          date_terminated: string | null
          department_id: string | null
          department_name: string | null
          division_id: string | null
          division_name: string | null
          education: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_number: string | null
          emergency_contact_relationship: string | null
          employee_id: string | null
          employment_type: Database["public"]["Enums"]["employment_type"] | null
          first_name: string | null
          full_name: string | null
          internship_id: string | null
          internship_status:
            | Database["public"]["Enums"]["internship_status"]
            | null
          last_name: string | null
          linkedin_profile_url: string | null
          middle_name: string | null
          nationality: string | null
          payment_account_name: string | null
          payment_account_number: string | null
          payment_address: string | null
          payment_city: string | null
          payment_email: string | null
          payment_phone_number: string | null
          payment_province: string | null
          payment_zipcode: string | null
          pending_changes_count: number | null
          personal_email: string | null
          position: string | null
          postal_code: string | null
          program: string | null
          province: string | null
          required_hours: number | null
          role: Database["public"]["Enums"]["user_role"] | null
          school: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["user_status"] | null
          user_created_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
      finance_subscription_last_charges: {
        Row: {
          last_charged: string | null
          subscription_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_subscription_fk"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "finance_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      individual_performance_summary: {
        Row: {
          avg_kpi_progress: number | null
          avg_okr_progress: number | null
          completed_kpis: number | null
          completed_okrs: number | null
          department_name: string | null
          employee_id: string | null
          full_name: string | null
          latest_review_date: string | null
          latest_review_rating: number | null
          position: string | null
          total_kpis: number | null
          total_okrs: number | null
          total_reviews: number | null
          user_id: string | null
        }
        Relationships: []
      }
      marketing_monthly_platform_totals: {
        Row: {
          campaign_month: string | null
          platform_id: string | null
          platform_name: string | null
          total_spend: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_entries_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "marketing_platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_platform_totals: {
        Row: {
          platform_id: string | null
          platform_name: string | null
          total_spend: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_entries_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "marketing_platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      root_reports: {
        Row: {
          child_count: number | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          employee_id: string | null
          hierarchy_path: string[] | null
          id: string | null
          notes: string | null
          parent_report_id: string | null
          period_end: string | null
          period_start: string | null
          report_group: string | null
          report_type: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          submitted_at: string | null
          updated_at: string | null
        }
        Insert: {
          child_count?: never
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          employee_id?: string | null
          hierarchy_path?: string[] | null
          id?: string | null
          notes?: string | null
          parent_report_id?: string | null
          period_end?: string | null
          period_start?: string | null
          report_group?: string | null
          report_type?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submitted_at?: string | null
          updated_at?: string | null
        }
        Update: {
          child_count?: never
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          employee_id?: string | null
          hierarchy_path?: string[] | null
          id?: string | null
          notes?: string | null
          parent_report_id?: string | null
          period_end?: string | null
          period_start?: string | null
          report_group?: string | null
          report_type?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submitted_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "reports_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "reports_parent_report_id_fkey"
            columns: ["parent_report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_parent_report_id_fkey"
            columns: ["parent_report_id"]
            isOneToOne: false
            referencedRelation: "root_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "individual_performance_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      binary_quantize:
        | {
            Args: {
              "": string
            }
            Returns: unknown
          }
        | {
            Args: {
              "": unknown
            }
            Returns: unknown
          }
      calculate_milestone_progress: {
        Args: {
          p_milestone_id: string
        }
        Returns: number
      }
      calculate_okr_progress: {
        Args: {
          p_okr_id: string
        }
        Returns: number
      }
      calculate_okr_progress_from_targets: {
        Args: {
          p_okr_id: string
        }
        Returns: number
      }
      calculate_overall_okr_score: {
        Args: {
          p_employee_id: string
          p_cycle_id?: string
        }
        Returns: number
      }
      calculate_project_health: {
        Args: {
          p_project_id: string
        }
        Returns: Database["public"]["Enums"]["project_health"]
      }
      calculate_project_progress: {
        Args: {
          p_project_id: string
        }
        Returns: number
      }
      calculate_tenure_days: {
        Args: {
          employee_id: string
        }
        Returns: number
      }
      check_and_award_badges: {
        Args: {
          p_user_id: string
        }
        Returns: undefined
      }
      claim_inquiry_deduplication_key: {
        Args: {
          p_fingerprint: string
          p_ttl_seconds?: number
        }
        Returns: boolean
      }
      compute_mastery_level: {
        Args: {
          p_points: number
        }
        Returns: number
      }
      compute_tier: {
        Args: {
          p_points: number
        }
        Returns: string
      }
      confirm_finance_wise_transfer: {
        Args: {
          item_id: string
          transfer_id: string
        }
        Returns: boolean
      }
      consume_inquiry_rate_limit: {
        Args: {
          p_scope: string
          p_identifier_hash: string
          p_capacity: number
          p_window_seconds: number
        }
        Returns: {
          allowed: boolean
          retry_after_seconds: number
        }[]
      }
      create_finance_report_snapshot: {
        Args: {
          target_month: string
          actor_id: string
          payload: Json
          make_final: boolean
        }
        Returns: string
      }
      create_finance_wise_batch: {
        Args: {
          invoice_ids: string[]
          actor_id: string
        }
        Returns: string
      }
      create_job_posting_with_requisition: {
        Args: {
          p_title: string
          p_business_unit_id: string
          p_department: string
          p_location: string
          p_total_headcount: number
          p_employment_type: string
          p_description: string
          p_requirements: string
          p_benefits: string
          p_salary_range: string
          p_is_active: boolean
          p_closes_at: string
        }
        Returns: Json
      }
      create_ticket_from_telegram: {
        Args: {
          p_submitted_by: string
          p_converted_by: string
          p_title: string
          p_description: string
          p_category: string
          p_chat_id: number
          p_topic_id: number
          p_source_message_id: number
        }
        Returns: {
          ticket_id: string
          created: boolean
        }[]
      }
      current_user_has_active_review_engagement: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      decide_finance_expense: {
        Args: {
          entry_id: string
          actor_id: string
          outcome: string
        }
        Returns: boolean
      }
      decide_finance_variance: {
        Args: {
          expense_id: string
          actor_id: string
          outcome: string
          decision_note: string
        }
        Returns: boolean
      }
      finance_overview: {
        Args: {
          target_month: string
        }
        Returns: Json
      }
      finance_spend_trend: {
        Args: {
          anchor_month: string
          granularity: string
        }
        Returns: {
          bucket_start: string
          bucket_end: string
          spend_aud: number
          converted_count: number
          unconverted_count: number
        }[]
      }
      get_christmas_tree_decoration_state: {
        Args: {
          p_event_id: string
        }
        Returns: {
          active_participant_count: number
          october_complete_count: number
          november_complete_count: number
          december_complete_count: number
          garland_unlocked: boolean
          lights_unlocked: boolean
          star_unlocked: boolean
        }[]
      }
      get_direct_reports: {
        Args: {
          manager_user_id: string
        }
        Returns: {
          employee_id: string
          user_id: string
          employee_number: string
          full_name: string
          position: string
          department: string
        }[]
      }
      get_employee_by_user_id: {
        Args: {
          user_id: string
        }
        Returns: string
      }
      get_employees_by_department: {
        Args: {
          dept_name: string
        }
        Returns: {
          employee_id: string
          employee_number: string
          full_name: string
          position: string
          employment_type: Database["public"]["Enums"]["employment_type"]
          date_hired: string
        }[]
      }
      get_intern_eod_digest_source: {
        Args: {
          target_date?: string
        }
        Returns: {
          report_date: string
          department: string
          internship_id: string
          intern_employee_id: string
          intern_user_id: string
          intern_name: string
          intern_email: string
          supervisor_user_id: string
          supervisor_name: string
          supervisor_email: string
          daily_log_id: string
          log_date: string
          log_status: string
          is_approved: boolean
          hours_worked: number
          tasks_completed_summary: string
          project_entries: Json
          blockers: Json
          next_steps: Json
          attachments: Json
          attachment_count: number
          has_attachments: boolean
          admin_detail_path: string
        }[]
      }
      get_intern_weekly_projects_digest: {
        Args: {
          week_start?: string
        }
        Returns: {
          week_start_date: string
          department: string
          internship_id: string
          intern_employee_id: string
          intern_user_id: string
          intern_name: string
          intern_email: string
          total_projects: number
          projects: Json
        }[]
      }
      get_knowledge_source_versions: {
        Args: {
          p_source_id: string
        }
        Returns: {
          id: string
          version_number: number
          title: string
          content: string
          changed_by: string
          changed_by_name: string
          change_summary: string
          metadata: Json
          created_at: string
        }[]
      }
      get_report_children: {
        Args: {
          parent_id: string
        }
        Returns: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          employee_id: string
          hierarchy_path: string[] | null
          id: string
          notes: string | null
          parent_report_id: string | null
          period_end: string
          period_start: string
          report_group: string | null
          report_type: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string | null
          updated_at: string
        }[]
      }
      get_report_tree: {
        Args: {
          root_id: string
        }
        Returns: {
          id: string
          parent_report_id: string
          report_type: string
          report_group: string
          hierarchy_path: string[]
          status: string
          period_start: string
          period_end: string
          notes: string
          depth: number
        }[]
      }
      get_resource_category_tree: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          slug: string
          description: string
          icon: string
          parent_id: string
          display_order: number
          is_active: boolean
          depth: number
          resource_count: number
        }[]
      }
      get_user_role: {
        Args: {
          user_id: string
        }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      halfvec_avg: {
        Args: {
          "": number[]
        }
        Returns: unknown
      }
      halfvec_out: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      halfvec_send: {
        Args: {
          "": unknown
        }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: {
          "": unknown[]
        }
        Returns: number
      }
      hire_job_application_transaction: {
        Args: {
          application_uuid: string
        }
        Returns: Json
      }
      hnsw_bit_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      hnswhandler: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      increment_cache_hit_count: {
        Args: {
          cache_id: string
        }
        Returns: undefined
      }
      increment_resource_download_count: {
        Args: {
          resource_uuid: string
        }
        Returns: undefined
      }
      intern_log_text_to_jsonb_array: {
        Args: {
          p_value: string
        }
        Returns: Json
      }
      invoice_employee_is_owner: {
        Args: {
          p_employee_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      is_manager_of: {
        Args: {
          manager_id: string
          employee_user_id: string
        }
        Returns: boolean
      }
      is_on_probation: {
        Args: {
          employee_id: string
        }
        Returns: boolean
      }
      is_performance_cycle_workforce_eligible: {
        Args: {
          target_user_id: string
          target_cycle_id: string
        }
        Returns: boolean
      }
      is_quarter_workforce_eligible: {
        Args: {
          target_user_id: string
          period_start: string
          period_end: string
        }
        Returns: boolean
      }
      is_workforce_account: {
        Args: {
          target_user_id: string
        }
        Returns: boolean
      }
      ivfflat_bit_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      ivfflathandler: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      l2_norm:
        | {
            Args: {
              "": unknown
            }
            Returns: number
          }
        | {
            Args: {
              "": unknown
            }
            Returns: number
          }
      l2_normalize:
        | {
            Args: {
              "": string
            }
            Returns: string
          }
        | {
            Args: {
              "": unknown
            }
            Returns: unknown
          }
        | {
            Args: {
              "": unknown
            }
            Returns: unknown
          }
      match_knowledge_embeddings:
        | {
            Args: {
              query_embedding: string
              match_threshold?: number
              match_count?: number
            }
            Returns: {
              id: string
              source_id: string
              chunk_index: number
              chunk_text: string
              metadata: Json
              similarity: number
            }[]
          }
        | {
            Args: {
              query_embedding: string
              match_threshold?: number
              match_count?: number
              allowed_access_levels?: string[]
            }
            Returns: {
              id: string
              source_id: string
              chunk_index: number
              chunk_text: string
              metadata: Json
              similarity: number
              source_title: string
            }[]
          }
      match_query_cache: {
        Args: {
          query_embedding: string
          similarity_threshold?: number
          max_results?: number
        }
        Returns: {
          id: string
          query_text: string
          response_text: string
          source_citations: Json
          similarity: number
        }[]
      }
      normalize_intern_log_project_entries: {
        Args: {
          p_entries: Json
          p_fallback_tasks_completed: string
        }
        Returns: Json
      }
      purge_directory_user: {
        Args: {
          p_user_id: string
        }
        Returns: undefined
      }
      quarter_workforce_eligible_user_ids: {
        Args: {
          target_cycle_id: string
        }
        Returns: {
          user_id: string
        }[]
      }
      recompute_user_domain_mastery: {
        Args: {
          p_user_id: string
        }
        Returns: undefined
      }
      recompute_user_gamification: {
        Args: {
          p_user_id: string
        }
        Returns: undefined
      }
      recompute_user_streak: {
        Args: {
          p_user_id: string
        }
        Returns: number
      }
      reconcile_finance_expense: {
        Args: {
          request_id: string
          payment_id: string
          actor_id: string
          reason: string
        }
        Returns: Json
      }
      record_hub_activity: {
        Args: {
          p_session_id: string
        }
        Returns: undefined
      }
      refresh_task_work_rollups: {
        Args: {
          p_project_id: string
          p_milestone_id?: string
        }
        Returns: undefined
      }
      release_inquiry_deduplication_key: {
        Args: {
          p_fingerprint: string
        }
        Returns: undefined
      }
      resources_search_vector: {
        Args: {
          title: string
          description: string
          tags: string[]
        }
        Returns: unknown
      }
      restore_knowledge_source_version: {
        Args: {
          p_source_id: string
          p_version_number: number
        }
        Returns: {
          access_level: string | null
          content: string | null
          created_at: string
          created_by: string | null
          current_version: number | null
          deleted_at: string | null
          description: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: string
          is_active: boolean
          metadata: Json | null
          mime_type: string | null
          processing_status: string | null
          source_type: Database["public"]["Enums"]["knowledge_source_type"]
          tags: string[] | null
          title: string
          updated_at: string
          url: string | null
        }
      }
      soft_delete: {
        Args: {
          table_name: string
          record_id: string
        }
        Returns: boolean
      }
      sparsevec_out: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      sparsevec_send: {
        Args: {
          "": unknown
        }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: {
          "": unknown[]
        }
        Returns: number
      }
      update_finance_maintenance_status: {
        Args: {
          job_id: string
          actor_id: string
          expected_status: string
          next_status: string
        }
        Returns: boolean
      }
      user_can_access_project: {
        Args: {
          p_project_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      user_can_manage_pa_task_lookups: {
        Args: {
          target_user_id: string
        }
        Returns: boolean
      }
      user_has_ai_spending_access: {
        Args: {
          target_user_id: string
        }
        Returns: boolean
      }
      user_has_any_role:
        | {
            Args: {
              user_id: string
              required_roles: Database["public"]["Enums"]["user_role"][]
            }
            Returns: boolean
          }
        | {
            Args: {
              user_id: string
              required_roles: string[]
            }
            Returns: boolean
          }
      user_has_ats_access: {
        Args: {
          target_user_id: string
        }
        Returns: boolean
      }
      user_has_crm_tracker_access: {
        Args: {
          target_user_id: string
          target_tracker: string
        }
        Returns: boolean
      }
      user_has_pa_task_access: {
        Args: {
          target_user_id: string
        }
        Returns: boolean
      }
      user_has_revenue_forecast_access: {
        Args: {
          target_user_id: string
        }
        Returns: boolean
      }
      user_has_role: {
        Args: {
          user_id: string
          required_role: Database["public"]["Enums"]["user_role"]
        }
        Returns: boolean
      }
      user_has_uhp_module_access: {
        Args: {
          target_user_id: string
          target_module: string
        }
        Returns: boolean
      }
      user_is_accounting_member: {
        Args: {
          target_user_id: string
        }
        Returns: boolean
      }
      user_is_admin: {
        Args: {
          user_id: string
        }
        Returns: boolean
      }
      user_is_marketing_member: {
        Args: {
          target_user_id: string
        }
        Returns: boolean
      }
      vector_avg: {
        Args: {
          "": number[]
        }
        Returns: string
      }
      vector_dims:
        | {
            Args: {
              "": string
            }
            Returns: number
          }
        | {
            Args: {
              "": unknown
            }
            Returns: number
          }
      vector_norm: {
        Args: {
          "": string
        }
        Returns: number
      }
      vector_out: {
        Args: {
          "": string
        }
        Returns: unknown
      }
      vector_send: {
        Args: {
          "": string
        }
        Returns: string
      }
      vector_typmod_in: {
        Args: {
          "": unknown[]
        }
        Returns: number
      }
      void_finance_rent_payment: {
        Args: {
          payment_id: string
          actor_id: string
          correction_reason: string
        }
        Returns: boolean
      }
    }
    Enums: {
      account_kind: "workforce" | "reviewer" | "test" | "service" | "privileged"
      ai_spend_type: "api" | "subscription"
      announcement_category:
        | "hr_updates"
        | "benefits"
        | "events"
        | "performance"
        | "training"
        | "policy"
        | "general"
        | "emergency"
      announcement_priority: "low" | "normal" | "high" | "urgent"
      announcement_status:
        | "draft"
        | "scheduled"
        | "published"
        | "expired"
        | "archived"
      checklist_item_status: "todo" | "done"
      checklist_template_flow: "onboarding" | "offboarding"
      checklist_template_scope: "employee" | "associate" | "default"
      christmas_ornament_asset:
        | "red"
        | "gold"
        | "silver"
        | "green"
        | "blue"
        | "pearl"
        | "burgundy"
        | "champagne"
      christmas_wish_category: "personal" | "for_others" | "for_sn"
      document_type:
        | "contract"
        | "id"
        | "certificate"
        | "performance_review"
        | "resume"
        | "medical_record"
        | "tax_document"
        | "nda"
        | "handbook_acknowledgment"
        | "other"
      employment_type:
        | "regular"
        | "probationary"
        | "associate"
        | "project_based"
      event_category:
        | "holiday"
        | "meeting"
        | "deadline"
        | "company"
        | "team"
        | "training"
      exit_type:
        | "resignation"
        | "termination"
        | "end_of_contract"
        | "retirement"
      expense_match_status:
        | "unmatched"
        | "matched"
        | "variance_flagged"
        | "resolved"
      expense_source_type: "staff_request" | "direct_payment"
      expense_type:
        | "office_supplies"
        | "travel"
        | "meals"
        | "software"
        | "equipment"
        | "utilities"
        | "maintenance"
        | "other"
      internship_status: "active" | "completed" | "terminated" | "converted"
      invoice_status: "draft" | "submitted" | "approved" | "paid" | "rejected"
      knowledge_source_type: "pdf" | "docx" | "url" | "manual" | "txt"
      milestone_complexity_tier: "routine" | "standard" | "complex" | "epic"
      milestone_period_type: "month" | "week"
      milestone_status:
        | "not_started"
        | "in_progress"
        | "submitted"
        | "approved"
        | "overdue"
        | "completed"
      notification_type:
        | "task_assigned"
        | "task_due"
        | "report_submitted"
        | "report_approved"
        | "report_rejected"
        | "invoice_submitted"
        | "invoice_approved"
        | "invoice_rejected"
        | "intern_log_submitted"
        | "intern_log_approved"
        | "onboarding_approved"
        | "onboarding_rejected"
        | "announcement_new"
        | "resource_new"
        | "reminder"
        | "onboarding_step"
        | "probation_update"
        | "system"
        | "project_claimable"
        | "project_assigned"
        | "resource_submitted"
        | "resource_approved"
        | "resource_rejected"
        | "resource_deletion_requested"
      offboarding_status: "initiated" | "in_progress" | "completed"
      onboarding_document_type:
        | "valid_id"
        | "profile_photo"
        | "cv"
        | "birth_certificate"
      onboarding_status: "not_started" | "in_progress" | "completed"
      onboarding_step: "personal_info" | "payment_info" | "documents" | "review"
      payment_method: "wise" | "bank_transfer" | "check" | "other"
      payment_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "cancelled"
      profile_change_status: "pending" | "approved" | "rejected"
      project_contributor_role: "lead" | "contributor"
      project_health: "on_track" | "at_risk" | "overdue" | "blocked"
      project_status:
        | "planning"
        | "active"
        | "on_hold"
        | "completed"
        | "archived"
      resource_access_level: "full" | "view_only"
      resource_category:
        | "onboarding"
        | "training"
        | "policies"
        | "benefits"
        | "tools"
        | "culture"
        | "department_specific"
        | "forms_templates"
        | "performance"
        | "emergency"
      resource_status: "draft" | "published" | "archived"
      resource_type:
        | "video"
        | "document"
        | "image"
        | "link"
        | "presentation"
        | "interactive"
      review_cycle_status: "draft" | "active" | "completed" | "archived"
      review_status: "pending" | "self_review" | "manager_review" | "completed"
      target_metric_type: "number" | "boolean" | "currency" | "tasks" | "scale"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status:
        | "pending"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "blocked"
      ticket_category:
        | "payroll_benefits"
        | "leave_attendance"
        | "employee_records"
        | "onboarding_offboarding"
        | "policy_clarification"
        | "workplace_support"
        | "other_hr"
        | "access_permissions"
        | "bug_report"
        | "performance_issue"
        | "data_issue"
        | "integration_notifications"
        | "hardware_software"
        | "feature_request"
        | "other_it"
      ticket_feature_area:
        | "authentication"
        | "dashboard"
        | "profile"
        | "tasks"
        | "reports"
        | "tickets"
        | "documents"
        | "announcements"
        | "resources"
        | "performance"
        | "payroll"
        | "onboarding"
        | "employee_management"
        | "recruitment"
        | "ai_knowledge"
        | "company_pulse"
        | "mobile_app"
        | "hardware_software"
        | "other"
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_status:
        | "new"
        | "triaged"
        | "assigned"
        | "in_progress"
        | "waiting_on_user"
        | "resolved"
        | "closed"
      ticket_team: "hr" | "it"
      user_role: "employee" | "associate" | "admin" | "super_admin" | "reviewer"
      user_status:
        | "active"
        | "on_leave"
        | "terminated"
        | "pending_onboarding"
        | "awaiting_approval"
        | "inactive"
      work_arrangement: "part_time" | "full_time"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
